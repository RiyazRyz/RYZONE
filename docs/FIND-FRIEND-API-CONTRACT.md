# RYZON Find Friend API Contract

Status: implementation specification only. This document does not deploy or enable any endpoint.

## Integration constraints

- Keep all existing Random Chat endpoints and behavior unchanged.
- Authenticate every endpoint with a Firebase ID token verified by the Worker. Never trust a UID supplied in the request body.
- Derive the acting UID from the verified token.
- Apply block checks and profile visibility rules on the server before returning profile data or allowing contact.
- Return consistent JSON: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code": "...", "message": "..." } }`.
- Use parameterized D1 queries, bounded pagination, input validation, and rate limits for discovery and request creation.
- Do not return private email addresses, phone numbers, Firebase tokens, or internal moderation details to other users.

## Proposed routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/profile/me` | Return the signed-in user's editable profile and privacy preferences |
| PATCH | `/profile/update` | Update display name, photo URL, bio, interests and profile privacy fields |
| GET | `/friends/discover?q=&language=&interest=&cursor=` | Search only profiles visible under their privacy settings |
| POST | `/friends/request` | Send a request after checking visibility, blocks, duplicates and request permissions |
| GET | `/friends/requests?direction=incoming|outgoing&cursor=` | List pending received or sent requests |
| POST | `/friends/request/accept` | Accept a pending request addressed to the signed-in user |
| POST | `/friends/request/reject` | Reject a pending request addressed to the signed-in user |
| POST | `/friends/request/cancel` | Cancel the signed-in user's own pending outgoing request |
| GET | `/friends/list?cursor=` | List accepted friends with safe profile fields and presence |
| POST | `/friends/favorite` | Add/remove an accepted friend from favorites |
| POST | `/friends/remove` | Remove an accepted friendship |
| POST | `/friends/block` | Block a user and prevent further requests/contact |
| POST | `/friends/unblock` | Remove a block |
| POST | `/friends/report` | Submit a safety report for review |
| GET | `/notifications?cursor=` | List the signed-in user's notifications |
| POST | `/notifications/read` | Mark only the signed-in user's notification as read |
| GET | `/coins/wallet` | Return separate Free and Purchased Coin balances |
| GET | `/coins/history?cursor=` | Return the signed-in user's ledger entries |
| POST | `/coins/transfer` | Transfer Purchased Coins to an accepted, unblocked friend |

All route names are proposed; reconcile them with the deployed Worker before implementation.

## Privacy and friendship rules

- `is_private = false`: profile may appear in discovery, subject to blocks and other visibility settings.
- `is_private = true`: profile is visible only to accepted friends; do not expose it in discovery or non-friend profile lookups.
- Enforce `allow_friend_requests` on the server. A hidden or private profile must not be bypassed by calling a route directly.
- Only the recipient may accept or reject an incoming pending request. Only the sender may cancel an outgoing pending request.
- Prevent duplicate pending requests, self-requests, requests between blocked users, and requests to existing friends.
- Presence must respect the user's online-status visibility setting.
- Use cursor pagination and return only fields needed by the UI.

## Coin ledger rules

- Keep Free Coins and Purchased Coins in separate balances and ledger categories.
- Free Coins are gift-only. Reject attempts to transfer Free Coins or spend them on Premium, shopping, recharge, bills, or other features.
- Purchased Coins may be used for supported gifts, Premium/features, and transfers only to accepted, unblocked friends.
- Transfers must use integer positive amounts, an atomic transaction/batch, conditional balance checks, and a unique idempotency key. A retry must not debit or credit twice.
- Record immutable ledger entries with transaction ID, sender, recipient, amount, coin type, timestamp and status. Do not let clients write balances or ledger rows.
- Do not implement a coin-purchase route until an approved payment provider, verified server-side webhook, refund handling and reconciliation are in place.
- Shopping, recharge and bill-payment use cases remain disabled until approved providers and compliance, settlement, accounting, fraud and consumer-protection checks are complete.

## Required tests before enabling

1. Missing, invalid and expired Firebase tokens are rejected.
2. A caller cannot read or modify another user's profile, requests, notifications or wallet by changing a UID.
3. Private profiles and blocked users are excluded from discovery and profile responses.
4. Friend-request permissions, sender/recipient roles, duplicates and blocks are enforced server-side.
5. Concurrent transfers cannot create a negative balance; retries are idempotent.
6. Free Coin transfers and unsupported spending categories are rejected.
7. Existing Random Chat find/status/send/messages/end/block/report flows continue to pass regression tests.
8. CORS allows only the configured RYZON app origin(s).

## Current implementation blocker

The repository's `worker.js` is currently only a placeholder. The deployed Cloudflare Worker source is not present in this repository. Do not replace or deploy this placeholder as the production Worker. Integrate this contract only after reviewing the complete current deployed Worker source and the actual D1 schema.
