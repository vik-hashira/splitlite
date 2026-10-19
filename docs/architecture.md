# Architecture

## Stack
| Layer | Choice | Notes |
|---|---|---|
| UI | React 18, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`) | Mobile-first |
| Build | Vite 8, `base: "./"` | Relative base works on any path/domain |
| Routing | `HashRouter` | `#/` and `#/g/:groupId` — GitHub Pages never 404s on reload |
| Backend | Firebase Anonymous Auth + Cloud Firestore | Spark (free) plan |
| Analytics | Firebase Analytics (GA4) | `src/lib/analytics.ts` |
| Hosting | GitHub Pages, `gh-pages` branch, custom domain `splitlite.info` | |
| PWA | `public/manifest.webmanifest`, `public/sw.js` | SW registered only in prod builds |
| Tests | Vitest | Node ≥ 22.12 required (vitest 5) |

## Code map
```
src/
  main.tsx                 React root + service worker registration
  App.tsx                  "Firebase not configured" fallback, router, RouteTracker
  pages/
    CreateGroup.tsx        Landing: create form, "Which one is you?" (admin), recent groups, About section
    GroupPage.tsx          Dashboard: header, balance banner, filters, feed, FAB, all modals,
                           ExpenseCard, WhoAreYou, DeleteGroupModal, admin-claim modal
  components/
    Modal.tsx              Bottom sheet; sized to visualViewport so the mobile keyboard doesn't hide it
    ExpenseModal.tsx       Add/edit expense, auto-category, sticky save button
    SettleUpModal.tsx      Transfer list + balances + "Mark paid"
    UnlockOverlay.tsx      Group PIN entry
    PinInput.tsx           4-box numeric input
    MemberInput.tsx        Tag-style name input
    Chip.tsx               Filter chip
    RouteTracker.tsx       Logs page_view per hash route (group IDs collapsed)
  lib/
    firebase.ts            Init, ensureAuth, all Firestore reads/writes, expiry, delete, claimAdmin
    settlements.ts(+test)  equalShares, calculateBalances, calculateSettlements (integer cents)
    permissions.ts(+test)  isGroupAdmin, canEditExpense, canDeleteGroup
    categories.ts          Category list + keyword auto-detection
    pin.ts                 hashPin (SHA-256 via crypto.subtle), per-tab unlock state
    storage.ts             localStorage: recent groups, "me" per group
    analytics.ts           track(), trackPage()
    format.ts              Currency list, formatMoney, dayLabel
    types.ts               Group, Expense, ExpenseInput
firestore.rules            Security rules (deploy manually!)
firebase.json              Points Firebase CLI at firestore.rules
.github/workflows/deploy.yml
public/                    icons, manifest, sw.js
```

## Data model (Firestore)

### `groups/{groupId}`
| Field | Type | Notes |
|---|---|---|
| `title` | string | Includes the chosen emoji, e.g. `"Kokan Trip 🏠"` |
| `currency` | string (3) | Immutable |
| `pinHash` | string(64) \| null | SHA-256 hex of the 4-digit PIN. Immutable |
| `members` | string[] | Names. Can only grow (rules use `hasAll`) |
| `creatorName` | string? | Group admin, must be in `members`. Set once, then fixed. Missing on old groups |
| `createdAt`, `updatedAt` | number (epoch ms) | |
| `expireAt` | Timestamp | `createdAt + 365d`, fixed once set. Used by TTL |

### `groups/{groupId}/expenses/{expenseId}`
| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `category` | `food\|travel\|stay\|drinks\|tickets\|general` | |
| `amount` | number | Major units, 2 decimals |
| `paidBy` | string | Member name |
| `splitAmong` | string[] | Equal split among these |
| `splitType` | `"EQUAL"` | Only type supported |
| `createdAt` | number (epoch ms) | Feed is ordered by this, desc |
| `createdByName` | string | Member who added it ("Who are you?" value). Fixed after creation. Owner for permissions |
| `expireAt` | Timestamp | Same value as the parent group's (TTL doesn't cascade) |

Settlements ("Mark paid") are stored as ordinary expenses: `paidBy = debtor`, `splitAmong = [creditor]`,
title `Settlement: A → B`.

## Key behaviours
- **Identity:** no accounts. "Who are you?" stores the chosen member name per group in `localStorage`
  (`splitlite:me:{groupId}`). Anyone can pick any name; that's by design.
- **Real-time:** `onSnapshot` on the group doc and the expenses collection.
- **Balances:** `calculateBalances` works in cents; `equalShares` gives leftover cents to the first people
  in `splitAmong`. Settle-up is greedy (largest debtor ↔ largest creditor).
- **Filters:** category chips + member chips (`Everyone`, `Paid by me`, `Split with me`, `Paid by {name}`).
  When any filter is active, a summary bar shows the filtered total and "your share".
- **Auto-category:** keyword regexes in `categories.ts`; stops once the user picks a category manually.
- **Expiry:** `expireAt` is written on create; groups made before that feature get backfilled when opened
  (`backfillExpiry`). Actual deletion needs TTL policies (see operations.md).
- **Delete group:** client batch-deletes all expenses (450 per batch), then the group doc.
- **Mobile keyboard:** `Modal` uses `window.visualViewport` height/offset; viewport meta has
  `interactive-widget=resizes-content`.
