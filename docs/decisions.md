# Decisions & owner preferences

Owner: Vikram (GitHub `vik-hashira`, X `@Eng_Vik_`). Builds this as a free community project.

## Product decisions (confirmed by the owner)
- **No accounts, ever.** Identity is "Who are you?" by member name. Picking someone else's name is
  the group's own responsibility.
- **One group PIN only**, no per-member PINs.
- **Ownership by member name, stored in Firestore**: adder + group admin can edit/delete an expense;
  only the admin deletes the group. Must work from any device, nothing tied to browser cache.
- **Admin = group creator**, chosen via "Which one is you?" at creation. For old groups, prefer the
  member named "Vikram", else "Vik"; if neither exists, ask the owner.
- **Data retention: 1 year** from group creation (fixed, not sliding), via Firestore TTL.
- **Landing page** must say data is never sold/shared, it's a free open project from one developer to
  the community, "use it wisely", and link GitHub + X.
- **Analytics on**, privacy-safe (see security doc). A cookie-consent banner was offered, not built yet.
- Member chips filter by **payer** ("Paid by X"), not "involved in".
- Selecting a category filter shows a **total for that filter** (plus your share).

## Technical decisions
- Hash routing for GitHub Pages; Vite `base: "./"`.
- Integer-cent money math; leftover cents go to the first people in `splitAmong`.
- Only `EQUAL` splits; uneven imports are modelled as several equal-split expenses.
- Rules: `get` but not `list` on groups (the link is the secret).
- Each expense carries the group's `expireAt` because TTL doesn't cascade to subcollections.
- Node 22 in CI (vitest 5 needs ≥ 22.12). Spec originally said Node 20.
- Repo is public because free GitHub Pages requires it.

## How the owner likes to work
- Wants to be asked rather than have Claude make product or data decisions on its own
  ("let me know if your confused ill help do not take decision by youself").
- For bulk data changes: show a dry-run list first, write only after approval.
- Prefers simple, practical options; communicates briefly from a phone, so give clear click-paths for
  console tasks.

## Open ideas / not done
- Cookie-consent banner for GA (EU/UK users).
- PIN unlock timeout (e.g. 24h) instead of per-tab session.
- Code-split the Firebase SDK (bundle is ~230 KB gzipped).
- Uneven/percentage splits.
