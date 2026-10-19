# Operations

## Accounts & resources
| What | Where |
|---|---|
| GitHub repo | https://github.com/vik-hashira/splitlite (public; free Pages needs public) |
| Live site | https://splitlite.info (GoDaddy domain, GitHub Pages, HTTPS enforced) |
| Firebase project | `splitlite-vik` (Spark plan) |
| GA4 measurement ID | `G-7FF7Q8T3C8` |
| Owner's X/Twitter | https://x.com/Eng_Vik_ (linked on the landing page) |

## Deploy
Push to `main` → GitHub Actions (`deploy.yml`, Node 22): `npm ci` → `npm test` → `npm run build` →
`peaceiris/actions-gh-pages@v4` publishes `dist/` to `gh-pages` with `cname: splitlite.info`.
Watch it: `gh run list -w deploy.yml --limit 1`.

Repo secrets (Firebase web config, not really secret since it ships in the bundle):
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
`VITE_FIREBASE_MEASUREMENT_ID`. Local `.env` holds the same values (gitignored).
Update all from `.env`: `gh secret set -f .env -R vik-hashira/splitlite`.

## Manual Firebase Console tasks (CI does NOT do these)
1. **Publish rules** after any change to `firestore.rules`: Firestore Database → Rules → paste → Publish.
2. **TTL policies** (one-time): Firestore → TTL → collection group `groups`, field `expireAt`; and
   collection group `expenses`, field `expireAt`.
3. **Authorized domains**: Authentication → Settings → add `splitlite.info` (and `vik-hashira.github.io`).
4. **Anonymous sign-in** must stay enabled (Authentication → Sign-in method).

## DNS (GoDaddy, splitlite.info)
- A `@` → `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`
- AAAA `@` → `2606:50c0:8000::153`, `8001::153`, `8002::153`, `8003::153`
- CNAME `www` → `vik-hashira.github.io`

## Testing rules
`@firebase/rules-unit-testing` conflicts with firebase 13 in this repo, so test in a throwaway dir:
```bash
mkdir -p /tmp/sl-rules && cd /tmp/sl-rules && npm init -y
npm i firebase-tools @firebase/rules-unit-testing firebase@12 vitest
cp <repo>/firestore.rules .
echo '{"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"port":8080},"ui":{"enabled":false}}}' > firebase.json
# write rules.test.mjs with initializeTestEnvironment({ projectId: "demo-splitlite", firestore: { rules, host: "127.0.0.1", port: 8080 } })
npx firebase emulators:exec --only firestore --project demo-splitlite "npx vitest run rules.test.mjs"
```
Java is installed on the owner's Mac. Always seed **legacy-shaped docs** (no `creatorName`, imported
expenses with `createdByName: "Splitwise import"`) and assert they still read/write.

## Touching live data without the console
The CLI isn't logged in, and the rules block listing groups, so you can only reach groups whose ID you
know (the owner pastes links). Pattern used so far:
1. Anonymous token: `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$API_KEY` with
   header `Referer: https://splitlite.info/` and body `{"returnSecureToken":true}`.
2. Firestore REST: `https://firestore.googleapis.com/v1/projects/splitlite-vik/databases/(default)/documents/groups/{id}`
   with `Authorization: Bearer $idToken`. Use `PATCH ...?updateMask.fieldPaths=...` for partial updates.
3. Or a temp Node script using the firebase SDK + `.env`. **Delete temp scripts afterwards; never commit them.**

Writes still go through the rules. To list *all* groups you need console access or
`npx firebase-tools login` by the owner.

## Data operations done so far
- **Splitwise import** (2026-10-18) into "Kokan Trip 🏠" (`qVCCuDILid2Ibzyq9OeB`, group PIN set):
  41 CSV rows → 45 expenses (uneven splits became `part n/m` equal-split layers), names mapped
  (Rohit Vishwanatham→Rohit, priykant→Priykant, Vik→Vikram, jaya sahu→Jaya), `createdByName: "Splitwise import"`.
  Balances verified to the paisa against Splitwise's totals. Approach: parse CSV nets → per-person
  share → layer into equal splits → verify with the app's `calculateBalances` → batch write.
- **Admin backfill**: Kokan Trip's `creatorName` set to `Vikram` via REST. The owner set admins on
  their other groups themselves using the footer link.
