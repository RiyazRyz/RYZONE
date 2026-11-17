# RYZONE Friend Privacy & Safety Implementation Notes

Status: additive implementation specification. This document does not change the deployed Cloudflare Worker, D1 schema, or front-end.

This specification extends `FIND-FRIEND-API-CONTRACT.md`. It is deliberately separate from `worker.js` because the repository's current `worker.js` is only a placeholder and the deployed source has not been independently retrieved.

## 1. Privacy model

Treat profile visibility, discoverability, and friend-request permission as three separate decisions.

- `is_private = 0`: eligible to appear in Discover, unless blocked or excluded by another visibility rule.
- `is_private = 1`: do not return the full profile in Discover or to non-friends. Only accepted friends may see the full profile.
- `allow_friend_requests = 1`: a user may receive a friend request even when their profile is private. A private profile must not become publicly readable merely because a request can be sent.
- `allow_friend_requests = 0`: reject new requests with a generic response that does not reveal private profile details.
- Accepted friendship is mutual. A pending request is not friendship and grants no access to private profile fields.
- A block in either direction overrides discovery, profile lookup, requests, presence, and friend messaging.

For a private profile, an allowed request may be initiated only where the requester already has a valid target UID from a legitimate in-app context. The request response must not reveal the target's name, photo, bio, interests, or presence. Do not add a public UID enumeration endpoint.

## 2. Server-side authorization matrix

| Resource/action | Owner | Accepted friend | Other signed-in user |
|---|---:|---:|---:|
| Read full profile | Yes | Yes, if not blocked | Public profile only when `is_private=0`; otherwise deny/minimal response |
| Update profile/privacy | Yes | No | No |
| Discover profile | Own profile | Eligible public profiles | Eligible public profiles only |
| Send friend request | N/A | Already friends; reject | Only if target permits requests and neither side blocked |
| Accept/reject request | Recipient only | N/A | No |
| Cancel request | Sender only | N/A | No |
| Read friend messages | Participant only | Participant only | No |
| Read private presence | Owner | Only if owner permits friend visibility | No |

Every endpoint must derive the acting UID exclusively from the verified Firebase token. Ignore or reject client-supplied `user_uid`, `owner_uid`, or sender identity fields.

## 3. Endpoint behavior

### `GET /profile/me`

Return the authenticated user's own editable profile, including `is_private`, `interests`, and their own request/presence preferences. Create a safe default row only if the existing schema and current behavior support it. Never return another user's data based on a query UID.

### `POST /profile/update`

- Accept only allow-listed fields: display name, HTTPS photo URL, bio, interests, `is_private`, and supported privacy preferences.
- Validate types and enforce existing length limits.
- Accept booleans or documented 0/1 values consistently; normalize before writing.
- Do not allow a client to update another UID.
- Preserve omitted fields rather than resetting them to defaults.
- Return the saved values after the write.

### `GET /friends/discover`

- Exclude the caller, either-direction blocks, private profiles, and profiles that are not eligible for discovery.
- Search only approved public fields. Never search or return private bio/interests for a private profile.
- Bound query length and page size; use stable cursor pagination.
- Do not expose raw database errors or internal identifiers beyond the minimum required by the UI.

### `POST /friends/request`

- Validate target UID; reject self-request.
- Check blocks in both directions and existing accepted friendship.
- Read the target's `friend_privacy_settings.allow_friend_requests`; default only according to the actual D1 schema.
- Reject if requests are disabled.
- Enforce one pending request per direction/pair and handle reverse pending requests without creating duplicate rows.
- For a private target, a permitted request must not return private profile fields.
- Apply rate limiting or abuse controls before public rollout.

### `POST /friends/respond`

- Only the request recipient may accept/reject.
- Require a pending request and re-check blocks at decision time.
- On accept, create both friendship directions exactly once and update the request atomically using a D1 batch/transaction pattern supported by the deployed runtime.
- On reject, update only that pending request.
- Do not let a caller submit arbitrary sender/recipient UIDs to impersonate either party.

### `POST /friends/request/cancel`

- Only the original sender may cancel their own pending outgoing request.
- Current documented status values are pending/accepted/rejected. Until the actual schema is confirmed, delete only the sender-owned pending row rather than writing an unsupported `cancelled` status.
- Return a generic not-found result for requests the caller does not own.

### `POST /friends/block` and `POST /friends/unblock`

- Block/unblock only the authenticated user's own relationship.
- Blocking must prevent new requests and friend messages in either direction.
- On block, remove or invalidate pending requests between the pair and ensure active friend messaging cannot continue. Preserve message records unless the product's retention policy explicitly says otherwise.
- Unblock must not restore friendship or automatically recreate pending requests.
- Use the existing `friend_blocks` schema; verify its exact columns before writing SQL.

### `POST /friends/report`

- Reporter UID comes only from the verified token.
- Validate target UID, reason and bounded details.
- Prevent self-report and duplicate spam where practical.
- Store as pending moderation review; do not tell the reporter that enforcement has occurred.
- Never expose reports to the reported user.

### `GET /chat/partner-profile`

- Keep the existing active-room authorization check.
- Return only the minimum profile information needed for the Random Chat UI.
- Do not expose private profile fields to a Random Chat partner who is not an accepted friend.
- Preserve the existing Random Chat messaging, matching, end, block and report behavior.

## 4. Safe implementation sequence

1. Obtain the exact live D1 schema (read-only `sqlite_master` query already documented in `FIND-FRIEND-API-CONTRACT.md`).
2. Obtain the exact deployed Worker source in a form that preserves JavaScript formatting, or reconstruct and syntax-check it from the original source before editing.
3. Add small authorization helpers for accepted-friend checks, either-direction blocks, profile visibility, and request permission.
4. Apply those helpers to profile, Discover, request, friend list, presence, and Random Chat partner-profile responses.
5. Add cancel, block/unblock, and report routes only after verifying exact table columns and front-end request shapes.
6. Run endpoint authorization tests and Random Chat regression tests.
7. Review the complete diff. Only then prepare a production deployment plan; do not deploy automatically.

## 5. Required negative tests

- Private profile is absent from Discover and its bio/photo/interests are not returned to non-friends.
- A private user with requests enabled can receive a request without revealing private profile fields.
- Requests disabled prevents new requests, including direct API calls.
- Either-direction block prevents requests, messages, discovery, and profile disclosure.
- A pending request cannot read private profile data.
- A non-recipient cannot accept/reject; a non-sender cannot cancel.
- Client-supplied UID cannot change the authenticated owner.
- Unblock does not recreate friendship.
- Existing Random Chat find/status/send/messages/end/block/report and Friends Chat text messaging still work for authorized users.
- Invalid/expired Firebase tokens remain rejected.

## 6. Explicit non-goals

This change does not implement coin purchases/transfers, media sharing, video calls, payment processing, presence broadcasting, or a new D1 migration. Those require their own schema, provider, safety, and regression review.

## Deployment warning

No production code has been changed or deployed by this specification. Do not copy these notes into the Cloudflare Worker editor as executable code. The live Worker must be patched only after its exact source and D1 schema are verified.
