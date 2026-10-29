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


def best_thumbnail(item):
    thumbnails = item.get("thumbnails", []) or []
    return thumbnails[-1].get("url") if thumbnails else None


def clean_artist(item):
    return {
        "id": item.get("browseId") or item.get("id"),
        "name": item.get("artist") or item.get("name") or "Unknown artist",
        "thumbnail": best_thumbnail(item),
        "subscribers": item.get("subscribers"),
    }


@app.get("/api/search")
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": [], "artists": []})

    try:
        tracks = ytmusic.search(query, filter="songs", limit=20)
        artists = ytmusic.search(query, filter="artists", limit=8)

        results = []
        for track in tracks:
            track_artists = track.get("artists", []) or []
            results.append({
                "videoId": track.get("videoId"),
                "title": track.get("title", "Unknown title"),
                "artist": ", ".join(a.get("name", "") for a in track_artists),
                "artists": [
                    {"id": a.get("id"), "name": a.get("name", "Unknown artist")}
                    for a in track_artists
                ],
                "thumbnail": best_thumbnail(track),
                "duration": track.get("duration"),
                "album": (track.get("album") or {}).get("name"),
            })

        artist_results = []
        for artist in artists:
            clean = clean_artist(artist)
            if clean["id"] and clean["name"] != "Unknown artist":
                artist_results.append(clean)

        return jsonify({"results": results, "artists": artist_results})
    except Exception:
        app.logger.exception("Music search failed")
        return jsonify({"error": "Search failed"}), 502


@app.get("/api/artists/<path:artist_id>")
def artist_profile(artist_id):
    if not artist_id or not artist_id.startswith("UC"):
        return jsonify({"error": "Invalid artist id"}), 400

    try:
        artist = ytmusic.get_artist(artist_id)
        if not artist:
            return jsonify({"error": "Artist not found"}), 404

        tracks = []
        for section in artist.get("songs", {}).get("results", []) or []:
            artists = section.get("artists", []) or []
            tracks.append({
                "videoId": section.get("videoId"),
                "title": section.get("title", "Unknown title"),
                "artist": ", ".join(a.get("name", "") for a in artists),
                "thumbnail": best_thumbnail(section),
                "duration": section.get("duration"),
                "album": (section.get("album") or {}).get("name"),
            })

        return jsonify({
            "id": artist_id,
            "name": artist.get("name", "Unknown artist"),
            "description": artist.get("description", ""),
            "thumbnail": best_thumbnail(artist),
            "subscribers": artist.get("subscribers"),
            "songs": tracks,
        })
    except Exception:
        app.logger.exception("Artist profile lookup failed")
        return jsonify({"error": "Artist profile unavailable"}), 502


@app.get("/")
def health():
    return jsonify({"status": "GHOST Music search service is running"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
