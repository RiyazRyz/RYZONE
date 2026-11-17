# RYZONE Frontend API Route Inventory — 2026-11-17

Status: static source audit of the current GitHub `main` branch. This records routes referenced by the UI; it does not prove that the deployed Worker implements them.

## Random Chat page (`random-chat.html`)

- `GET /profile/me`
- `POST /profile/update`
- `POST /chat/end`
- `POST /chat/find`
- `GET /chat/partner-profile?partnerUid=...`
- `GET /friends/status?friendUid=...`
- `POST /friends/request`
- `GET /chat/status`
- `GET /chat/messages?roomId=...`
- `POST /chat/send`
- `POST /chat/block`
- `POST /chat/report`

## Friends page (`friends.html`)

- `GET /friends/list`
- `GET /friends/requests/incoming`
- `GET /friends/requests/outgoing`

The page renders generic member labels and account references from the returned rows; it currently does not expose full profile data or request actions in this view.

## Wallet page (`wallet.html`)

- `GET /coins/wallet`
- `GET /coins/history`

The presence of these calls in the UI does not establish that the deployed Worker supports them. The previously reviewed Worker-source notes explicitly listed coin wallet/history/transfer APIs as missing in the source supplied at that time. Reconcile against the current deployed Worker before treating the wallet as live.

## Current source-level status

- Random Chat uses Firebase ID-token authentication in its API helper. Preserve this contract and the existing Random Chat routes during any backend extension.
- The repository's `worker.js` is a placeholder, so it is not a trustworthy source for the deployed implementation.
- Cloudflare D1 schema has been captured separately in `D1-SCHEMA-AUDIT.md`.
- No API calls requiring user credentials were made; no production Worker or database was changed.

## Next safe verification

Obtain/export the exact deployed Worker source from Cloudflare. Compare its route handlers and SQL with this inventory and `D1-SCHEMA-AUDIT.md`; then write tests for token verification, ownership checks, privacy, coin policy and existing Random Chat regression paths. Do not deploy a replacement based only on this route inventory.
