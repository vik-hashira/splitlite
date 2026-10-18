# SplitLite

Zero-friction group expense splitting. No accounts — share a link (optionally PIN-protected) and everyone sees expenses in real time.

- **Frontend:** React 18 + Vite + Tailwind CSS, `HashRouter` (`#/g/{groupId}`) so GitHub Pages never 404s
- **Backend:** Firebase Anonymous Auth + Cloud Firestore (Spark free tier)
- **Hosting:** GitHub Pages via GitHub Actions
- **PWA:** web manifest + service worker for home-screen install

## Features

- Create a group with title, emoji, currency, members, and an optional 4-digit PIN (SHA-256 hashed client-side)
- Recent groups remembered in `localStorage`; PIN unlock remembered per tab in `sessionStorage`
- "Who are you?" picker, so each device sees a personal balance ("You owe ₹350")
- Live expense feed grouped by date, with category and member filter chips
- Add/edit expense modal with auto-category detection ("coffee" → 🍕 Food)
- Settle Up: greedy debt simplification, plus "Mark paid" to record a settlement
- Money math done in integer cents; leftover cents are distributed so splits always sum exactly

## Setup

1. Create a Firebase project → add a **Web app** → copy its config.
2. **Authentication → Sign-in method → enable Anonymous.**
3. **Firestore Database → create** (production mode), then publish the rules in [`firestore.rules`](firestore.rules)
   (paste them in the console or run `firebase deploy --only firestore:rules`).
4. Local dev:
   ```bash
   cp .env.example .env   # fill in the VITE_FIREBASE_* values
   npm install
   npm run dev
   ```
5. Tests: `npm test`

## Deploy (GitHub Pages)

1. Add repository secrets (Settings → Secrets and variables → Actions):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
2. Push to `main`. The workflow tests, builds, and publishes `dist/` to the `gh-pages` branch.
3. Settings → Pages → Source: **Deploy from a branch**, `gh-pages` / root.
4. In Firebase Console → Authentication → Settings → **Authorized domains**, add `<user>.github.io`.

## Security model

The random 20-character Firestore document ID is the access token. The rules allow `get` but not
`list` on groups, so groups can't be enumerated. They also validate document shape, make the PIN and
currency immutable, and only let members be added (never removed). The PIN is a convenience gate
in the client, not strong security: anyone who has the link can read the data directly.
