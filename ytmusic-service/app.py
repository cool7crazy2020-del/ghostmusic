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


def clean_album(album):
    artists = album.get("artists", []) or []
    return {
        "id": album.get("browseId") or album.get("id"),
        "title": album.get("title", "Unknown album"),
        "artist": ", ".join(a.get("name", "") for a in artists) or album.get("artist", "Unknown artist"),
        "thumbnail": best_thumbnail(album),
        "year": album.get("year"),
        "type": album.get("type"),
    }


@app.get("/api/search")
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": [], "artists": [], "albums": []})

    try:
        tracks = ytmusic.search(query, filter="songs", limit=20)
        artists = ytmusic.search(query, filter="artists", limit=8)
        albums = ytmusic.search(query, filter="albums", limit=12)

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

        album_results = []
        for album in albums:
            clean = clean_album(album)
            if clean["id"] and clean["title"] != "Unknown album":
                album_results.append(clean)

        return jsonify({
            "results": results,
            "artists": artist_results,
            "albums": album_results,
        })
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


def allowed_audio_url(raw_url):
    """Allow only HTTPS URLs on explicitly configured audio-source domains."""
    from urllib.parse import urlparse

    if not raw_url or len(raw_url) > 2048:
        return False
    parsed = urlparse(raw_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return False
    configured = {
        domain.strip().lower().lstrip(".")
        for domain in os.getenv("YTDLP_ALLOWED_DOMAINS", "youtube.com,youtu.be").split(",")
        if domain.strip()
    }
    host = parsed.hostname.lower().rstrip(".")
    return bool(configured) and any(host == domain or host.endswith("." + domain) for domain in configured)


@app.post("/api/resolve-audio")
def resolve_audio():
    """Resolve audio from an explicitly allowlisted source the operator may stream."""
    from yt_dlp import YoutubeDL

    payload = request.get_json(silent=True) or {}
    source_url = payload.get("url", "")
    if not isinstance(source_url, str) or not allowed_audio_url(source_url):
        return jsonify({
            "error": "This audio source is not enabled. Configure YTDLP_ALLOWED_DOMAINS for a source you are authorized to stream."
        }), 400

    options = {
        "format": "bestaudio/best",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "socket_timeout": 12,
    }
    try:
        with YoutubeDL(options) as ydl:
            info = ydl.extract_info(source_url, download=False)
        if not info or not info.get("url"):
            return jsonify({"error": "No playable audio was found for this source."}), 404
        return jsonify({
            "url": info["url"],
            "title": info.get("title") or "Unknown title",
            "duration": info.get("duration"),
            "contentType": info.get("ext"),
        })
    except Exception:
        app.logger.exception("Audio resolution failed")
        return jsonify({"error": "Audio could not be resolved for this source."}), 502


@app.get("/")
def health():
    return jsonify({"status": "GHOST Music search service is running"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
