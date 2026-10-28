interface Env {
  YOUTUBE_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    return Response.json(
      { error: "Enter a song or artist to search for." },
      { status: 400 }
    );
  }

  if (query.length > 200) {
    return Response.json(
      { error: "Search query is too long." },
      { status: 400 }
    );
  }

  if (!env.YOUTUBE_API_KEY) {
    return Response.json(
      { error: "YouTube search is not configured." },
      { status: 500 }
    );
  }

  const youtubeUrl = new URL(
    "https://www.googleapis.com/youtube/v3/search"
  );

  youtubeUrl.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    maxResults: "15",
    q: query,
    key: env.YOUTUBE_API_KEY,
  }).toString();

  try {
    const response = await fetch(youtubeUrl.toString());
    const data = (await response.json()) as {
      error?: { message?: string };
      items?: Array<{
        id: { videoId?: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: {
            high?: { url: string };
            medium?: { url: string };
            default?: { url: string };
          };
        };
      }>;
    };

    if (!response.ok) {
      return Response.json(
        { error: data.error?.message ?? "YouTube search failed." },
        { status: response.status === 403 ? 502 : response.status }
      );
    }

    const results = (data.items ?? [])
      .filter((item) => item.id.videoId)
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ??
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          null,
      }));

    return Response.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch {
    return Response.json(
      { error: "Could not connect to YouTube." },
      { status: 502 }
    );
  }
};
