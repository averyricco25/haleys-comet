# Haley's Comet — Setup Guide

A TV show tracker (TV Time replacement). Search shows, track episodes, rate, and keep a
watchlist. Show data comes from the free TVMaze API (no key needed). Google sign-in and
cloud sync use Firebase (free tier).

## Run it locally (works right now)

```
npm install
npm run dev
```

Open the printed URL. Without Firebase configured, the app runs in **guest mode** —
everything works, but data is saved only on that device/browser.

## Movies (TMDB API key, ~5 minutes, free)

TV show data needs no setup, but movie search uses TMDB (themoviedb.org):

1. Create a free account at https://www.themoviedb.org/signup
2. Go to https://www.themoviedb.org/settings/api and request an API key
   (choose "Developer", fill in the short form — personal use is fine).
3. Copy the **API Key (v3 auth)** value into `.env` as `VITE_TMDB_API_KEY`.
4. Restart the dev server. The Movies tab in Discover now works.

If deploying, remember the deploy host needs the same env var (Vercel: Project →
Settings → Environment Variables; Firebase Hosting: it's baked in at `npm run build`
time from your local `.env`).

## Enable Google sign-in + cloud sync (Firebase, ~10 minutes, free)

1. Go to https://console.firebase.google.com and click **Add project** (name it
   `haleys-comet`, Google Analytics optional — off is fine).
2. In the project, click the **web icon (`</>`)** to add a web app. Register it
   (no hosting checkbox needed yet). You'll be shown a `firebaseConfig` object.
3. Copy `.env.example` to `.env` and paste each value from that config object.
4. In the left sidebar: **Build → Authentication → Get started → Sign-in method →
   Google → Enable** (pick your support email) → Save.
5. **Build → Firestore Database → Create database → Start in production mode** (pick a
   US location). Then open the **Rules** tab and replace the rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

   Click **Publish**. (This means each Google account can only read/write its own data —
   Haley and her mom get fully separate libraries.)

6. Restart the dev server (`npm run dev`). The login screen now shows
   **Sign in with Google**.

## Put it on the internet (so Haley can use it on her phone)

**Option A — Vercel** (nice if the project is on GitHub): import the repo at
https://vercel.com/new (framework: Vite), add the `VITE_*` env vars from your `.env`
in Project → Settings → Environment Variables, and deploy. Then add your
`your-app.vercel.app` domain in Firebase Console → Authentication → Settings →
Authorized domains. Note: Vercel replaces only the hosting — Firebase is still what
powers Google sign-in and synced data.

**Option B — Firebase Hosting** (same console, same project):

```
npm install -g firebase-tools
firebase login
firebase init hosting     # choose your project; public dir: dist; single-page app: Yes; no auto-builds
npm run build
firebase deploy
```

You'll get a URL like `https://haleys-comet.web.app`.

Two final steps:
- In Firebase Console → **Authentication → Settings → Authorized domains**, make sure
  your `*.web.app` domain is listed (it usually is automatically).
- On Haley's phone: open the URL in Chrome → menu (⋮) → **Add to Home screen**. It
  installs like an app — full screen, with the comet icon.

## Notes

- Guest-mode data does not transfer to a Google account automatically; have her sign in
  with Google from day one on her phone.
- To update the app later: make changes, `npm run build`, `firebase deploy`. Installed
  home-screen apps pick up the new version automatically on next launch.
