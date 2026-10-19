# SplitLite — notes for Claude / AI helpers

No-login group expense splitter. React 18 + Vite + Tailwind SPA on GitHub Pages (`https://splitlite.info`),
Firebase Anonymous Auth + Firestore as the backend.

Read these before changing things:
- [docs/architecture.md](docs/architecture.md) — code map, data model, how features work
- [docs/security-and-permissions.md](docs/security-and-permissions.md) — PIN, admin, ownership, Firestore rules
- [docs/operations.md](docs/operations.md) — deploy, secrets, domain, Firebase console tasks, data fixes
- [docs/decisions.md](docs/decisions.md) — why things are the way they are, and the owner's preferences
- [docs/changelog.md](docs/changelog.md) — what shipped, in order

## Commands
- `npm run dev` — local dev (needs `.env`, see `.env.example`)
- `npm test` — vitest unit tests (`src/lib/*.test.ts`)
- `npm run build` — typecheck (`tsc --noEmit`) + Vite build to `dist/`
- Push to `main` deploys via `.github/workflows/deploy.yml` (test → build → `gh-pages`).

## Ground rules
- **`firestore.rules` is NOT deployed by CI.** After editing it, the owner must paste it into
  Firebase Console → Firestore → Rules → Publish. Always say so.
- Test rule changes in the emulator before shipping (see docs/operations.md, "Testing rules").
- Never break existing data: older docs lack newer fields (`creatorName`, `expireAt`); code and rules
  must handle missing fields.
- Money is computed in integer cents (`src/lib/settlements.ts`). Keep it that way.
- Ask the owner before making product decisions or bulk data changes; show a dry-run first.
- Analytics must never include names, amounts, titles or group IDs.
