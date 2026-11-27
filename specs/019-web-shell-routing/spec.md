# Slice 019 — Web application shell and routing

**Status**: As implemented on `main` (brownfield).

## Summary

The web SPA uses **TanStack Router** (file-based routes under `apps/web/src/routes/`). Unauthenticated users see login/signup (`AuthUnauthenticated`). Authenticated users with at least one city get the **app shell**: header, activity strip, nav menu, main workspace `Outlet`, location sidebar, collapsible chat panel ([`032`](../032-messaging/spec.md)), FX layer, and toast notifications.

**Depends on**: auth ([`002`](../002-player-session-auth/spec.md)), city list bootstrap ([`002`](../002-player-session-auth/spec.md#registration-and-bootstrap)).

## Entry

- `apps/web/src/index.tsx` — React root, `RouterProvider`, query client, auth provider.
- `apps/web/src/App.tsx` — session gate, loading state, shell layout.

Flow:

1. `useInitStoredToken` restores `localStorage` token.
2. No token → `AuthUnauthenticated`.
3. Token + pending `useListCities` → loading copy.
4. Token + empty cities → still loading (no shell).
5. Else → shell with `<Outlet />`.

## Shared layout

`routes/_shared/route.tsx` wraps children with `SharedRoot` (`modules/shared/root.tsx`):

- If no `cityId`/`outpostId` in location context, navigates to first city `/city/{id}/base`.

## Route map (generated `routeTree.gen.ts`)

| Area | Example paths |
| --- | --- |
| City base | `/city/$cityId/base/`, building, technology, troop child routes |
| City map/world | `/city/$cityId/map`, `/city/$cityId/world/map`, movement under `world/movement` |
| Outpost | `/outpost/$outpostId`, map, movement, world variants |
| Inbox | `/inbox/report`, `/inbox/mail` (Courrier, [`032`](../032-messaging/spec.md); search `box`, `mail_id`, `view=compose\|blocked`, `to`, `reply_to`) |
| Alliance | `/alliance` ([`033`](../033-alliances/spec.md)); the city map accepts `?x=&y=` to center on and select a cell |
| Shared report | `_shared/report` |

City layout: `routes/city/$cityId/route.tsx` + `modules/city/root.tsx`. Outpost: `routes/outpost/$outpostId/route.tsx`.

## Global UI

| Module | Role |
| --- | --- |
| `ui/header/` | Title links to city/outpost base |
| `ui/nav/menu` | Section navigation (buildings, tech, troops, map, inbox: Rapport and Courrier with unread counts, Alliance — slice 033) |
| `modules/communication/chat/panel.tsx` | Chat panel at the bottom of the shell: Global / Faction tabs, open state and tab in `localStorage` ([`032`](../032-messaging/spec.md)) |
| `ui/nav/location` | City/outpost switcher |
| `ui/activity` | Polls location activity endpoints |
| `ui/fx` | Completion bursts (`triggerFxBurst`); no ambient embers since [`040`](../040-readability-typography-theme/spec.md) |
| `index.css` | Global styles: semantic type tokens (`text-caption` … `text-display`, Tailwind default size scale dropped), palette (`ink`, `label`, `muted`, `edge`), flat surfaces (`surface-frame`, `surface-panel`, `surface-panel-inset`, `surface-raised`), global `:focus-visible` outline, boot animation ([`040`](../040-readability-typography-theme/spec.md)) |
| `ui/typography-guard.test.ts`, `ui/palette-contrast.test.ts` | Guards for the 12 px floor, the token-only sizes, textures behind text and WCAG AA contrast ([`040`](../040-readability-typography-theme/spec.md)) |

## API wiring

`apps/web/src/helpers/api.ts` — `@eoneom/api-client` with token from auth context.

## Out of scope

Marketing site, server-side rendering.

## Evidence index

| Area | Paths |
| --- | --- |
| Shell | `apps/web/src/App.tsx` (incl. `ChatPanel`), `apps/web/src/index.tsx`, `apps/web/src/index.css` |
| Routes | `apps/web/src/routes/`, `apps/web/src/routeTree.gen.ts` |
| Shared | `apps/web/src/modules/shared/root.tsx` |
| City/Outpost roots | `apps/web/src/modules/city/root.tsx`, outpost pages |
