import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const query = new URL(request.url).searchParams
          .get("q")
          ?.trim();

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

        const key = process.env.YOUTUBE_API_KEY;

        if (!key) {
          return Response.json(
            { error: "YouTube API key is not configured." },
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
          key,
        }).toString();

        try {
          const response = await fetch(youtubeUrl);
          const data = await response.json();

          if (!response.ok) {
            return Response.json(
              { error: "YouTube search failed." },
              { status: 502 }
            );
          }

          const results = (data.items ?? [])
            .filter((item: any) => item.id?.videoId)
            .map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              artist: item.snippet.channelTitle,
              thumbnail:
                item.snippet.thumbnails.high?.url ??
                item.snippet.thumbnails.medium?.url ??
                null,
            }));

          return Response.json({ results });
        } catch {
          return Response.json(
            { error: "Could not connect to YouTube." },
            { status: 502 }
          );
        }
      },
    },
  },
});
