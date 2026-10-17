# Slice 019 — Web application shell and routing

**Status**: As implemented on `main` (brownfield).

## Summary

The web SPA uses **TanStack Router** (file-based routes under `apps/web/src/routes/`). Unauthenticated users see login/signup (`AuthUnauthenticated`). Authenticated users with at least one city get the **app shell**: header, activity strip, nav menu, main workspace `Outlet`, location sidebar, FX layer, and toast notifications.

**Depends on**: auth ([`002`](../002-player-session-auth/spec.md)), city list bootstrap ([`003`](../003-player-registration-signup/spec.md)).

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
| Inbox | `/inbox/report` |
| Shared report | `_shared/report` |

City layout: `routes/city/$cityId/route.tsx` + `modules/city/root.tsx`. Outpost: `routes/outpost/$outpostId/route.tsx`.

## Global UI

| Module | Role |
| --- | --- |
| `ui/header/` | Title links to city/outpost base |
| `ui/nav/menu` | Section navigation (buildings, tech, troops, map, inbox) |
| `ui/nav/location` | City/outpost switcher |
| `ui/activity` | Polls location activity endpoints |
| `ui/fx` | Visual effects layer |
| `index.css` | Global styles (boot animation, surfaces) |

## API wiring

`apps/web/src/helpers/api.ts` — `@eoneom/api-client` with token from auth context.

## Out of scope

Marketing site, server-side rendering.

## Evidence index

| Area | Paths |
| --- | --- |
| Shell | `apps/web/src/App.tsx`, `apps/web/src/index.tsx`, `apps/web/src/index.css` |
| Routes | `apps/web/src/routes/`, `apps/web/src/routeTree.gen.ts` |
| Shared | `apps/web/src/modules/shared/root.tsx` |
| City/Outpost roots | `apps/web/src/modules/city/root.tsx`, outpost pages |
