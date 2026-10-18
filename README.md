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
- Delete a group (and all its expenses) at any time; everything auto-deletes 1 year after the group was created
- Privacy-friendly Google Analytics: page views and feature events only, never names, amounts or group IDs

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

### Auto-delete after 1 year (Firestore TTL)

Every group and expense document stores an `expireAt` timestamp (group creation + 365 days).
To let Firestore delete them automatically, go to **Firestore → TTL → Create policy** twice:

| Collection group | Timestamp field |
|------------------|-----------------|
| `groups`         | `expireAt`      |
| `expenses`       | `expireAt`      |

TTL deletion usually happens within a day of the expiry time.

### Analytics events

Sent to Google Analytics 4 through Firebase Analytics (needs `VITE_FIREBASE_MEASUREMENT_ID`):
`page_view` (group IDs collapsed to `/g/:groupId`), `group_created`, `group_opened`, `group_unlocked`,
`group_deleted`, `expense_added`, `expense_edited`, `expense_deleted`, `settle_up_opened`,
`settlement_recorded`, `share_link_copied`, `outbound_click`. Params are counts, category, currency and
booleans only.

## Deploy (GitHub Pages)

1. Add repository secrets (Settings → Secrets and variables → Actions):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
   `VITE_FIREBASE_MEASUREMENT_ID`.
2. Push to `main`. The workflow tests, builds, and publishes `dist/` to the `gh-pages` branch.
3. Settings → Pages → Source: **Deploy from a branch**, `gh-pages` / root. Custom domain: `splitlite.info` (set by the workflow's `cname`).
4. In Firebase Console → Authentication → Settings → **Authorized domains**, add `splitlite.info` (and `<user>.github.io`).

## Security model

The random 20-character Firestore document ID is the access token. The rules allow `get` but not
`list` on groups, so groups can't be enumerated. They also validate document shape, make the PIN and
currency immutable, keep `expireAt` fixed once set, and only let members be added (never removed).
Anyone with the link can delete a group. The PIN is a convenience gate
in the client, not strong security: anyone who has the link can read the data directly.
