# RYZONE D1 Schema Audit — 2026-11-17

Status: read-only audit based on the schema output supplied from Cloudflare D1 database `ryzon-random-chat`. No database migrations or Worker deployments were performed.

## Confirmed table groups

- Random Chat: `random_chat_active_users`, `random_chat_queue`, `random_chat_rooms`, `random_chat_messages`, `random_chat_blocks`, `random_chat_reports`.
- Profiles and friends: `public_profiles`, `friend_privacy_settings`, `friend_requests`, `user_friends`, `friend_blocks`, `friend_favorites`.
- Friend messaging/media: `friend_message_rooms`, `friend_messages`, `direct_friend_messages`, `friend_media`.
- Notifications and presence: `friend_notifications`, `user_notification_settings`, `push_subscriptions`, `push_event_log`, `push_delivery_queue`, `user_presence`, `user_presence_settings`.
- Coins and rewards: `coin_wallets`, `coin_transactions`, `coin_transfers`, `coin_purchase_orders`, `coin_rewards`, `coin_redemptions`.
- Premium: `premium_entitlements`.

## Important implementation constraints

1. `friend_privacy_settings` contains `allow_friend_requests`; profile visibility is separately stored as `public_profiles.is_private`. Enforce both independently in server-side authorization.
2. `coin_transfers` schema permits a positive `free_amount`. Product policy prohibits Free Coin transfers, so the Worker MUST reject any transfer where `free_amount > 0`; do not rely on the table constraint.
3. Coin balances are separated into `free_balance` and `paid_balance`. All balance mutations must be server-side, atomic, ledger-backed and idempotent.
4. `coin_transactions` uses unique `(user_uid, idempotency_key)`; transfer implementation must also ensure sender debit and recipient credit cannot partially succeed.
5. `premium_entitlements` restricts plan duration to 1–365 days and requires verified timestamps for active entitlements. Client-side PIN checks must never grant Premium.
6. Friend request status supports only `pending`, `accepted`, `rejected`; do not write a `cancelled` status unless the schema is deliberately migrated.
7. Random Chat timestamps use TEXT defaults while most friend/coin timestamps use INTEGER. Code must handle these types consistently and avoid assuming one timestamp format globally.
8. `friend_message_rooms` enforces ordered participant UIDs (`user_a_uid < user_b_uid`) and unique pairs. Room creation must normalize UID order.
9. Presence supports `online`, `offline`, `invisible`; privacy settings include `hide_last_seen`. Responses must honor these settings and must not infer online state from stale messages.
10. `coin_rewards.active` defaults to 0. Do not expose or fulfill inactive rewards.

## Known route/source gaps to reconcile

The repository's `worker.js` is a placeholder, not a source copy of the deployed Cloudflare Worker. The previously reviewed Worker source summary indicates missing Discover, favorite, notification, coin wallet/history/transfer and other friend-management routes. The actual live Worker has not been independently retrieved or tested.

The Friends page currently calls:
- `GET /friends/list`
- `GET /friends/requests/incoming`
- `GET /friends/requests/outgoing`

The Random Chat page also calls profile and friend routes. Before editing backend code, compare every frontend route and request/response shape with the exact deployed Worker source.

## Safe next steps

1. Preserve/export the current deployed Worker source.
2. Compare the full route list and SQL statements against this schema.
3. Add authorization and regression tests before changing production code.
4. Do not run migrations or deploy a replacement Worker until the source/schema diff is reviewed.

This document records schema observations only; it does not assert that any endpoint is currently working.
