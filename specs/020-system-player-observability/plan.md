# Plan — 020 system Player observability

1. Admin allowlist (`ADMIN_PLAYER_NAMES`) + `AdminAccessService`.
2. Emit `system-player:action-committed` after successful tick actions with payload + French summary.
3. Admin HTTP session endpoint; dedicated `/admin/observability/ws` fan-out (observability events only).
4. Admin console at `/admin` (outside game shell), nav link, live in-memory feed with name filter and JSON details.
