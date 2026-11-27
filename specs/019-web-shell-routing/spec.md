# Slice 019 — Web application shell and routing

**Status**: As implemented on `main` (brownfield).

## Summary

The web SPA uses **TanStack Router** (file-based routes under `apps/web/src/routes/`). Unauthenticated users see login/signup (`AuthUnauthenticated`). Authenticated users with at least one city get the **app shell** (reworked by [`041`](../041-app-shell-navigation/spec.md)): skip link « Aller au contenu », header (56 px, compact resources + resource panel), left navigation column (256 px, location entries with their activity lines, then empire entries), main workspace `main#workspace` with the `Outlet`, location column (224 px), collapsible chat panel ([`032`](../032-messaging/spec.md)), FX layer, and toast notifications. There is no activity strip since 041.

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
| City base | `/city/$cityId/base/` (the city dashboard, [`042`](../042-city-dashboard/spec.md)), building, technology, troop, defense child routes; the four catalogues keep the selected entry in `?code=` (unknown values dropped by `validateSearch`, card clicks navigate with `replace`) ([`043`](../043-catalogue-card-grids/spec.md)) |
| City map/world | `/city/$cityId/map`, `/city/$cityId/world/map`, movement under `world/movement` (list search `tab` / `sort` / `incoming`, details `world/movement/$movementId`, send wizard `world/movement/send` with its state in the search params) ([`045`](../045-movements-revamp/spec.md)) |
| Outpost | `/outpost/$outpostId` (the outpost dashboard, [`042`](../042-city-dashboard/spec.md)), map, movement, world variants (same movement list, details and `send` routes as cities, [`045`](../045-movements-revamp/spec.md)); read-only troop page `/outpost/$outpostId/troop` (`?code=`, « Unités » in the left column; the outpost dashboard « Garnison » card links to it) ([`043`](../043-catalogue-card-grids/spec.md)) |
| Inbox | `/inbox/report`, `/inbox/mail` (Courrier, [`032`](../032-messaging/spec.md); search `box`, `mail_id`, `view=compose\|blocked`, `to`, `reply_to`) |
| Alliance | `/alliance` ([`033`](../033-alliances/spec.md)); the city map accepts `?x=&y=` to center on and select a cell |
| Shared report | `_shared/report` |

City layout: `routes/city/$cityId/route.tsx` + `modules/city/root.tsx`. Outpost: `routes/outpost/$outpostId/route.tsx`.

List + details pages use `LayoutPage` (`ui/layout/page.tsx`): on `xl` the details panel is a fixed `28rem` column next to the list (`minmax(0,1fr) 28rem`), stacked below `xl` ([`043`](../043-catalogue-card-grids/spec.md)).

## Global UI

| Module | Role |
| --- | --- |
| `ui/header/` | Brand, location title link (+ city coordinates), incoming-attack badge, compact resource button (stock per resource, energy as consumption / production, warehouse fill warnings) toggling the 760 px resource panel (`ui/header/resources/panel.tsx`: stocks and warehouses, per-hour production breakdown, energy); open state in `ResourcePanelProvider` (`ui/header/resources/context.tsx`) so the dashboard can open it ([`041`](../041-app-shell-navigation/spec.md)) |
| `ui/nav/menu` | Left column (`<nav aria-label="Navigation principale">`, 256 px): current location entries (city: Tableau de bord, Bâtiments, Technologies, Troupes, Défense, Déplacements, Carte; outpost: Tableau de bord, Unités ([`043`](../043-catalogue-card-grids/spec.md)), Déplacements, Carte) each with its activity line from the location activity endpoint ([`013`](../013-location-activity/spec.md)), then empire entries (Rapports and Courrier with unread badges, Alliance, Classements, Bourse, Observabilité IA for admins), then « Se déconnecter » ([`041`](../041-app-shell-navigation/spec.md)) |
| `modules/communication/chat/panel.tsx` | Chat panel at the bottom of the shell (40 px collapsed, 288 px open): Global / Faction tabs with the WAI-ARIA tabs keyboard pattern, `role="log"` messages, open state and tab in `localStorage` ([`032`](../032-messaging/spec.md), [`041`](../041-app-shell-navigation/spec.md)) |
| `ui/nav/location` | City/outpost switcher (`<aside aria-label="Emplacements">`, 224 px): current location `aria-current`, incoming-attack dot ([`041`](../041-app-shell-navigation/spec.md)) |
| `App.tsx` | Skip link to `#workspace`, landmarks (`header`, `nav`, `main#workspace`, `aside`, chat `section`) ([`041`](../041-app-shell-navigation/spec.md)) |
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
| Shell | `apps/web/src/App.tsx` (incl. `ChatPanel`, skip link, `ResourcePanelProvider`), `apps/web/src/index.tsx`, `apps/web/src/index.css` (`.skip-link`) |
| Navigation | `apps/web/src/ui/nav/menu/` (`index.tsx`, `entry.tsx`, `activity.tsx`), `apps/web/src/ui/nav/location/` |
| Header | `apps/web/src/ui/header/` (`resources/index.tsx`, `resources/item/index.tsx`, `resources/panel.tsx`, `resources/context.tsx`) |
| Routes | `apps/web/src/routes/`, `apps/web/src/routeTree.gen.ts` |
| Shared | `apps/web/src/modules/shared/root.tsx` |
| City/Outpost roots | `apps/web/src/modules/city/root.tsx`, outpost pages |
