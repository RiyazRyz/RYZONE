# RYZON Find Friend API Contract

Status: implementation specification and source audit. No production Worker deployment is performed from this repository.

## Existing Worker source reviewed

The user supplied the complete current Worker source on 2026-11-15. It includes Firebase RS256 token verification, Random Chat endpoints, profile read/update, friend request/respond/list/remove, and Friends text messaging.

### Confirmed gaps in the supplied source

- `/profile/me` and `/profile/update` read/write only `display_name`, `photo_url`, and `bio`; they omit `is_private` and `interests`.
- `/friends/request` checks blocks, existing friendship and duplicate/reverse requests, but does not enforce target profile privacy or `allow_friend_requests`.
- No Discover/Search endpoint exists.
- `/friends/list` returns only friend UID and creation time; no safe public profile, favorite flag, or privacy-aware presence.
- Incoming/outgoing request lists return UIDs only. No cancel endpoint exists.
- No favorites, notifications, friend-specific block/unblock, or friend report endpoints exist.
- No coin wallet, ledger/history, or transfer endpoints exist.
- Existing `/chat/partner-profile` returns profile fields without consulting any profile privacy setting. Its active-room check limits access to a current Random Chat partner, but privacy rules still need to be consistently enforced.
- The existing Random Chat routes and Firebase verification must be preserved during any integration.

These findings are based on the source pasted by the user; they are not a claim that the live Worker has been deployed or tested.

## Proposed routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/profile/me` | Return the signed-in user's editable profile and privacy preferences |
| POST | `/profile/update` | Update display name, photo URL, bio, interests and privacy preferences |
| GET | `/friends/discover?q=&language=&interest=&cursor=` | Search only profiles visible under their privacy settings |
| POST | `/friends/request` | Send a request after checking visibility, blocks, duplicates and request permissions |
| GET | `/friends/requests/incoming` | List received pending requests with safe sender profile fields |
| GET | `/friends/requests/outgoing` | List sent pending requests |
| POST | `/friends/respond` | Accept/reject a pending request addressed to the signed-in user |
| POST | `/friends/request/cancel` | Cancel the signed-in user's own pending outgoing request |
| GET | `/friends/list?cursor=` | List accepted friends with safe profile fields and favorite state |
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

Route names and request/response shapes must be reconciled with the existing front-end before enabling.

## Privacy and friendship rules

- `is_private = false`: profile may appear in discovery, subject to blocks and other visibility settings.
- `is_private = true`: profile is visible only to accepted friends; do not expose it in discovery or non-friend profile lookups.
- Enforce `allow_friend_requests` on the server. A hidden or private profile must not be bypassed by calling a route directly.
- Only the recipient may accept or reject an incoming pending request. Only the sender may cancel an outgoing pending request.
- Prevent duplicate pending requests, self-requests, requests between blocked users, and requests to existing friends.
- Presence must respect the user's online-status visibility setting. Do not invent online status from old message timestamps.
- Use bounded pagination and return only fields needed by the UI.

## Coin ledger rules

- Keep Free Coins and Purchased Coins in separate balances and ledger categories.
- Free Coins are gift-only. Reject attempts to transfer Free Coins or spend them on Premium, shopping, recharge, bills, or other features.
- Purchased Coins may be used for supported gifts, Premium/features, and transfers only to accepted, unblocked friends.
- Transfers must use integer positive amounts, an atomic D1 transaction/batch, conditional balance checks, and a unique idempotency key. A retry must not debit or credit twice.
- Record immutable ledger entries with transaction ID, sender, recipient, amount, coin type, timestamp and status. Do not let clients write balances or ledger rows.
- Do not implement a coin-purchase route until an approved payment provider, verified server-side webhook, refund handling and reconciliation are in place.
- Shopping, recharge and bill-payment use cases remain disabled until approved providers and compliance, settlement, accounting, fraud and consumer-protection checks are complete.

## D1 schema needed before implementation

The source code refers to these tables: `public_profiles`, `friend_privacy_settings`, `friend_favorites`, `friend_requests`, `user_friends`, `friend_blocks`, `friend_message_rooms`, and `friend_messages`. The exact column definitions, constraints and indexes have not yet been supplied. Coin, notification and presence table schemas are also unknown.

Run this read-only query in Cloudflare D1 Console for database `ryzon-random-chat` and share the result:

```sql
SELECT name, sql
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;
```

This returns the actual table definitions so the implementation can match the live schema rather than guessing. Do not run a migration yet.

## Required tests before enabling

1. Missing, invalid and expired Firebase tokens are rejected.
2. A caller cannot read or modify another user's profile, requests, notifications or wallet by changing a UID.
3. Private profiles and blocked users are excluded from discovery and profile responses.
4. Friend-request permissions, sender/recipient roles, duplicates and blocks are enforced server-side.
5. Concurrent transfers cannot create a negative balance; retries are idempotent.
6. Free Coin transfers and unsupported spending categories are rejected.
7. Existing Random Chat find/status/send/messages/end/block/report flows continue to pass regression tests.
8. CORS allows only the configured RYZON app origin(s).

## Deployment safety

The repository's `worker.js` is a placeholder, not the deployed Worker source. The source pasted by the user is available for review in this conversation, but the live Cloudflare Worker has not been fetched or deployed through this change. Any production Worker replacement must be reviewed against the D1 schema and regression-tested first.
