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
    try:
        limit = max(1, min(int(request.args.get("limit", "20")), 100))
    except ValueError:
        limit = 20
    if not query:
        return jsonify({"results": [], "artists": [], "albums": []})

    try:
        tracks = ytmusic.search(query, filter="songs", limit=limit)
        artists = ytmusic.search(query, filter="artists", limit=min(limit, 40))
        albums = ytmusic.search(query, filter="albums", limit=min(limit, 40))

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


@app.get("/api/albums/<path:album_id>")
def album_tracklist(album_id):
    if not album_id or len(album_id) > 200:
        return jsonify({"error": "Invalid album id"}), 400
    try:
        album = ytmusic.get_album(album_id)
        if not album:
            return jsonify({"error": "Album not found"}), 404
        artists = album.get("artists", []) or []
        tracks = []
        for track in album.get("tracks", []) or []:
            track_artists = track.get("artists", []) or artists
            video_id = track.get("videoId")
            if not video_id:
                continue
            tracks.append({
                "videoId": video_id,
                "title": track.get("title", "Unknown title"),
                "artist": ", ".join(item.get("name", "") for item in track_artists) or "Unknown artist",
                "artists": [{"id": item.get("id"), "name": item.get("name", "Unknown artist")} for item in track_artists],
                "thumbnail": best_thumbnail(track) or best_thumbnail(album),
                "duration": track.get("duration"),
                "album": album.get("title", "Unknown album"),
            })
        return jsonify({
            "album": clean_album(album),
            "tracks": tracks,
        })
    except Exception:
        app.logger.exception("Album tracklist lookup failed")
        return jsonify({"error": "Album tracklist unavailable"}), 502


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
    except Exception as exc:
        app.logger.exception("Audio resolution failed")
        # Return a concise diagnostic so the frontend can distinguish unavailable
        # videos from resolver/network/deployment failures; never return a traceback.
        detail = str(exc).strip()
        message = "Audio could not be resolved for this source."
        if detail:
            message = f"{message} {type(exc).__name__}: {detail[:400]}"
        return jsonify({"error": message}), 502



def _find_spotify_tracks(value, found):
    """Walk Spotify's public page JSON for track objects without using Spotify's API."""
    if isinstance(value, dict):
        # Spotify's embedded page data has appeared in a few shapes over time.
        name = value.get("name") or value.get("title")
        artists = value.get("artists") or value.get("artistNames")
        uri = value.get("uri") or value.get("id")
        if isinstance(name, str) and isinstance(artists, list) and artists:
            artist_names = []
            for artist in artists:
                if isinstance(artist, str):
                    artist_names.append(artist)
                elif isinstance(artist, dict) and isinstance(artist.get("name"), str):
                    artist_names.append(artist["name"])
            if artist_names and isinstance(uri, str) and ("track" in uri or len(uri) == 22):
                key = uri.rsplit(":", 1)[-1]
                if key not in found:
                    found[key] = {"title": name, "artist": ", ".join(artist_names)}
        for child in value.values():
            _find_spotify_tracks(child, found)
    elif isinstance(value, list):
        for child in value:
            _find_spotify_tracks(child, found)


@app.get("/api/spotify-playlist")
def spotify_playlist_tracks():
    """Best-effort public Spotify playlist page parser; no Spotify API credentials."""
    import json
    import re
    import requests
    from html import unescape
    from urllib.parse import urlparse

    raw_url = request.args.get("url", "").strip()
    try:
        parsed = urlparse(raw_url)
        if parsed.scheme != "https" or parsed.hostname not in {"open.spotify.com", "www.open.spotify.com"}:
            return jsonify({"error": "Paste a public Spotify playlist URL."}), 400
        match = re.fullmatch(r"/playlist/([A-Za-z0-9]+)", parsed.path.rstrip("/"))
        if not match:
            return jsonify({"error": "That link is not a Spotify playlist URL."}), 400
        playlist_id = match.group(1)
        page_url = f"https://open.spotify.com/playlist/{playlist_id}"
        response = requests.get(page_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }, timeout=15)
        if response.status_code != 200:
            return jsonify({"error": "Spotify wouldn't provide this playlist page. Make sure the playlist is public and try again."}), 502

        html = response.text
        found = {}
        # Prefer structured JSON blocks, which can contain the complete public track list.
        for block in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.I | re.S):
            try:
                _find_spotify_tracks(json.loads(unescape(block)), found)
            except (ValueError, TypeError):
                continue
        for block in re.findall(r'<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', html, re.I | re.S):
            try:
                _find_spotify_tracks(json.loads(unescape(block)), found)
            except (ValueError, TypeError):
                continue
        # Some Spotify pages expose their initial state in a serialized JSON script.
        for block in re.findall(r'<script[^>]*>(\s*\{.*?\}\s*)</script>', html, re.S):
            if "trackList" not in block and "tracklist" not in block and "trackUri" not in block:
                continue
            try:
                _find_spotify_tracks(json.loads(unescape(block)), found)
            except (ValueError, TypeError):
                continue

        tracks = list(found.values())
        if not tracks:
            return jsonify({"error": "Spotify's public page didn't expose its track list. This playlist may require login, or Spotify may have changed its page format. No songs were imported."}), 502
        return jsonify({"playlistId": playlist_id, "tracks": tracks, "count": len(tracks)})
    except requests.RequestException:
        app.logger.exception("Spotify playlist page request failed")
        return jsonify({"error": "Couldn't reach Spotify to read this playlist. Try again later."}), 502
    except Exception:
        app.logger.exception("Spotify playlist import failed")
        return jsonify({"error": "Couldn't read that Spotify playlist."}), 502


@app.get("/")
def health():
    return jsonify({"status": "GHOST Music search service is running"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
