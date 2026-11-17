# RYZONE Worker Audit

**Audit basis:** Static review of the Worker source pasted by the project owner on 2026-11-17. This document does not prove that the same source is currently deployed to Cloudflare. No production Worker, D1 data, or secrets were changed.

## Current route coverage in the pasted source

| Area | Routes |
|---|---|
| Health and authentication | `GET /health`, `POST /auth` |
| Premium status | `GET /premium/status` |
| Coins (read-only) | `GET /coins/wallet`, `GET /coins/history` |
| Profile | `GET /profile/me`, `POST /profile/update` |
| Random Chat | `POST /chat/find`, `GET /chat/status`, `POST /chat/send`, `GET /chat/messages`, `GET /chat/partner-profile`, `POST /chat/end`, `POST /chat/block`, `POST /chat/report` |
| Friend requests and list | `POST /friends/request`, `GET /friends/requests/incoming`, `GET /friends/requests/outgoing`, `GET /friends/status`, `POST /friends/respond`, `GET /friends/list`, `POST /friends/remove` |
| Favorites and blocks | `POST /friends/favorites/add`, `POST /friends/favorites/remove`, `GET /friends/favorites`, `POST /friends/block`, `POST /friends/unblock`, `GET /friends/blocked` |
| Friend privacy and notifications | `GET /friends/privacy`, `POST /friends/privacy`, `GET /friends/notifications`, `POST /friends/notifications/read` |
| Friend text chat | `POST /friends/messages/send`, `GET /friends/messages` |

All routes except `/health` and `/auth` require a Firebase ID token in the Authorization Bearer header.

## Findings to address before production changes

1. **Friend privacy enforcement is incomplete.** `POST /friends/request` checks `friend_privacy_settings.allow_friend_requests`, but does not read `public_profiles.is_private`. Define the intended private-profile request behavior and enforce both controls server-side.
2. **Random Chat matching needs concurrency hardening and stress testing.** Candidate selection and room creation are separate operations. The conditional D1 batch reduces races, but concurrent Find Friend requests and queue preference changes still need targeted tests. Do not assume the current matching code is race-free.
3. **No server-side rate limiting is visible.** Add abuse controls for chat messages, friend requests, reports, and other repeatable write endpoints before broad public use.
4. **Wallet is read-only.** The pasted Worker only reads/initializes wallet balances and reads history. It has no purchase verification, coin transfer, reward redemption, or balance mutation routes. This is not a payment integration.
5. **Premium is status-only.** The pasted Worker reads verified active entitlements; it does not create entitlements or verify payments. Do not let a client-side PIN activate Premium.
6. **Friend page UI is limited.** The current `friends.html` calls the list and incoming/outgoing request read routes. Its current rendering is a basic UID list; accept/reject and richer profile actions are not surfaced there yet.
7. **Profile media is URL-based.** `/profile/update` accepts arbitrary HTTPS photo URLs. This does not implement secure image upload/storage or ownership validation.
8. **No evidence of deployment parity.** The repository `worker.js` is a placeholder, not a copy of this Worker. Keep the pasted source as the audit reference only; never deploy the placeholder.

## Firebase authentication review

The pasted code verifies RS256 Firebase ID-token signatures using Google's Secure Token public JWKs and checks project audience, issuer, expiry, issue time, and auth time. The frontend `random-chat.html` calls `currentUser.getIdToken()` and sends it as `Authorization: Bearer <token>`, which matches the Worker's expected header format.

A static read did not establish the cause of the previously reported “Invalid or expired Firebase login” response. Next diagnostic step is to capture the HTTP status and safe response body from `POST /auth` while signed in, and inspect non-secret token claim metadata only (for example, aud/iss/exp/iat/auth_time and whether the token was refreshed). Never share the actual ID token.

## Existing policy constraints

- Free Coins are gifts-only; reject free-coin transfers even though the database schema permits a positive `free_amount`.
- Purchased-coin mutations must be atomic, ledger-backed, and idempotent.
- Purchased coin use for shopping, recharge, bills, and other external settlement must remain disabled until approved providers and legal/compliance checks are complete.
- Premium activation requires server-verified payment and a valid entitlement.
- Friend messages require accepted mutual friendship and must reject either-direction blocks.
- Preserve the existing D1 schema unless a separately reviewed migration is required.

## Work performed

- Static source review only.
- No Worker deployment, D1 migration, live payment, or production data mutation.
