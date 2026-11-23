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

        const searchType = new URL(request.url).searchParams.get("type");

        if (searchType === "albums") {
          try {
            const catalogUrl = new URL("https://itunes.apple.com/search");
            catalogUrl.search = new URLSearchParams({
              entity: "album",
              limit: "24",
              term: query,
            }).toString();

            const catalogResponse = await fetch(catalogUrl, {
              headers: { Accept: "application/json" },
            });
            if (!catalogResponse.ok) {
              return Response.json(
                { error: `Album catalog request failed (${catalogResponse.status}).` },
                { status: 502 },
              );
            }

            const catalogData = await catalogResponse.json() as { results?: any[] };
            const results = (catalogData.results ?? [])
              .filter((item: any) => item.wrapperType === "collection" && item.collectionId)
              .map((item: any) => ({
                id: String(item.collectionId),
                title: item.collectionName ?? "Untitled",
                artist: item.artistName ?? "",
                year: item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : undefined,
                artworkUrl: item.artworkUrl100?.replace(/\\/\\d+x\\d+bb\\./, "/1500x1500bb."),
                trackCount: item.trackCount,
              }));

            return Response.json({ results });
          } catch (error) {
            console.error("Poster album catalog search failed:", error);
            return Response.json(
              { error: "Could not connect to the album catalog. Please try again." },
              { status: 502 },
            );
          }
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
