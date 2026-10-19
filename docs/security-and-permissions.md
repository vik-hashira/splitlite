# Security & permissions

## Threat model in one paragraph
There are no accounts. **The group link is the access token**: Firestore doc IDs are random 20-char IDs,
and the rules allow `get` but never `list` on groups, so groups can't be enumerated. Every request
needs Firebase Anonymous Auth (`request.auth != null`). Everything beyond that is an **honor system**
the owner has explicitly accepted ("its users and grp creator responsibility to handle this in no login app").

## Group PIN
- Optional 4-digit PIN set at creation; stored as SHA-256 hex in `pinHash` (immutable in rules).
- Checked **only in the client** (`UnlockOverlay`). Anyone with the link can still read data via the API.
  It's a casual gate, not security. A 4-digit SHA-256 is trivially brute-forced.
- Unlock is remembered per browser tab in `sessionStorage` (`splitlite:unlocked:{groupId}`); creating a
  group also marks it unlocked. Mobile browsers/PWAs keep tabs alive for days, so the PIN can appear
  "never asked". This is expected; there's **no admin bypass**.
- `crypto.subtle` exists only on secure origins (HTTPS/localhost). `hashPin` throws a friendly error
  otherwise. Keep **Enforce HTTPS** on in GitHub Pages.
- The owner does **not** want per-member PINs. Keep the single group PIN.

## Ownership (name-based, stored in Firestore)
Implemented in `src/lib/permissions.ts`; UI shows or hides buttons accordingly.

| Action | Allowed for |
|---|---|
| View group, add expense, join as member, settle up | Anyone with the link (and PIN) |
| Edit/delete an expense | Its `createdByName` member, or the group admin |
| Edit/delete an expense whose adder isn't a member (e.g. `"Splitwise import"`) | Admin; if the group has no admin, anyone |
| Delete group | Admin only; groups with no admin: any member |
| Become admin | Set at creation ("Which one is you?"). Groups without one show a one-time "Make {me} the admin" link in the footer |

Ownership follows the **member name**, not the device: Jaya can edit her expenses from any phone by
choosing "Jaya" in "Who are you?". Anyone could pick "Jaya" too; accepted by the owner.

## What the Firestore rules enforce (`firestore.rules`)
- Auth required everywhere; groups: `get` only (no `list`).
- Shape validation for groups and expenses (types, sizes, category enum, `splitType == 'EQUAL'`,
  `expireAt is timestamp`).
- Group immutables: `pinHash`, `currency`, `expireAt` (once set), `creatorName` (once set, must be a member).
- `members` can only grow.
- Expense `createdByName` can't change on update, so ownership can't be dodged by renaming.
- Not enforced by rules (the client handles it): *who* edits/deletes an expense or deletes a group.
  Rules can't tell members apart without accounts.

## History (don't repeat)
- A per-device version (anonymous `uid` stored as `creatorUid`) shipped briefly in `f3256dd` and was
  replaced in `cb356fa`. The owner wanted ownership by member name, stored in Firebase, working from
  any device. Some docs created in that window may carry a stray `creatorUid` field; it's unused.

## Analytics privacy
Only counts, category, currency and booleans are sent. Group IDs are collapsed to `/g/:groupId` in
page views. Never send names, titles, amounts or IDs.
