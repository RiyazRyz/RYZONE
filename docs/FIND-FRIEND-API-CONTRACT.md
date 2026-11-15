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
- Existing Random Chat routes and Firebase verification must be preserved during any integration.

These findings are based on the source pasted by the user; they are not a claim that the live Worker has been deployed or tested.

## Confirmed live D1 table schema

The user ran a read-only `sqlite_master` query in the Cloudflare D1 Console for `ryzon-random-chat` and supplied the results on 2026-11-15. The following relevant tables and columns are confirmed:

| Area | Table | Confirmed fields / constraints |
|---|---|---|
| Profile | `public_profiles` | `user_uid`, `display_name`, `photo_url`, `updated_at`, `bio`, `is_private` (0/1, default 0), `interests` (text, default empty) |
| Request privacy | `friend_privacy_settings` | `user_uid`, `allow_friend_requests` (0/1, default 1), `updated_at` |
| Favorites | `friend_favorites` | `user_uid`, `friend_uid`, `created_at`; composite primary key |
| Requests | `friend_requests` | `request_id`, `from_uid`, `to_uid`, `status` (pending/accepted/rejected), timestamps |
| Accepted friends | `user_friends` | `user_uid`, `friend_uid`, `created_at`; composite primary key |
| Blocks | `friend_blocks` | `blocker_uid`, `blocked_uid`, `created_at`; composite primary key |
| Reports | `friend_reports` | `report_id`, `reporter_uid`, `reported_uid`, `reason`, `details`, `status`, timestamps |
| Notifications | `friend_notifications` | `notification_id`, `user_uid`, `actor_uid`, `notification_type`, `title`, `body`, `data_json`, `created_at`, `read_at` |
| Presence | `user_presence` | `user_uid`, `status` (online/offline/invisible), `last_seen`, `updated_at`, `last_heartbeat` |
| Presence privacy | `user_presence_settings` | `user_uid`, `hide_last_seen`, `online_notifications_enabled`, `message_notifications_enabled`, `updated_at` |
| Notification preferences | `user_notification_settings` | friend request, friend online, message and push enable flags |
| Wallet | `coin_wallets` | `user_uid`, `free_balance` >= 0, `paid_balance` >= 0, `updated_at` |
| Coin ledger | `coin_transactions` | `transaction_id`, `user_uid`, `bucket` (free/paid), `transaction_type`, signed nonzero `amount`, `reason`, `reference_id`, unique per-user `idempotency_key`, `created_at` |
| Transfers | `coin_transfers` | `transfer_id`, `from_uid`, `to_uid`, `free_amount` >= 0, `paid_amount` >= 0, `status`, `idempotency_key`, timestamps; unique sender/idempotency key |
| Purchases | `coin_purchase_orders` | order/provider IDs, amount/currency, coin amount, pending/paid/failed/refunded status, timestamps |
| Reward catalogue | `coin_rewards` | reward title/description/cost/type/supplier/value/currency/active state |
| Redemptions | `coin_redemptions` | user/reward, paid coins spent, pending/fulfilled/rejected/cancelled status, supplier reference, timestamps |
| Friend chat | `friend_message_rooms`, `friend_messages` | room membership, status, message type/content/media URL, timestamps and read state |
| Separate direct-message table | `direct_friend_messages` | sender, receiver, text, created/delivered/read timestamps |
| Friend media | `friend_media` | owner, room, media type, storage key, file size, active/deleted status |

The D1 output also contains Random Chat tables, push-subscription/delivery tables, and legacy presence tables. They must not be dropped or rewritten as part of Find Friend work.

### Schema-specific cautions

- The `coin_transfers` table structurally permits a nonzero `free_amount`. This does **not** authorize Free Coin transfers. The Worker must reject every transfer with `free_amount > 0`; only Purchased Coins may be transferred, and only to an accepted, unblocked friend.
- `coin_transactions` permits several transaction types at the database level. The Worker must enforce the business policy: Free Coins are gift-only; Purchased Coins may be used only for supported gifts, Premium/features, and eligible friend transfers. Never trust a client-supplied bucket, balance, amount, transaction type or UID.
- `coin_purchase_orders` exists, but its presence does not mean payments are ready. Do not mark an order paid or credit Purchased Coins from a client request. Purchases require an approved provider, verified server-side webhook, idempotent reconciliation and refund handling.
- `coin_rewards.active` defaults to 0. Do not activate vouchers/rewards or enable shopping/recharge/bill-payment redemption until approved suppliers, compliance, settlement, accounting, fraud and consumer-protection checks are complete.
- Both `friend_messages` and `direct_friend_messages` exist. The current Worker uses room-based `friend_messages`; do not silently switch the frontend or backend to the separate direct-message table.
- `user_presence_backup` and `user_presence_old` are legacy-looking tables. Do not delete them without a separate verified migration plan.
- The supplied output lists table definitions, not indexes/triggers or foreign-key pragma results. Inspect those separately before designing performance or migration changes.

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

- `is_private = 0`: profile may appear in discovery, subject to blocks and other visibility settings.
- `is_private = 1`: profile is visible only to accepted friends; do not expose it in discovery or non-friend profile lookups.
- Enforce `allow_friend_requests` on the server. A hidden or private profile must not be bypassed by calling a route directly.
- Only the recipient may accept or reject an incoming pending request. Only the sender may cancel an outgoing pending request.
- Prevent duplicate pending requests, self-requests, requests between blocked users, and requests to existing friends.
- Presence must respect `user_presence_settings.hide_last_seen` and invisible status. Do not infer online status from old message timestamps.
- Use bounded pagination and return only fields needed by the UI.

## Coin ledger rules

- Keep Free Coins and Purchased Coins in separate balances and ledger categories.
- Free Coins are gift-only. Reject attempts to transfer Free Coins or spend them on Premium, shopping, recharge, bills, or other features.
- Purchased Coins may be used for supported gifts, Premium/features, and transfers only to accepted, unblocked friends.
- Transfers must use integer positive amounts, an atomic D1 transaction/batch, conditional balance checks, and a unique idempotency key. A retry must not debit or credit twice.
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

## Deployment safety

The repository's `worker.js` is a placeholder, not the deployed Worker source. The source pasted by the user is available for review in this conversation, but the live Cloudflare Worker has not been fetched or deployed through this change. Any production Worker replacement must be reviewed against the D1 schema and regression-tested first.
