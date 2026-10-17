# Slice 2 — Player session authentication — resolutions

**Surveyed**: `Eoneom/game` `main` (2026-10-17, post–slice 1 merge)  
**Spec**: [`specs/002-player-session-auth/spec.md`](../../specs/002-player-session-auth/spec.md)

All items below are **closed** as **documented as implemented** (brownfield capture). No product change implied unless a future slice explicitly revisits behavior.

## Naming and scope

| ID | Question | Resolution |
| --- | --- | --- |
| Q1 | API key vs player session? | **Session auth only** on `main`. No `requireApiKey` or service API keys. |
| Q2 | Directory name? | Renamed to **`specs/002-player-session-auth`**. |

## HTTP contract

| ID | Question | Resolution |
| --- | --- | --- |
| Q3 | `Authorization` format? | **Raw token** as stored; middleware does not strip `Bearer `. |
| Q4 | Invalid/missing session on REST? | **As implemented**: missing header → **401** + `token:not-found`; unknown token → **200** + `auth:not-found`. |
| Q5 | Logout without header? | **As implemented**: `assert(token)` throws. |
| Q6 | Route prefix? | Auth routes remain at **`/player/*`** root; health uses **`/api/v1/health`** (slice 001). |

## Session lifecycle

| ID | Question | Resolution |
| --- | --- | --- |
| Q7 | Multiple sessions? | **As implemented**: each login adds a row; concurrent tokens allowed. |
| Q8 | Expiry / idle timeout? | **As implemented**: `last_action_at` updated only; no enforcement. |
| Q9 | Credentials? | **As implemented**: player name only, no password. |

## WebSocket

| ID | Question | Resolution |
| --- | --- | --- |
| Q10 | WS error vocabulary? | **As implemented**: close reason `unauthorized` string on failed auth (not `auth:not-found`). |
| Q11 | Token delivery on WS? | **As implemented**: query string `?token=` only. |

## Web client

| ID | Question | Resolution |
| --- | --- | --- |
| Q12 | `token:not_found` vs `token:not-found`? | **As implemented**: API uses hyphen; client also clears on `token:not_found` in `AUTH_ERROR_CODES`. |

## Service API key (deferred)

| ID | Question | Resolution |
| --- | --- | --- |
| Q13–Q15 | API key design? | **Out of scope** — not present on `main`; specify only if/when implemented. |

## Spec Kit process

| ID | Question | Resolution |
| --- | --- | --- |
| Q16 | `.specify/` bootstrap? | **Done** on `main` (merged Spec Kit PR #3). Specs 001–002 live under `specs/`. |
