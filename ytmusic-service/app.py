import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from ytmusicapi import YTMusic

app = Flask(__name__)

CORS(
    app,
    resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "*")}}
)

ytmusic = YTMusic()


@app.get("/api/search")
def search():
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify({"results": []})

    try:
        tracks = ytmusic.search(
            query,
            filter="songs",
            limit=20
        )

        results = []

        for track in tracks:
            thumbnails = track.get("thumbnails", [])
            artists = track.get("artists", [])

            results.append({
                "videoId": track.get("videoId"),
                "title": track.get("title", "Unknown title"),
                "artist": ", ".join(
                    artist.get("name", "")
                    for artist in artists
                ),
                "thumbnail": (
                    thumbnails[-1].get("url")
                    if thumbnails else None
                ),
                "duration": track.get("duration"),
            })

        return jsonify({"results": results})

    except Exception:
        app.logger.exception("YouTube Music search failed")
        return jsonify({"error": "Search failed"}), 502


@app.get("/")
def health():
    return jsonify({"status": "GHOST Music search service is running"})


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000"))
    )
