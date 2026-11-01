# Enable GHOST Music accounts and cloud library sync

The sign-in UI and client-side sync are committed, but account features remain disabled until a Supabase project is connected.

## 1. Create a Supabase project
Create a project in Supabase, then open **Project Settings → API** and copy the Project URL and publishable/anon key. Never put a service-role key in the frontend.

## 2. Create the library table
Open the Supabase **SQL Editor** and run the contents of `ghost-library.sql`. Row-level security ensures each signed-in user can only read or change their own library row.

## 3. Configure the frontend deployment
In Cloudflare Pages → your GHOST Music project → **Settings → Environment variables**, add these for both Production and Preview if desired:
- `VITE_SUPABASE_URL` = the Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = the Supabase publishable/anon key

Trigger a new deployment after saving the variables. Vite environment variables are baked into the build, so simply adding them does not update an already-built deployment.

## 4. Auth settings
In Supabase **Authentication → URL Configuration**, add the deployed GHOST Music URL to the allowed Site URL / Redirect URLs. Configure email confirmation according to your preference. If confirmation is enabled, users must confirm their email before signing in.

## What syncs
The signed-in account's liked songs, playlists (including playlist track data and covers), and recent listening history are stored as one JSON library row and synced after changes. The browser still keeps a local copy. Signing out does not delete either copy.

## Important
Do not share or commit a Supabase service-role key. Only the public anon/publishable key belongs in frontend environment variables. The app has not been live-tested against a Supabase project yet.
