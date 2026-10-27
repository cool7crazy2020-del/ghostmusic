# Ghostmusic

Build a polished, responsive web app called GHOST Music, designed to be embedded inside a Google Sites page via its published URL. Visual design: near-black background, subtle dark-purple glow, clean premium music-player UI, no clutter. Build a real interactive frontend: sidebar Home, Search, Explore, Library, Playlists, Liked Songs, History; search input; featured tracks and album cards with artwork placeholders; clickable track rows; bottom persistent player with play/pause, previous/next, seek bar, volume; queue panel; like buttons; create/manage playlists; persist likes, playlists, and history in localStorage. Use accessible controls and responsive layout so it works inside an iframe. Important: be honest about the music backend. Do not fake actual song search or playback and do not scrape/bypass DRM. Start with a clearly labeled demo/sample catalog and a clean adapter boundary for a lawful audio source, plus explain in the UI that full catalog playback needs a supported music provider/source. If a track has a playable demo URL, play it using standard HTML audio; otherwise controls should clearly indicate demo/unavailable rather than pretending to play. Do not require API keys just to preview the interface. Build the app now and ensure all UI interactions work.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ghostmusic.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/96890406-d35d-4922-bec0-3be2b3e7b9c3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
