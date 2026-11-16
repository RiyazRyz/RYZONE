# RYZON Coin Wallet API & D1 Implementation Contract

Status: design specification only. No wallet endpoint, coin credit, payment, gift delivery, transfer, or external gift-card redemption is activated by this document.

## Goals

- Keep Free Coins and Purchased Coins in separate server-authoritative balances.
- Never accept a balance, coin type, price, reward amount, sender UID, or transaction status from the client as authoritative.
- Derive the signed-in UID only from the verified Firebase ID token.
- Preserve all existing Random Chat, profile, friend, and messaging routes.
- Use append-only ledger records, idempotency keys, bounded requests, and atomic database operations.
- Keep all real payment and external gift-card provider activity disabled until provider approval, legal/compliance review, adult/guardian eligibility checks, secure integration, refund/support procedures, and reconciliation are complete.

## Existing frontend contract

The current `wallet.html` calls:
- `GET /coins/wallet`
- `GET /coins/history`

The page expects wallet balance aliases:
- Free: `free_balance`, `freeCoins`, or `free_coins`
- Purchased: `purchased_balance`, `purchasedCoins`, or `purchased_coins`

History may be returned as `transactions`, `history`, or `items`. Prefer standardizing on `free_balance`, `purchased_balance`, and `transactions` in the Worker and then aligning the frontend.

## Proposed routes

| Method | Route | Purpose | State |
|---|---|---|---|
| GET | `/coins/wallet` | Read authenticated user's Free/Purchased balances and eligible batch expiry summary | Planned |
| GET | `/coins/history?cursor=` | Read bounded, paginated ledger history for authenticated user | Planned |
| POST | `/coins/rewards/claim` | Claim the server-defined daily Free Coin reward once per eligible day | Disabled until reward policy and abuse controls are finalized |
| GET | `/gifts/catalog` | Read active gift catalogue and server-side coin prices | Planned |
| POST | `/gifts/send` | Deliver a gift and debit the selected permitted balance atomically | Disabled until gift delivery and recipient rules are implemented |
| POST | `/coins/transfer` | Transfer Purchased Coins only to an accepted, unblocked friend | Planned; no stranger or Random Chat transfers |
| GET | `/redeem/catalog` | Read approved partner gift-card denominations | Disabled until official partner/API and compliance approval |
| POST | `/redeem/requests` | Create an idempotent redemption request with a server-controlled issuance state machine | Disabled until partner integration and operational review |

No `/coins/purchase` route is to be enabled until an approved payment provider, server-side payment verification/webhook, refunds, reconciliation, and support controls are in place.

## Coin rules

1. Free Coins are gift-only. They cannot be transferred, redeemed externally, or spent on Premium, shopping, recharge, bills, or other features.
2. Purchased Coins may be used only for the supported uses explicitly enabled by RYZON policy and backend controls. The current wallet UI lists eligible gifts, Premium/features, and accepted-friend transfers; external gift-card redemption remains a future partner-dependent feature.
3. Free Coins are used first for a gift where the user has not explicitly selected another eligible balance. If Free Coins are insufficient, the UI must ask the user to choose Purchased Coins; do not silently switch balances.
4. Transfers are limited to accepted, unblocked RYZON friends. Never transfer Coins to random chat matches or strangers. Free Coins cannot be transferred.
5. Purchased Coin batches expire 12 months after the applicable purchase date. Spend the earliest-expiring eligible batch first (FIFO). The server must calculate expiry and allocation.
6. The proposed 1 Coin = ₹1 is an internal accounting example only, not cash value, stored value, guaranteed gift-card value, or a promise of partner denomination.
7. Free Coins cannot be redeemed for Amazon, Flipkart, Meesho, or any external voucher. External redemption, if approved later, is Purchased-Coins-only.
8. Failed gift delivery or failed partner issuance must not result in a completed debit. Every retry must be safe and idempotent.

## D1 data model proposal

First inspect the live database schema. Do not run these proposed table definitions until they have been reconciled with existing tables and indexes.

### `coin_accounts`
- `user_uid` TEXT PRIMARY KEY
- `free_balance` INTEGER NOT NULL DEFAULT 0 CHECK (`free_balance` >= 0)
- `purchased_balance` INTEGER NOT NULL DEFAULT 0 CHECK (`purchased_balance` >= 0)
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `coin_ledger`
- `transaction_id` TEXT PRIMARY KEY
- `idempotency_key` TEXT NOT NULL UNIQUE
- `user_uid` TEXT NOT NULL
- `counterparty_uid` TEXT
- `coin_type` TEXT NOT NULL CHECK (`coin_type` IN ('free','purchased'))
- `amount` INTEGER NOT NULL CHECK (`amount` > 0)
- `direction` TEXT NOT NULL CHECK (`direction` IN ('credit','debit'))
- `category` TEXT NOT NULL
- `reference_id` TEXT
- `status` TEXT NOT NULL
- `created_at` TEXT NOT NULL

Ledger entries are append-only. Corrections use compensating entries; do not edit or delete historical financial records.

### `purchased_coin_batches`
- `batch_id` TEXT PRIMARY KEY
- `user_uid` TEXT NOT NULL
- `credited_amount` INTEGER NOT NULL CHECK (`credited_amount` > 0)
- `remaining_amount` INTEGER NOT NULL CHECK (`remaining_amount` >= 0)
- `purchased_at` TEXT NOT NULL
- `expires_at` TEXT NOT NULL
- `source_reference` TEXT NOT NULL UNIQUE
- `status` TEXT NOT NULL

Only verified server-side purchase confirmation or an explicitly approved administrative grant may create a Purchased Coin batch. Do not create batches from client requests.

### `daily_coin_claims`
- `claim_id` TEXT PRIMARY KEY
- `user_uid` TEXT NOT NULL
- `reward_day` TEXT NOT NULL
- `amount` INTEGER NOT NULL CHECK (`amount` > 0)
- `ledger_transaction_id` TEXT NOT NULL UNIQUE
- `created_at` TEXT NOT NULL
- UNIQUE (`user_uid`, `reward_day`)

The reward amount and eligible day are server-defined. Add rate limits and abuse checks. Do not award a reward just because the client says a claim succeeded.

### `gift_catalog`
- `gift_id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `coin_price` INTEGER NOT NULL CHECK (`coin_price` > 0)
- `active` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `gift_deliveries`
- `gift_delivery_id` TEXT PRIMARY KEY
- `idempotency_key` TEXT NOT NULL UNIQUE
- `sender_uid` TEXT NOT NULL
- `recipient_uid` TEXT NOT NULL
- `gift_id` TEXT NOT NULL
- `coin_type` TEXT NOT NULL CHECK (`coin_type` IN ('free','purchased'))
- `coin_amount` INTEGER NOT NULL CHECK (`coin_amount` > 0)
- `status` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `delivered_at` TEXT

### `coin_transfers`
- `transfer_id` TEXT PRIMARY KEY
- `idempotency_key` TEXT NOT NULL UNIQUE
- `sender_uid` TEXT NOT NULL
- `recipient_uid` TEXT NOT NULL
- `amount` INTEGER NOT NULL CHECK (`amount` > 0)
- `status` TEXT NOT NULL
- `created_at` TEXT NOT NULL

Only Purchased Coins may be transferred. Before transfer, verify accepted friendship, both accounts' eligibility, no applicable block, and available balance. Use an atomic D1 batch/transaction pattern and paired ledger entries.

### `gift_card_redemptions`
- `redemption_id` TEXT PRIMARY KEY
- `idempotency_key` TEXT NOT NULL UNIQUE
- `user_uid` TEXT NOT NULL
- `partner_code` TEXT NOT NULL
- `denomination_code` TEXT NOT NULL
- `coin_amount` INTEGER NOT NULL CHECK (`coin_amount` > 0)
- `status` TEXT NOT NULL
- `partner_reference` TEXT
- `created_at` TEXT NOT NULL
- `completed_at` TEXT

Use a state machine such as `pending`, `processing`, `issued`, `failed`, `cancelled`. Never expose coupon codes in logs. Do not mark a redemption issued or finalize the debit until the trusted partner confirms issuance. Handle retries and partner timeouts idempotently; reconcile uncertain outcomes before retrying. This table and route remain inactive until an official partner integration exists.

## Security and correctness requirements

- Verify Firebase ID tokens on every protected route; reject missing, invalid, expired, or revoked tokens as supported by the current auth implementation.
- Use only the verified token UID. Ignore any client-supplied `user_uid`, sender UID, balance, price, amount-to-credit, reward amount, status, or provider response.
- Validate positive integer amounts, bounded strings, allowed enum values, request size, and pagination cursors.
- Use server-side gift prices and redemption denomination mappings.
- Enforce unique idempotency keys and atomic conditional balance updates to prevent duplicate or negative balances.
- Never log Firebase tokens, payment secrets, partner credentials, coupon codes, or unnecessary personal data.
- Restrict CORS to the configured RYZON origin(s); add abuse rate limits and audit trails.
- Keep secrets only in Cloudflare Worker Secrets, never in GitHub or frontend JavaScript.
- Add tests for token failures, cross-user access, duplicate retries, concurrent spends, insufficient balances, expired batches, blocked/non-friend transfers, Free Coin misuse, failed gift delivery, and failed/uncertain partner issuance.

## Other backend gaps found in the app audit

These are separate from Coin Wallet and should be tracked without pretending they are live:
- Friends Discover/search and privacy-aware profile visibility.
- Friend request cancellation, favorites, safe profile data in friend lists, and block/report flows.
- Server-backed notifications and read state; current notifications page stores its data locally in the browser.
- Help/feedback submission endpoint; the current form explicitly says its backend is not connected.
- Premium entitlement status and payment verification must be audited separately; do not activate paid entitlements from frontend state.

## Required pre-implementation database inspection

Run this read-only query in Cloudflare D1 Console for `ryzon-random-chat` and share the result:

```sql
SELECT name, sql
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;
```

Do not run migrations until the actual live schema and current Worker source are reviewed. The final Worker update must preserve every existing route and be regression-tested before deployment.
