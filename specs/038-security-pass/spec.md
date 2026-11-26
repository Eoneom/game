# Slice 038 — Security pass before public launch

**Status**: Planned.

## Summary

Make the game safe to open to the public. Today:

- **Login takes only the commander name**, with no secret: anyone can take over any account. Admins are also defined by name (`ADMIN_PLAYER_NAMES`), so anyone can take over an admin account.
- Session tokens **never expire**. They are stored **in plain text** in the database and in the browser's `localStorage`, and travel in the **WebSocket URL**.
- CORS accepts **every origin**. There is **no rate limiting**. The error middleware returns **raw error messages**.

This slice replaces name-only login with **email magic links**, moves sessions to **secure cookies**, hardens HTTP and WebSocket, adds baseline input validation and rate limiting, and gives admins **moderation tools** (abuse reports from [`032`](../032-messaging/spec.md), mutes and bans).

Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`002`](../002-player-session-auth/spec.md) (session, signup), [`017`](../017-realtime-websocket/spec.md) (WebSocket), [`021`](../021-admin-operator-tools/spec.md) (admin), [`032`](../032-messaging/spec.md) (reports, rate limits), [`001`](../001-health-api/spec.md).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Authentication** | **Email magic link**, passwordless. |
| **Sessions** | **Secure cookie** (`httpOnly`, `Secure`, `SameSite=Lax`). Absolute expiry **30 days**, idle expiry **7 days**. Token **hashed** in the database. WebSocket authenticated by the cookie. |
| **Multi-accounts** | **Later** (not in this slice). |
| **Moderation** | Admin **abuse report handling** and **sanctions** (mute, ban). No word filter, no admin audit log in this slice. |

## Authentication: email magic link

### Is a magic link enough?

Yes, for this game, under these conditions (all part of the spec):

- The **email account becomes the only key**: whoever controls the mailbox controls the game account. That is acceptable for a game, and the same as a password reset flow.
- Links are **single use**, **short-lived** (15 min), and stored **hashed**.
- Requests are **rate limited** and **enumeration-safe**: the same response whether the email exists or not.
- A **6-digit code** is sent with the link, for players who open the email on another device (phone) than the game (desktop).
- It needs a **transactional email provider** (SMTP or API). This is a new external dependency and a deployment secret.

### Flows

| Flow | Steps |
| --- | --- |
| **Signup** | `POST /auth/signup` `{ email, player_name, faction_code }` → validates name and faction as today, reserves the name for 15 min, sends link + code. Clicking the link (or entering the code) verifies the email, creates the player (bootstrap as today), and opens a session. |
| **Login** | `POST /auth/login` `{ email }` → always `200 { status: 'ok' }`. If a verified account exists, sends link + code. |
| **Verify** | `GET /auth/verify?token=…` (link) or `POST /auth/verify` `{ email, code }` → consumes the token, sets the session cookie, redirects to the web app. Codes: 5 wrong attempts invalidate the token. |
| **Logout** | `POST /auth/logout` → revokes the session, clears the cookie. |
| **Logout everywhere** | `POST /auth/logout-all` → revokes all sessions of the player. |

Email addresses are normalised (trim, lowercase), unique, **private**: never returned by any API except the player's own account endpoint, and never logged.

### Existing accounts

Existing players have no email. Before launch:

- An admin CLI command `yarn workspace @eoneom/server admin:claim-link <player_name>` generates a **one-time claim link** (valid 7 days). The admin sends it to the right person, who sets their email on it.
- Accounts not claimed by launch stay locked. Alternatively, the operator may reset the database before launch. Decide at deploy time; no code difference.

### Admins

Replace `ADMIN_PLAYER_NAMES` with `ADMIN_EMAILS` (comma-separated). A player is admin only if their **verified** email is in the list. Admin checks (`isObservabilityAdmin`, admin middleware) use the player id → verified email.

## Sessions

| Topic | Rule |
| --- | --- |
| Token | 256-bit random (`crypto.randomBytes(32)`), base64url. Only the **SHA-256 hash** is stored (`auth.token_hash`). |
| Cookie | `eoneom_session`, `httpOnly`, `Secure` (except local dev), `SameSite=Lax`, `Path=/`. |
| Expiry | Absolute 30 days after creation; idle 7 days since `last_action_at`. Expired sessions are rejected and purged by a daily job. |
| CSRF | `SameSite=Lax` plus an `Origin` check on every state-changing request (non-GET): it must match `WEB_ORIGIN`. |
| Web client | Remove token handling from `localStorage`; `fetch` with `credentials: 'include'`. |
| Migration | Existing `auth` rows are deleted (everyone logs in again). |

## WebSocket

| Topic | Rule |
| --- | --- |
| Authentication | Session **cookie** read at the upgrade request; remove `?token=`. Close `4001` when missing or invalid. |
| Origin | Reject upgrades whose `Origin` is not `WEB_ORIGIN` (close `4003`). |
| Limits | Max incoming message size 4 KB; the game socket accepts no client commands today, so incoming messages are ignored. |
| Revocation | Logout, logout-all, ban and session expiry close the player's sockets. |

## HTTP hardening

| Topic | Rule |
| --- | --- |
| CORS | Only `WEB_ORIGIN` (env), with credentials. |
| Security headers | `helmet` on the API. The web build gets a Content-Security-Policy (no inline scripts) and `frame-ancestors 'none'`. |
| Body size | JSON limit 32 KB (mail bodies are the largest payload). |
| Errors | Return `error_code` only for **known domain error codes** (registered enums). Any other error → `internal:error`, logged with stack server-side, never sent. |
| Input validation | Every handler validates body, params and query with a schema library (e.g. `zod`): types, lengths, enums, integer ranges. Invalid input → `request:invalid`. |
| Rate limiting | Per IP and per player, in Postgres-backed or in-memory windows (single instance for now): auth requests (5 per 15 min per email, 20 per hour per IP), general API (300 per minute per player), plus the messaging limits of [`032`](../032-messaging/spec.md). `429` + `request:rate-limited`. |
| Health | Split `GET /api/v1/health` into liveness and readiness (database + job queue) as planned in [`001`](../001-health-api/spec.md). |

## Secrets and deployment checklist

Not code-heavy, but part of the launch gate:

- Database password and email provider credentials from environment or a secret store; no defaults in production.
- Postgres not exposed publicly (remove the host port mapping in production compose).
- HTTPS only, behind a reverse proxy; HSTS.
- `yarn npm audit` (or equivalent) in CI; fail on high and critical vulnerabilities.
- Logs never contain tokens, cookies, emails or magic links.

## Moderation

### Abuse reports

Admin page `/admin/moderation` lists reports from [`032`](../032-messaging/spec.md): content snapshot, author, reporter, reason, date, report count for the same author. Actions: **classer** (dismiss) or **sanctionner** (opens the sanction form). Report status: `open`, `dismissed`, `actioned`.

### Sanctions

| Sanction | Effect |
| --- | --- |
| **Mute** (duration: 1 h, 24 h, 7 days, permanent) | Cannot post in chat or send letters (`moderation:muted` with end date). Can still play. |
| **Ban** (duration or permanent) | Cannot log in (`moderation:banned` with end date); all sessions revoked and sockets closed. The empire stays on the map, inactive. |
| **Lift** | An admin can end a sanction early. |

The sanctioned player receives a system letter stating the sanction, its reason and its end date.

### HTTP (admin only)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/admin/moderation/report?status=` | List reports |
| `PUT` | `/admin/moderation/report/:id` | Dismiss / mark actioned |
| `POST` | `/admin/moderation/sanction` | `{ player_id, kind: 'mute' \| 'ban', duration, reason }` |
| `DELETE` | `/admin/moderation/sanction/:id` | Lift |
| `GET` | `/admin/moderation/sanction?player_id=` | History |

## Persistence

Migration (next free number):

| Table / column | Content |
| --- | --- |
| `player.email`, `player.email_verified_at` | Unique on normalised email; nullable until claimed |
| `auth` | Replace `token` with `token_hash`; add `created_at`, `expires_at`; delete existing rows |
| `magic_link` | `id`, `email`, `purpose` (`signup`, `login`, `claim`), `token_hash`, `code_hash`, `attempts`, `payload` (signup data), `expires_at`, `consumed_at` |
| `abuse_report.status`, `abuse_report.handled_by`, `abuse_report.handled_at` | Moderation state |
| `sanction` | `id`, `player_id`, `kind`, `reason`, `starts_at`, `ends_at` (nullable = permanent), `created_by`, `lifted_at` |

## Testing

| Area | Cases |
| --- | --- |
| Magic link | Signup and login flows; single use; expiry; code attempts limit; enumeration-safe responses; claim links; email normalisation. |
| Sessions | Cookie flags; hashed storage; absolute and idle expiry; logout and logout-all; origin check on mutations. |
| WebSocket | Cookie auth; origin rejection; sockets closed on revocation. |
| HTTP | CORS restricted; unknown errors masked; schema validation; rate limits per IP, player and email. |
| Admin | Admin via verified email only; old name-based list gone. |
| Moderation | Report handling; mute blocks chat and mail with end date; ban blocks login and closes sockets; lift; system letter. |

## Out of scope

- Multi-account detection and exchange limits (later).
- Word filter, admin audit log.
- Two-factor authentication, OAuth providers.
- Account deletion and privacy page — **should be added before an EU public launch** since emails are personal data; tracked as a follow-up.

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`002`](../002-player-session-auth/spec.md) | Magic-link signup / login, cookie sessions, expiry. |
| [`017`](../017-realtime-websocket/spec.md) | Cookie auth, origin check, revocation. |
| [`021`](../021-admin-operator-tools/spec.md) | `ADMIN_EMAILS`, moderation pages. |
| [`032`](../032-messaging/spec.md) | Mute enforcement, report handling. |
| [`001`](../001-health-api/spec.md) | Liveness / readiness. |
| `README.md` | New environment variables (`WEB_ORIGIN`, `ADMIN_EMAILS`, email provider settings). |

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Auth | `core/auth/`, `app/command/auth/`, `adapter/email/`, `web/handler/auth/` |
| Sessions / middleware | `web/middleware/auth.ts`, `web/middleware/origin.ts`, `web/middleware/rate-limit.ts`, `web/middleware/error.ts` |
| Validation | `web/schema/` |
| WebSocket | `web/ws.ts` |
| Moderation | `core/moderation/`, `app/command/moderation/`, `web/handler/admin/moderation/` |
| Web | `modules/auth/*`, `helpers/websocket.ts`, `modules/admin/moderation/` |
