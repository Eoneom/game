# Plan — 020 system Player observability

1. Admin allowlist (`ADMIN_PLAYER_NAMES`) + `AdminAccessService`.
2. Emit `system-player:action-committed` after successful tick actions with payload + French summary.
3. Admin HTTP session endpoint; WS fan-out to admin connections only.
4. Web route, nav link, live in-memory feed with name filter and JSON details.
