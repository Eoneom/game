# Slice 042 — City dashboard

**Status**: Planned.

## Summary

Turn the city home page `/city/$cityId/base/` into a **dashboard**: one screen that answers "what is my city doing, what needs me, what threatens it" without opening five pages.

Today the route renders `CityPage` (`modules/city/page.tsx`): two panels, « Disponibilité et stockage » (stocks, warehouse bars, building level cap) and « Production, énergie et terrain » (`ProductionTerrainReadout`, plasma and water rates, `EnergyReadout`). Nothing shows the queues, the defense, the movements, the threats or the exchange orders; the player reads them from the « Activité » strip chips or by visiting each page.

The dashboard is a grid of **cards**, each linking to its full page:

| Card (FR title) | Links to |
| --- | --- |
| « Attaques entrantes » (alert, only when there is one; detection-gated, [`030`](../030-intelligence/spec.md)) | `/city/$cityId/world/movement` |
| « Production et entrepôts » | `/city/$cityId/base/building` (+ opens the header resource panel of [`041`](../041-app-shell-navigation/spec.md)) |
| « Énergie » | `/city/$cityId/base/building` |
| « Construction » (building queue) | `/city/$cityId/base/building` |
| « Recherche » (research queue, player-wide) | `/city/$cityId/base/technology` |
| « Recrutement » (recruitment queue) | `/city/$cityId/base/troop` |
| « Fortification » (defense build queue) | `/city/$cityId/base/defense` |
| « Défense » (defense capacity) | `/city/$cityId/base/defense` |
| « Bourse » (this city's exchange orders, [`035`](../035-faction-exchange/spec.md)) | `/exchange` |
| « Mouvements » (outgoing, returning, convoys, incoming) | `/city/$cityId/world/movement` |

Every card is fed by an **existing hook and endpoint**, already shared with the other pages and refreshed by the existing WebSocket listeners. An aggregate endpoint is specified as **optional**. The outpost home `/outpost/$outpostId` gets the same treatment with the cards that apply to outposts.

Source of truth for the decisions: [`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md).

**Depends on**: [`040`](../040-readability-typography-theme/spec.md) (tokens, `surface-panel`), [`041`](../041-app-shell-navigation/spec.md) (shell, extended activity endpoint, resource panel context), [`007`](../007-buildings-upgrade-queue/spec.md), [`008`](../008-technology-research/spec.md), [`009`](../009-troops-stationary/spec.md) / [`028`](../028-command-center-shelter/spec.md) (recruitment queue, movement cap), [`010`](../010-troop-movement-combat/spec.md), [`011`](../011-outposts/spec.md), [`029`](../029-city-defenses/spec.md), [`030`](../030-intelligence/spec.md), [`035`](../035-faction-exchange/spec.md).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Route** | `/city/$cityId/base/` (unchanged path); the page becomes the dashboard. |
| **Cards** | Production per hour + warehouse fill, energy, building / research / recruitment / fortification queues, defense capacity, movements and incoming attacks, exchange orders. |
| **Links** | Each card's title links to its full page. |
| **Data** | Existing hooks only for the first delivery (no new endpoint required). Optional aggregate endpoint documented for later. |
| **Realtime** | Existing WS listeners invalidate the cards' queries; countdowns tick locally. |
| **Production breakdown** | Not repeated on the dashboard: it lives in the header resource panel ([`041`](../041-app-shell-navigation/spec.md)); the production card opens it. |
| **Outpost home** | `/outpost/$outpostId` becomes the same kind of dashboard, reduced to the cards that apply (below). |

## Layout

Workspace at 1920 × 1080: **1392 × ≈ 864 px** of content ([`040`](../040-readability-typography-theme/spec.md)). The workspace is a size container (`@container` on `main#workspace`); the grid is `grid grid-cols-2 gap-4 @[72rem]:grid-cols-3` (three 448 px columns at 1920, two columns when the workspace is under 1152 px, e.g. a 1280 px window).

```
┌ page header ──────────────────────────────────────────────────────────────────────────────┐
│ Nouvelle-Rouille   12.7                         Niveaux de bâtiments 34 / 40              │  text-page / meta
└───────────────────────────────────────────────────────────────────────────────────────────┘
┌ ⚠ ATTAQUES ENTRANTES (only when present) ────────────────────────────────────────────────┐
│ 2 attaques vers cette ville · première arrivée 03:10 · [Rouge] Krask        Voir →        │  col-span-full
└───────────────────────────────────────────────────────────────────────────────────────────┘
┌ Production et entrepôts → ──────────────────────────────────┐┌ Énergie → ────────────────┐
│ Plastique   12 480   ~1 250/h  ███████░░░ 62 %  plein ~3h10 ││ 120 / 150                 │
│ Champignon   8 210     ~980/h  █████░░░░░ 41 %  plein ~6h02 ││ █████████████░░░ 80 %     │
│ Plasma         340      ~40/h  illimité                     ││ Réserve +30               │
│ Eau pure     1 200      ~12/h  illimité                     ││                           │
│                                   [Détail de la production] ││                           │
└─────────────────────────────────────────────────────────────┘└───────────────────────────┘
┌ Construction → ─────────────┐┌ Recherche → ─────────────────┐┌ Recrutement → ─────────────┐
│ Usine de recyclage 4 → 5    ││ Agronomie 2 → 3 · Ferraille  ││ 12 Éclaireurs              │
│ ████████████░░░░  04:12     ││ ████░░░░░░░░░░░░  1:12:40    ││ ██████░░░░░░░░░░  01:05    │
│ 2. Ferme → 4     fin 14:32  ││ 2. Détection → 1  fin 18:05  ││ 2. 40 Pillards             │
│ 3. Entrepôt → 6  fin 15:10  ││                              ││                            │
│ File 2 / 3                  ││ File 1 / 3                   ││ File 1 / 3                 │
└─────────────────────────────┘└──────────────────────────────┘└────────────────────────────┘
┌ Fortification → ────────────┐┌ Défense → ───────────────────┐┌ Bourse → ──────────────────┐
│ Enceinte requise            ││ Points 60 (+20) / 100        ││ Ordres 2 / 3               │
│ Construisez l'Enceinte pour ││ ████████████████░░░░ 80 %    ││ Vente plastique 3/10 lots  │
│ ériger des défenses.        ││ Enceinte niv. 5 · 14 défenses││ Achat plasma 0/4 lots      │
│                             ││ dont 9 armées · Équilibrée   ││                            │
└─────────────────────────────┘└──────────────────────────────┘└────────────────────────────┘
┌ Mouvements → ─────────────────────────────────────────────────────────────────────────────┐
│ Sortants 2 · Retours 1 · Convois 1 · Entrants 2                       Mouvements 3 / 7     │  col-span-full
│ TYPE              TRAJET               ARRIVÉE                                            │
│ Attaque entrante  14.9 → 12.7          03:10                                               │
│ Attaque           12.7 → 15.2          05:44                                               │
│ Retour            15.2 → 12.7          12:30                                               │
│ Convoi de bourse  12.7 → 9.4           20:02                                               │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

Order is fixed (no reordering, no layout shift when a queue empties). The alert row appears above the grid only when there is an incoming attack on this city. Estimated height: header 64 + rows 220 / 200 / 190 / 260 + gaps ≈ 1000 px, so the workspace scrolls slightly at 1080 p. Without scrolling the player sees the alert, production, energy, the construction / research / recruitment row and the top of the fortification / defense / Bourse row.

Page header: `h1` city name `text-page text-amber`; coordinates `text-meta font-mono text-label`; right: « Niveaux de bâtiments `building_levels_used` / `maximum_building_levels` » (`text-meta`, values `font-mono text-amber`). The old lede « Tableau de bord de la colonie — stocks, production, terrain. » is dropped.

## Card component

`modules/location/dashboard/card.tsx` — `DashboardCard`:

| Prop | Role |
| --- | --- |
| `title` | French title; rendered as `<h2 class="text-heading">` containing a `RouterLink` to `to` / `params`, followed by « → » (`aria-hidden`). |
| `to`, `params` | Full page route. |
| `tone` | `'default' \| 'alert'`: alert adds `border-danger` and a `text-danger` title. |
| `state` | `'loading' \| 'error' \| 'ready'`. |
| `onRetry` | Called by « Réessayer » in the error state (the query's `refetch`). |
| `action` | Optional extra control in the title row (e.g. « Détail de la production »). |
| `className` | Grid span (`col-span-2`, `col-span-full`). |

Frame: `<section aria-labelledby>` with `surface-panel p-4`; title row `mb-3 flex items-baseline justify-between`. Body text follows [`040`](../040-readability-typography-theme/spec.md): values `text-body font-mono tabular-nums text-amber`, labels `text-meta text-label`, column headers `text-caption uppercase`.

| State | Rendering |
| --- | --- |
| Loading | `aria-busy="true"`; three 12 px bars `bg-chrome-3 animate-pulse motion-reduce:animate-none` (widths 80 / 60 / 40 %). The title link is already usable. |
| Error | « Données indisponibles. » `text-meta text-amber-dim` + `Button variant="ghost"` « Réessayer ». |
| Empty | Card-specific sentence (tables below) in `text-meta text-amber-dim`, plus a call to action link when one makes sense. |

Each card owns its query, so one slow endpoint never blocks the others. While `useGetCity` has no data yet, the page header shows a skeleton and every card renders its loading state (no full-page « Chargement… »).

Shared queue layout (`modules/city/dashboard/queue-card.tsx`, used by the four queue cards):

| Part | Content |
| --- | --- |
| Active job | Name + target (« Usine de recyclage 4 → 5 », « 12 Éclaireurs »), then `CountdownProgress` (8 px bar, time `text-body font-mono`). |
| Waiting rows | Ordered list « 2. », « 3. »: name + target, right column `text-meta font-mono` (« fin 14:32 » when the API gives `finish_at`, else nothing). |
| Footer | « File N / limit » `text-caption font-mono text-label`; « File pleine » in `text-amber` when N = limit. |
| Idle | « Libre » in `text-terminal` + the empty sentence + call to action. |

## Cards

### « Attaques entrantes » (alert row)

| Item | Value |
| --- | --- |
| Data | `useListIncomingMovements()` → `GET /troop/movement/incoming` (already fetched by the header). Filter `target.kind === 'city' && target.id === cityId`. |
| Shown when | The filtered list is non-empty. The server returns an empty list at detection 0 ([`030`](../030-intelligence/spec.md)), so nothing shows then. |
| Content | « N attaque(s) vers cette ville » · « première arrivée mm:ss » (earliest `arrive_at`, countdown) · attacker « [TAG] Nom » when `attacker` is present (detection ≥ 2) · « ~N unités » when `unit_count` is present (detection ≥ 3). Link « Voir les déplacements ». |
| Style | `DashboardCard tone="alert"`, `col-span-full`, `role="status"`. |

### « Production et entrepôts » (`col-span-2`)

| Item | Value |
| --- | --- |
| Data | `useGetCity(cityId)` → `GET /city/:city_id` (shared with the header). |
| Rows | Plastique, Champignon, Plasma, Eau pure. Columns: « Stock » (`plastic` …), « Production / h » (`transformHourlyEarnings(earnings_per_second.*)`), « Entrepôt » (plastic / mushroom: 8 px bar + percent from `warehouses_capacity.*` and `warehouse_space_remaining.*`, `bg-amber`, `bg-danger` from 90 %; plasma / water: « illimité »), « Plein dans » (`transformApproximateTimeUntilSeconds(warehouse_full_in_seconds.*)`, « plein » at 100 %, « — » when production is 0). |
| Warning | When `production_energy_ratio < 1`: « Production réduite à N % par manque d'énergie. » in `text-danger`. |
| Action | « Détail de la production » (`Button variant="ghost"`, small) → `ResourcePanelProvider.open()` from [`041`](../041-app-shell-navigation/spec.md) (base, terrain, faction, techno, energy breakdown). |
| Link | `/city/$cityId/base/building`. |
| Empty | Never empty (a city always has stocks). |

### « Énergie »

| Item | Value |
| --- | --- |
| Data | `useGetCity(cityId)`: `energy_consumption`, `energy`, `production_energy_ratio`. |
| Content | « consumption / production » `text-heading font-mono`, coloured by `getEnergyDisplayStatus`; usage bar (`getEnergyUsagePercent`); « Réserve +N » (`text-terminal`) or « Déficit −N » (`text-danger`). Reuses `EnergyReadout` without the breakdown props (bar mode). |
| Link | `/city/$cityId/base/building`. |

### « Construction »

| Item | Value |
| --- | --- |
| Data | `useListBuildings(cityId)` → `GET /city/:city_id/building`: the entry with `upgrade_at` / `upgrade_started_at` is the active job; `upgrade_queue` the waiting rows; target levels from `projectUpgradeQueueLevels` (`modules/building/queue-levels.ts`); limit `BUILDING_UPGRADE_QUEUE_LIMIT` (api-client). |
| Waiting row time | « fin hh:mm » from `finish_at`. |
| Empty | « Aucune construction en cours. » + link « Choisir un bâtiment ». |
| Link | `/city/$cityId/base/building`. |

### « Recherche »

| Item | Value |
| --- | --- |
| Data | `useListTechnologies()` → `GET /technology` (entry with `research_at` / `research_started_at`, `research_queue` with `city_name` and `finish_at`; target levels from `modules/technology/queue-levels.ts`); limit `RESEARCH_QUEUE_LIMIT`. The city of the **active** research comes from the extended activity endpoint (`research.city_name`, [`041`](../041-app-shell-navigation/spec.md)). |
| Player-wide | Research is one queue per player. When the active research runs in another city, the line adds « · <city_name> »; waiting rows always show their city. |
| Empty | « Aucune recherche en cours. » + link « Choisir une technologie ». |
| Link | `/city/$cityId/base/technology`. |

### « Recrutement »

| Item | Value |
| --- | --- |
| Data | `useCityRecruitQueue(cityId)` / `useListCityTroops(cityId)` (one request: `GET /city/:city_id/troop`): the troop with `ongoing_recruitment` is the active batch (`remaining_count`, `started_at`, `finish_at`); `recruit_queue` waiting batches (`troop_code`, `count`); limit `recruit_queue_limit`. |
| No queue | When `recruit_queue_limit = 0`: footer « Construisez un Centre de commandement pour mettre des lots en file. » instead of « File 0 / 0 ». |
| Empty | « Aucun recrutement en cours. » + link « Recruter ». |
| Link | `/city/$cityId/base/troop`. |

### « Fortification »

| Item | Value |
| --- | --- |
| Data | `useCityDefenses(cityId)` → `GET /city/:city_id/defense`: `ongoing_build` (`defense_code`, `remaining_count`, `started_at`, `finish_at`), `build_queue` (`defense_code`, `count`), `build_queue_limit`, `city_wall_level`. |
| No Enceinte | `city_wall_level = 0`: « Enceinte requise » (`text-label`) + « Construisez l'Enceinte pour ériger des défenses. » + link « Voir l'Enceinte » (`/city/$cityId/base/defense`). |
| Empty | « Aucune fortification en cours. » + link « Ériger des défenses ». |
| Link | `/city/$cityId/base/defense`. |

### « Défense »

| Item | Value |
| --- | --- |
| Data | Same `useCityDefenses(cityId)` query (no extra request); `useGetCity(cityId).default_combat_strategy`. |
| Content | « Points used (+queued) / total » + 8 px bar (`(used + queued) / total`), « libres : N » (`freeDefensePoints`, `modules/defense/capacity.ts`); « Enceinte niveau N »; « N défenses dont M armées » (Σ `count`, Σ `count` where `armed`); « Garnison : <strategy> » (`CombatStrategyLabels`, `modules/movement/translations.ts`). |
| No Enceinte | « Aucune capacité défensive : construisez l'Enceinte. » |
| Link | `/city/$cityId/base/defense`. |

### « Bourse »

| Item | Value |
| --- | --- |
| Data | `useMyExchangeOrders()` → `GET /exchange/order/mine`, `open` filtered by `city_id === cityId`; order limit = `trading_post` level from the `useListBuildings(cityId)` query already loaded by « Construction » (`open_order_limit` = level, [`035`](../035-faction-exchange/spec.md)). |
| Content | « Ordres N / limit »; up to 3 orders, newest first: « Vente » / « Achat » (`text-danger` / `text-terminal`, as in `modules/exchange/my-orders.tsx`), resource name, « filled / lots lots » with a 4 px bar, « N eau / lot ». « +K autres » when more. |
| No trading post | `trading_post` level 0: « Construisez un Comptoir d'échange pour placer des ordres. » |
| Empty | « Aucun ordre ouvert. » + link « Placer un ordre » (`/exchange`). |
| Link | `/exchange`. |

### « Mouvements » (`col-span-full`)

| Item | Value |
| --- | --- |
| Data | `useListMovements()` → `GET /troop/movement` (player-wide: `action`, `origin`, `destination`, `arrive_at`); `useMovementCapacity()` → `GET /troop/movement/capacity`; `useListIncomingMovements()` filtered on this city; `useListTechnologies()` for the `detection` level. |
| Classification | Pure helper `classifyLocationMovements({ movements, coordinates })` (`modules/location/dashboard/movements.ts`), comparing coordinates with the city's: **Convois** = `action === 'exchange'` with origin or destination here; **Retours** = `action === 'base'` with destination here; **Sortants** = every other movement with origin here (attacks, spies, transports, reinforcements, explorations, rebases away). Movements that neither start nor end here are ignored. |
| Counters | « Sortants N · Retours N · Convois N · Entrants N »; « Entrants » shows « Détection requise » when the `detection` technology is at level 0 (an empty list then means "unknown", not "none"). Right: `MovementCapacityReadout` « Mouvements used / limit ». |
| Table | Next **5** rows by `arrive_at` (incoming attacks included): « Type » (`MovementActionLabels`, « Retour » for returns, « Convoi de bourse », « Attaque entrante » in `text-danger`), « Trajet » (`formatCoordinates(origin) → formatCoordinates(destination)`, `font-mono`), « Arrivée » (countdown `formatDurationMmSs`). Dense table rules of [`040`](../040-readability-typography-theme/spec.md). « +K autres » link when more. |
| Empty | « Aucun mouvement en cours depuis ou vers cette ville. » + link « Envoyer des troupes ». |
| Link | `/city/$cityId/world/movement`. |

## Data and requests

| Card | Hook | Endpoint | Shared with |
| --- | --- | --- | --- |
| Production, Énergie, Défense (strategy), header | `useGetCity` | `GET /city/:city_id` | header (already loaded) |
| Construction, Bourse (limit) | `useListBuildings` | `GET /city/:city_id/building` | buildings page |
| Recherche, Mouvements (detection) | `useListTechnologies` | `GET /technology` | technologies page |
| Recherche (active city) | `useLocationActivity` | `GET /city/:city_id/activity` | left column (already loaded) |
| Recrutement | `useCityRecruitQueue` | `GET /city/:city_id/troop` | troops page, movement form |
| Fortification, Défense | `useCityDefenses` | `GET /city/:city_id/defense` | defense page |
| Bourse | `useMyExchangeOrders` | `GET /exchange/order/mine` | Bourse page |
| Mouvements | `useListMovements`, `useMovementCapacity` | `GET /troop/movement`, `GET /troop/movement/capacity` | movement page, left column |
| Alerte, Mouvements | `useListIncomingMovements` | `GET /troop/movement/incoming` | header (already loaded) |

First visit: about **6 new requests** (buildings, technologies, troops, defenses, movements, exchange orders), all cached by React Query and reused by the full pages. No new endpoint is required.

### Optional aggregate endpoint (not required for this slice)

If the six requests prove slow (measure first), add `GET /city/:city_id/dashboard`, owner-checked like `/city/:city_id/activity`, returning:

```ts
interface CityDashboardDataResponse {
  building: {
    current: { code: BuildingCode, level: number, upgrade_at: number, upgrade_started_at: number } | null
    queue: { building_code: BuildingCode, level: number, finish_at: number }[]
    queue_limit: number
  }
  research: {
    current: { code: TechnologyCode, level: number, research_at: number, research_started_at: number, city_id: string, city_name: string } | null
    queue: { technology_code: TechnologyCode, level: number, city_name: string, finish_at: number }[]
    queue_limit: number
  }
  recruitment: {
    current: { code: TroopCode, remaining_count: number, started_at: number, finish_at: number } | null
    queue: { troop_code: TroopCode, count: number }[]
    queue_limit: number
  }
  fortification: {
    current: { code: DefenseCode, remaining_count: number, started_at: number, finish_at: number } | null
    queue: { defense_code: DefenseCode, count: number }[]
    queue_limit: number
    city_wall_level: number
  }
  defense: {
    capacity: { total: number, used: number, queued: number }
    defense_count: number
    armed_defense_count: number
  }
  movements: {
    outgoing: number
    returning: number
    convoys: number
    next: { id: string, action: MovementAction, origin: Coordinates, destination: Coordinates, arrive_at: number }[] // max 5
    capacity: { used: number, limit: number }
  }
  incoming: { count: number, next_arrive_at: number | null, detection_level: number }
  exchange: {
    open_order_count: number
    open_order_limit: number
    orders: ExchangeOrder[] // max 3, this city only
  }
}
```

The web then reads it through one `useCityDashboard(cityId)` hook (`dashboardKeys.city(cityId)`), invalidated by every event of the realtime table below; the cards keep the same props. Stocks and energy stay on `GET /city/:city_id` (pushed by `CityResourcesGathered`).

## Realtime refresh

No new event. Existing listeners already invalidate what the cards read:

| Event | Listener | Cards refreshed |
| --- | --- | --- |
| `CityResourcesGathered` | `modules/city/ws-listener.ts` → `cityKeys.detail` | Production, Énergie |
| `BuildingUpgradeFinished`, `BuildingQueueItemDropped` | `modules/building/ws-listener.ts` → `buildingKeys.list`, `cityKeys.detail`, `defenseKeys.list` | Construction, Production, Énergie, Bourse (trading post level), Défense (Enceinte) |
| `TechnologyResearchFinished`, `TechnologyQueueItemDropped` | `modules/technology/ws-listener.ts` → `technologyKeys.all`, `activityKeys.all`; troop listener → `incomingMovements` | Recherche, Mouvements (detection) |
| `TroopRecruitmentUpdated`, `TroopQueueItemDropped` | `modules/troop/ws-listener.ts` → `troopKeys.cityList` | Recrutement |
| `DefenseBuildUpdated`, `DefenseQueueItemDropped`, `BattleFinished` | `modules/defense/ws-listener.ts` → `defenseKeys` | Fortification, Défense |
| `TroopMovementFinished`, `BattleFinished` | `modules/troop/ws-listener.ts` → `['movements']` prefix (list, capacity, incoming) | Mouvements, Alerte |
| `MovementIncoming` | `modules/troop/ws-listener.ts` → `troopKeys.incomingMovements` | Alerte, Mouvements |
| `ExchangeFilled` | `modules/exchange/ws-listener.ts` → `exchangeKeys.mine`, `['movements']`, `['city']` | Bourse, Mouvements (convoys), Production |

Countdowns use `useCountdownProgress`. When a countdown reaches 0 and no event has refreshed the card within **3 s**, the card invalidates its own query once (`onDone` + timeout), as `IncomingMovementList` does with `onArrived`. Mutations made on the full pages already invalidate the same keys.

## Outpost home

`/outpost/$outpostId` (`modules/outpost/page.tsx`) becomes the outpost dashboard with the same `DashboardCard` frame:

| Card | Content | Data |
| --- | --- | --- |
| « Attaques entrantes » (alert, conditional) | As for cities, filter `target.kind === 'outpost' && target.id === outpostId` | `useListIncomingMovements` |
| « Stocks et production » (`col-span-2`) | Plastique, Champignon, Plasma: stock, « Production / h » (permanent only, else « — »), entrepôt bar from `warehouses_capacity` and stock, « Plein dans » (permanent only). Action « Détail de la production » (resource panel). | `useGetOutpost` |
| « Statut » | Type « Permanent » / « Temporaire ». Temporary: « Rendre permanent » (`useSetOutpostPermanent`) and the existing `OutpostSettle` form (found a city). Permanent: « Avant-poste permanent — production active. » | `useGetOutpost`, existing mutations |
| « Garnison » | Existing `GarrisonCombatStrategy` control, plus « N unités stationnées » (Σ counts) | `useGetOutpost`, `useListOutpostTroops` |
| « Mouvements » (`col-span-full`) | Same card and helper, with the outpost coordinates; link `/outpost/$outpostId/world/movement` | as for cities |

No energy, queues, defense or Bourse cards (outposts have none of these). The quick links « Carte » / « Déplacement » at the top of today's outpost page are removed (the left column has them, [`041`](../041-app-shell-navigation/spec.md)). The redirect of `OutpostRoot` when a temporary outpost disappears is unchanged.

## Files

| File | Change |
| --- | --- |
| `apps/web/src/routes/city/$cityId/base/index.tsx` | Renders `CityDashboard`. |
| `apps/web/src/modules/city/page.tsx` | Replaced by `modules/city/dashboard/index.tsx` (`CityDashboard`). |
| `apps/web/src/modules/city/dashboard/` (new) | `index.tsx`, `queue-card.tsx`, `building-card.tsx`, `research-card.tsx`, `recruitment-card.tsx`, `fortification-card.tsx`, `defense-card.tsx`, `energy-card.tsx`, `exchange-card.tsx`. |
| `apps/web/src/modules/location/dashboard/` (new) | `card.tsx` (`DashboardCard`), `production-card.tsx` (city and outpost), `movements-card.tsx`, `incoming-alert.tsx`, `movements.ts` (`classifyLocationMovements`). |
| `apps/web/src/modules/outpost/page.tsx` | Replaced by `modules/outpost/dashboard/index.tsx` (`OutpostDashboard`); route `routes/outpost/$outpostId/index.tsx` renders it. |
| `apps/web/src/ui/production-terrain-readout.tsx` | Removed if still present (its content moved to the resource panel in [`041`](../041-app-shell-navigation/spec.md)). |
| `apps/web/src/App.tsx` | `main#workspace` gets `@container`. |

## Testing

| Area | Cases |
| --- | --- |
| Movement helper | `modules/location/dashboard/movements.test.ts`: outgoing / returning / convoys classification, rebase away counted as outgoing, return trip to this city as returning, exchange convoys both ways, unrelated movements ignored. |
| Card frame | `DashboardCard`: title link href; loading (`aria-busy`, skeleton); error with « Réessayer » calling `onRetry`; alert tone. |
| Queue cards | Each of the four: idle (« Libre » + call to action), active job with countdown, waiting rows with target levels (`projectUpgradeQueueLevels`, technology queue levels), « File N / limit », « File pleine »; research in another city shows its name; recruitment without command center footer; fortification without Enceinte. |
| Production / énergie | Fill percent and 90 % danger; « illimité » for plasma / water; « plein » at 100 %; energy reserve / deficit; reduced production warning; « Détail de la production » opens the resource panel (context mock). |
| Défense | Points, free points, armed count, strategy label; no Enceinte sentence. |
| Bourse | Orders filtered by city; limit from the trading post level; no trading post sentence; « +K autres ». |
| Mouvements | Counters, « Détection requise » at detection 0, next 5 rows sorted by arrival with incoming attacks in danger tone, capacity readout, empty state. |
| Alert | Hidden without incoming attacks on this city (attacks on another city do not show); attacker / unit count only when present. |
| Dashboard | `modules/city/dashboard/index.test.tsx`: all cards render with mocked queries; card order; one failing query shows its error state while the others render. |
| Outpost | `modules/outpost/dashboard/index.test.tsx` (replaces `modules/outpost/page.test.tsx`): permanent vs temporary content, « Rendre permanent » and settle form for temporary, no city-only cards, movements filtered on the outpost. |
| Realtime | Countdown reaching 0 without an event invalidates the card's query after 3 s (fake timers). |
| Guard | [`040`](../040-readability-typography-theme/spec.md) guard passes. |

## Out of scope

- Empire-wide overview of all locations ([`031`](../031-empire-overview/spec.md)).
- Actions from the dashboard (upgrade, recruit, cancel): the cards only link to the pages that act.
- Client-side interpolation of stocks between gather events.
- The aggregate endpoint, unless measurement asks for it.
- Card customisation (hide / reorder).

## Assumptions (confirm on review)

| # | Assumption |
| --- | --- |
| 1 | The production breakdown (base, terrain, faction, techno) is **not** on the dashboard; the production card opens the header resource panel of [`041`](../041-app-shell-navigation/spec.md). The old page's terrain and photovoltaic tables disappear from the home page. |
| 2 | Production and energy cards link to the buildings page (there is no production page). |
| 3 | « Recherche » shows the player-wide research queue on every city's dashboard, with the city name when it runs elsewhere. |
| 4 | Fortification and defense capacity are two cards (as listed in the decisions), both fed by one request. |
| 5 | « Mouvements » is one full-width card with counters and the next 5 arrivals; incoming attacks appear both as an alert row above the grid and as rows in that table. Classification uses coordinates, since the movement list has no "returning" flag. |
| 6 | « Entrants » shows « Détection requise » at detection 0 instead of « 0 ». |
| 7 | The Bourse card shows only the orders placed from this city, with the city's open order limit (trading post level). |
| 8 | Outpost home = « Attaques entrantes », « Stocks et production », « Statut » (permanent / settle actions kept), « Garnison », « Mouvements ». |
| 9 | Three columns from a 1152 px workspace (container query), two below; fixed card order. |
| 10 | No aggregate endpoint in the first delivery; its shape is documented for later. |

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`019`](../019-web-shell-routing/spec.md) | Route map: `/city/$cityId/base/` is the city dashboard; `/outpost/$outpostId` the outpost dashboard. |
| [`006`](../006-city-lifecycle-gathering/spec.md) / [`011`](../011-outposts/spec.md) | Web UI: city and outpost home pages. |
| [`029`](../029-city-defenses/spec.md), [`030`](../030-intelligence/spec.md), [`035`](../035-faction-exchange/spec.md) | Dashboard cards (fortification / defense, incoming attacks, exchange orders). |
| [`031`](../031-empire-overview/spec.md) | Note that the per-city dashboard exists; the empire overview stays a separate draft. |
| `README.md` (specs index) | Slice 042 row. |

## Evidence index (expected paths)

| Area | Paths |
| --- | --- |
| Routes | `apps/web/src/routes/city/$cityId/base/index.tsx`, `apps/web/src/routes/outpost/$outpostId/index.tsx` |
| City dashboard | `apps/web/src/modules/city/dashboard/*.tsx`, `index.test.tsx` |
| Shared cards | `apps/web/src/modules/location/dashboard/card.tsx`, `production-card.tsx`, `movements-card.tsx`, `incoming-alert.tsx`, `movements.ts`, `movements.test.ts` |
| Outpost dashboard | `apps/web/src/modules/outpost/dashboard/index.tsx`, `index.test.tsx` |
| Hooks reused | `apps/web/src/modules/city/hooks.ts`, `modules/building/hooks.ts`, `modules/technology/hooks.ts`, `modules/troop/hooks.ts`, `modules/defense/hooks.ts`, `modules/exchange/hooks.ts`, `modules/location/activity-hooks.ts` |
| Optional aggregate | `apps/server/src/app/query/city/dashboard.ts`, `apps/server/src/web/handler/city/dashboard.ts`, `packages/api-client/src/endpoints/city/dashboard.ts` (only if built) |
