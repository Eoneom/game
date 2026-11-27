# Slice 043 — Catalogue card grids

**Status**: Implemented on `main` (slice 043): shared `ui/catalogue/` card grid (card, grid with keyboard navigation, pure `catalogueCardState`, badge copy, persisted filters) replaces `ui/list/` in the four catalogues; building families, troop role groups, defense groups with the Enceinte wide card; `LayoutPage` fixed 28 rem details column on `xl`; selection in `?code=`; action block under the details header with requirement links; read-only `/outpost/$outpostId/troop`; list endpoints carry the per-entry cost and requirement (`GET /technology?city_id=`). See [Implementation notes](#implementation-notes).

## Summary

The four catalogues (bâtiments, technologies, unités, défenses) are long lists of big square pictures with only a name and a level. The player has to open each entry to learn what it costs, whether it can be built, and why not. This slice turns each catalogue into a **grouped card grid** that can be scanned at a glance, and keeps the **fixed right details panel** (`LayoutPage`, `apps/web/src/ui/layout/page.tsx`) for the selected entry's details and actions ([`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md), « Catalogues »).

- **One shared card** (`CatalogueCard`): picture, name, level or count, **next cost and time** (plastic, mushroom, plasma, water when non-zero), and **one state badge**: upgradeable, missing requirement (which one), not enough resources (and when it will be affordable), in progress, queued, queue full, capped.
- **Groups** per catalogue: technology branches (Fondations / Arsenal / Économie / Renseignement, already in `technology/branch.ts`), building **families** (new constant), troop **roles**, defenses **common vs faction**.
- **Selection in the URL** (`?code=`), **keyboard navigation**, a **« Masquer les verrouillés »** filter, and a read-only troop grid for **outposts**.
- **No N+1**: list endpoints gain the per-entry cost and requirement the cards need, so one list request per catalogue is enough.

**Depends on**: [`007`](../007-buildings-upgrade-queue/spec.md) (building queue), [`008`](../008-technology-research/spec.md) (research queue), [`009`](../009-troops-stationary/spec.md) / [`028`](../028-command-center-shelter/spec.md) (recruitment queue), [`014`](../014-requirements-pricing/spec.md) (requirements and pricing), [`019`](../019-web-shell-routing/spec.md) (routes), [`027`](../027-military-economy-technologies/spec.md) (branch grouping, `List` `groups` prop), [`029`](../029-city-defenses/spec.md) (defenses, Enceinte, capacity), [`035`](../035-faction-exchange/spec.md) (water, reserved carriers), [`036`](../036-faction-symbiosis/spec.md) / [`037`](../037-faction-bastion-order/spec.md) / [`039`](../039-confederation-identity/spec.md) (faction defenses). Lands after `040` (16 px body text, 12–14 px secondary, contrast) and `041` (activity in the left column, compact header resources).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Layout** | Grid on the left, **fixed details panel on the right** (kept from today). |
| **Card content** | Picture, name, level / count, next cost + time preview, one state badge. |
| **Grouping** | Technologies by branch; buildings by family; troops by role; defenses common vs faction. |
| **Target screen** | 1920 × 1080 desktop only. Grid sized for **4 columns** with the details panel open. |
| **Selection** | Synced with the URL search param `code`. |
| **Data** | One list request per catalogue (plus the city and the lists already cached for requirements). List endpoints are extended; no per-card request. |
| **Details content** | Unchanged except the action block (cost, requirement, button) moves right under the header. |

## Layout at 1920 × 1080

### Page grid

`LayoutPage` (`ui/layout/page.tsx`) changes from `minmax(0,1.2fr) minmax(18rem,0.8fr)` to a **fixed-width details panel**:

| Breakpoint | Columns |
| --- | --- |
| `xl` (≥ 1280 px) | `minmax(0,1fr) 28rem` (details 448 px) |
| below `xl` | unchanged (stacked list then details), no tuning |

The map page (slice [`044`](../044-world-map-revamp/spec.md)) does not use this layout any more, so the change only touches pages with a list + details.

### Width budget

| Part | Width |
| --- | --- |
| Screen | 1920 px |
| Left column (menu + activity, slice `041`) | 256 px |
| Right column (locations, slice `041`) | 224 px |
| Workspace content (slice `040`) | 1392 px |
| Details panel + gap | 448 + 12 px |
| **Grid area** (inside `p-2`) | **≈ 916 px** |

Grid: `grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr))`, gap `0.5rem` → **3 columns of ≈ 300 px** at 1920 px with the shell widths of `040` / `041`. Wider windows get 4 columns; narrower ones fall back to 2 automatically.

### Card anatomy (≈ 300 × 128 px)

```
┌─────────────────────────────────────────┐
│ ┌──────┐  Centre de commandement        │  name: 16 px, 2 lines max
│ │ img  │  Niv. 4                         │  level / count: 14 px
│ │ 72px │  [ Améliorable ]                │  state badge: 12–14 px
│ └──────┘                                 │
│ ▸ niv. 5   ▣ 12,4k  ◍ 9,3k  ⚡ 120  ⏱ 14 min │  cost row: 13 px, mono digits
└─────────────────────────────────────────┘
```

| Element | Rule |
| --- | --- |
| Picture | 72 × 72 px square on the left (`object-cover`, lazy), from the existing `*ImageSrc` helpers (`building/image.ts`, `technology/image.ts`, `troop/image.ts`, `defense/image.ts`). Placeholders stay until the artwork slice. |
| Name | 16 px (`text-base`), `line-clamp-2`. |
| Level / count | Buildings and technologies « Niv. N »; troops and defenses « × N ». Troops with reserved carriers add « dont N réservés » (12 px, slice 035). |
| Cost row | Target level label (« ▸ niv. N+1 », troops and defenses « ▸ × 1 »), then one chip per non-zero resource (plastic, mushroom, plasma, water) and the duration. A chip the city cannot pay is red (same rule as `modules/cost/index.tsx`). Compact numbers (`12,4k`) with the exact value in `title`. |
| State badge | One badge (below), top-right of the text block. |
| Progress | The entry in progress shows a 4 px progress bar along the card's bottom edge (`useCountdownProgress`). |
| Selected | Amber border and background (today's `active` style), `aria-selected="true"`. |
| Dimmed | Cards whose state is `missing_requirement` or `capped` are shown at reduced emphasis (text `amber-dim`, picture `opacity-60`), never below the 040 contrast target for text. |

No scanlines, textures or hover translate on cards (slice `040`: plain panels for data).

## Shared card component

New folder `apps/web/src/ui/catalogue/`:

| File | Content |
| --- | --- |
| `card.tsx` | `CatalogueCard` — presentational: `{ code, name, image, amount: { kind: 'level' \| 'count', value }, extra?, cost?: { target_label, plastic, mushroom, plasma, water?, duration }, state: CatalogueCardState, progress?: { elapsed: number }, selected, onSelect }`. |
| `grid.tsx` | `CatalogueGrid` — `{ groups: { id, title, cards }[], toolbar?, queue? }`; renders the queue slot, toolbar, then one titled section per group. Owns keyboard navigation. |
| `state.ts` | `catalogueCardState(input)` pure function (below) + `CatalogueCardState` type. |
| `badge.tsx` | Badge rendering and French copy per state. |
| `filter.ts` | Filter state (« Masquer les verrouillés ») with `localStorage` persistence. |

`ui/list/index.tsx`, `ui/list/item/index.tsx`, `ui/list/item/level`, `ui/list/item/count` and the per-module `list/item` components are removed once the four catalogues use the new grid (they have no other consumers).

### Card state

`catalogueCardState` returns the **first** matching state in this order:

| # | State | Condition | Badge (FR) | Tone |
| --- | --- | --- | --- | --- |
| 1 | `in_progress` | This entry is the active upgrade / research / batch. | « En cours » + remaining time (« En cours · 4 min ») | amber |
| 2 | `queued` | Entry has rows in the waiting queue. | « En file » (« En file ×2 » when several) | amber outline |
| 3 | `missing_requirement` | A building or technology requirement is not met. | « Requiert : Laboratoire niv. 3 » — first unmet requirement, « +N » when more | red outline |
| 4 | `capped` | Buildings: city level cap reached (`building_levels_used ≥ maximum_building_levels`, capped buildings only, `building/layer.ts`). Defenses: free defense points < the defense's points (`defense/capacity.ts`). | « Plafond de niveaux atteint » / « Capacité de défense pleine » | grey |
| 5 | `queue_full` | Something else is active **and** the waiting queue is full (or has no slots: recruitment and fortification at level 0 of the command center / Enceinte). | « File pleine » | grey |
| 6 | `insufficient_resources` | City stock < cost for at least one resource. | « Ressources insuffisantes » + « dans 12 min » when every short resource has a positive rate and the cost fits the warehouse; « Entrepôt trop petit » when a cost exceeds `warehouses_capacity`. | red |
| 7 | `available` | Otherwise. | « Améliorable » (buildings), « Recherchable » (technologies), « Recrutable » (troops), « Constructible » (defenses) | green (terminal) |

- Requirements are evaluated with the existing `areRequirementsMet` logic (`modules/requirement/hook.ts`), refactored to also return the **list of unmet entries** so the badge can name the first one (« Requiert : <name> niv. N », names from `BuildingTranslations` / `TechnologyTranslations`).
- "Affordable in" = `max over short resources of (cost − stock) / earnings_per_second` from `GET /city/:city_id` (`earnings_per_second`), formatted with `formatTime`. Water has no warehouse cap.
- Outpost troop cards (read-only) have no cost row and no state badge except `in_progress` never applies; they only show the count.

## Grouping

Group order is fixed; empty groups are dropped; within a group the server order is kept (`BuildingService.sortBuildings`, `TroopService.sortTroops`, defense catalogue order).

### Technologies

Unchanged: `technology_branch` and `groupByTechnologyBranch` (`modules/technology/branch.ts`), labels `TechnologyBranchLabels` — « Fondations », « Arsenal », « Économie », « Renseignement ».

### Buildings — new family constant

New `apps/web/src/modules/building/family.ts`, same pattern as `technology/branch.ts`:

```ts
export enum BuildingFamily {
  PRODUCTION = 'production',
  STORAGE = 'storage',
  MILITARY = 'military',
  SPECIAL = 'special',
}

/** Every listed building; the Enceinte lives in the Défense tab (`isBuildingListed`). */
export const building_family: Record<Exclude<BuildingCode, BuildingCode.CITY_WALL>, BuildingFamily>
export const groupByBuildingFamily: <T extends { code: BuildingCode }>(items: T[]) => Array<{ family: BuildingFamily, items: T[] }>
```

| Family | Label (FR) | Buildings |
| --- | --- | --- |
| `production` | « Production » | `recycling_plant`, `mushroom_farm`, `solar_panel`, `central_inductor`, `water_purifier` |
| `storage` | « Stockage » | `plastic_warehouse`, `mushroom_warehouse`, `underground_shelter` |
| `military` | « Militaire » | `cloning_factory`, `command_center` |
| `special` | « Spécial » | `research_lab`, `trading_post` |

Labels in `BuildingFamilyLabels` (`building/translations.ts`). The `Record` type makes a new building code a compile error until it gets a family.

### Troops — by role

Uses the shared `troop_role` (already exported by `@eoneom/api-client`). New `apps/web/src/modules/troop/group.ts`:

| Group | Label (FR) | Roles |
| --- | --- | --- |
| `combat` | « Combat » | `combat` |
| `intel` | « Reconnaissance » | `scout` |
| `logistics` | « Logistique » | `carrier` |
| `expansion` | « Expansion et récolte » | `founder`, `cultivator`, `salvager` |

### Defenses — common vs faction

| Group | Label (FR) | Content |
| --- | --- | --- |
| `city_wall` | « Enceinte » | The Enceinte card (today's `DefenseCityWallCard`, restyled as a wide card spanning the full grid row: level, points used / queued / total bar, next upgrade cost, state badge from the building rules). |
| `common` | « Défenses communes » | Defenses without a faction owner. |
| `faction` | « Défenses de faction » | The player's faction defenses (`mycelium_wall`, `spore_cloud` / `field_artillery`, `barbed_wire` / `railgun`, `holo_decoy`). |

The client needs to know which defenses are faction-exclusive: `packages/api-client/src/index.ts` exports `defense_faction` from `@server-core/defense/constant/faction` (constant only, no API change). Defense cards keep the combat line from today's list (« ATK 12 / VIE 40 · 2 pts », 12 px) under the count.

## Queued and in-progress entries

| Catalogue | Queue panel (top of the grid) | Card |
| --- | --- | --- |
| Buildings | `QueuePanel` « Construction » (unchanged content, slice 007). | `in_progress` / `queued` badge; queued level from `projectUpgradeQueueLevels` (« En file → niv. 6 »). |
| Technologies | `QueuePanel` « Recherche » (player-wide, city name per row). | Same, with `projectResearchQueueLevels`. |
| Troops | `TroopListInProgress` (active batch + recruit queue, slice 028). | `in_progress` with remaining units (« En cours · 12 restants »); `queued` counts waiting batches of that code. |
| Defenses | `DefenseBuildQueue` (slice 029). | Same as troops. |

The queue panel collapses to one line when empty (« Aucune construction en cours · File 0/3 »). Cancel buttons stay in the queue panel, not on cards.

## Selection and URL

| Route | Search param | Value |
| --- | --- | --- |
| `/city/$cityId/base/building` | `code` | `BuildingCode` (listed buildings) |
| `/city/$cityId/base/technology` | `code` | `TechnologyCode` |
| `/city/$cityId/base/troop` | `code` | `TroopCode` (resolved to the troop row id through the list for `useGetTroop`) |
| `/city/$cityId/base/defense` | `code` | `DefenseCode` or `city_wall` |
| `/outpost/$outpostId/troop` (new) | `code` | `TroopCode` |

- Each route gets a `validateSearch` that drops unknown values (same pattern as `routes/exchange.tsx`).
- Selecting a card calls `navigate({ search: { code }, replace: true })` so card clicks do not fill the history; the page components (`building/page.tsx`, `technology/page.tsx`, `troop/page.tsx`, `defense/page.tsx`) read the selection from the route instead of `useState`.
- Switching city keeps the param (same code in the other city).
- Other pages may deep-link to an entry (e.g. a requirement name in the details panel links to `?code=` of that building or technology).

## Keyboard navigation

| Key | Effect |
| --- | --- |
| `Tab` | Enters the grid on the selected card (or the first card), then leaves the grid (roving `tabindex`). |
| `←` / `→` | Previous / next card in reading order, across groups. |
| `↑` / `↓` | Card above / below in the same column; at a group edge, the nearest column in the previous / next group. Column count read from the grid's computed `grid-template-columns`. |
| `Home` / `End` | First / last card. |
| `Enter` / `Space` | Select the focused card (updates `?code=`, details panel follows). |

Markup: each group is a `role="listbox"` with `aria-label` = group title, cards are `role="option"`; focus ring uses the 040 focus style. No action shortcuts (upgrade, recruit) in this slice.

## Filters

A toolbar above the groups:

| Control | Behavior |
| --- | --- |
| « Masquer les verrouillés » (checkbox) | Hides cards in state `missing_requirement`. A group with hidden cards shows « N verrouillé(s) masqué(s) » after its cards; a group whose cards are all hidden shows only its title and that line. The **selected** card is never hidden. |
| « Masquer les unités absentes » (troops, outposts only) | Hides troop cards with count 0. On by default on outposts. |
| Group collapse | Each group title is a button that collapses / expands the group. |

Filter and collapse states are per-viewer conveniences stored in `localStorage` (`eoneom.catalogue.<kind>.<setting>`), read and written inside `try/catch`, defaulting to "show everything" (except the outpost default above).

## Outposts

Outposts have no buildings, technologies or defenses, and cannot recruit. They get a **read-only troop grid**:

| Item | Spec |
| --- | --- |
| Route | `/outpost/$outpostId/troop` (new file `routes/outpost/$outpostId/troop.tsx`), `LayoutPage` grid + details. |
| Entry points | « Unités » link next to « Carte » / « Déplacement » on the outpost page (`modules/outpost/page.tsx`) and in the left menu when an outpost is the current location. |
| Data | `GET /outpost/:outpost_id/troop` (`useListOutpostTroops`). |
| Cards | Grouped by role; count only; no cost row; no badge. |
| Details | `TroopDetails` in a read-only mode (`readOnly` prop): picture, effect, description, characteristics; no `Cost`, `Requirement` or recruit form. |
| Garrison | The outpost's garrison strategy control (`GarrisonCombatStrategy`) moves above the grid, as on the city troop page. |

## Data and API (no N+1)

### What the cards need vs what lists return today

| Catalogue | List endpoint | Has cost? | Has requirement? | Change |
| --- | --- | --- | --- | --- |
| Buildings | `GET /city/:city_id/building` (`BuildingListQuery`) | No | No | **Add** `upgrade_cost` and `requirement` per entry. |
| Technologies | `GET /technology` (`TechnologyListQuery`, player-wide) | No (cost depends on the city's `research_lab`) | No | **Add** optional `city_id` query param; entries get `requirement` always and `research_cost` when `city_id` is given. |
| Troops | `GET /city/:city_id/troop`, `GET /outpost/:outpost_id/troop` (`TroopListQuery`) | Computed in the query (`costs`) but dropped by `troopListResponseMapper` | No | **Add** `cost` (per unit) and `requirement` per troop. |
| Defenses | `GET /city/:city_id/defense` (`DefenseListQuery`) | Yes (`cost`, per unit) | Yes | None. |
| City stock, rates, level cap | `GET /city/:city_id` | — | — | None (`plastic`…`water`, `earnings_per_second`, `warehouses_capacity`, `building_levels_used`, `maximum_building_levels`). |

Requirement evaluation reuses the building list of the city and the technology list (already fetched by `useRequirement`), so a catalogue page makes **at most four list requests** (its own list, building list, technology list, city), all shared through react-query caches. The details request (`GET …/:code`) still fires only for the selected entry.

### Shapes (api-client)

```ts
// packages/api-client/src/endpoints/building/list.ts
type BuildingListEntryBase = {
  id: string
  code: BuildingCode
  level: number
  /** Cost of level + 1 (same as `GET /city/:city_id/building/:code`). */
  upgrade_cost: { plastic: number, mushroom: number, plasma: number, duration: number }
  requirement: Requirement
}
export type BuildingListEntry =
  | (BuildingListEntryBase & { upgrade_at: number, upgrade_started_at: number })
  | BuildingListEntryBase

// packages/api-client/src/endpoints/technology/list.ts
export interface TechnologyListRequest { city_id?: string }
type TechnologyListEntryBase = {
  id: string
  code: TechnologyCode
  level: number
  /** Level-scaled requirement of level + 1 (`RequirementService.getTechnologyRequirement`). */
  requirement: Requirement
  /** Present when `city_id` is given: cost of level + 1 with that city's research lab. */
  research_cost?: { plastic: number, mushroom: number, plasma: number, duration: number }
}

// packages/api-client/src/endpoints/troop/list/shared.ts — each troop gains
cost: { plastic: number, mushroom: number, plasma: number, duration: number } // per unit
requirement: Requirement
```

- Costs are computed with the same inputs as the details queries: `architecture` level for buildings (already loaded by `BuildingListQuery`), the city's `research_lab` level for technologies (one extra `building.getLevel` when `city_id` is set), `cloning_factory` and `replication_catalyst` for troops (already loaded by `TroopListQuery`). The values must equal the details endpoints' values (tested).
- City ownership: `GET /technology?city_id=` of another player's city answers `city:not-owner` like the details query.
- Water: cost DTOs keep no `water` field, as in [`035`](../035-faction-exchange/spec.md) (nothing costs water). `CatalogueCard` accepts an optional `water` and renders the chip only when it is > 0, so a later water cost needs no card change.
- Web hooks: `useListTechnologies({ cityId })` with query key `['technologies', cityId]` (invalidations that use the `['technologies']` prefix keep working); building and troop hooks keep their keys.

## Details panel

Content components are unchanged (`building/details/index.tsx`, `technology/details/index.tsx`, `troop/details/index.tsx`, `defense/details/index.tsx`, `BuildingDetails` for the Enceinte), with two changes:

| Change | Reason |
| --- | --- |
| Action block — `Requirement`, `Cost`, then the action button (`BuildingDetailsUpgrade`, `TechnologyDetailsResearch`, `TroopDetailsRecruit`, defense build form) — moves directly under the header, before metadata and description. | The action must be visible without scrolling at 1080 px. |
| Requirement names link to `?code=` of the required building / technology. | Navigation from a blocked card to what unblocks it. |

## Testing

| Area | Cases |
| --- | --- |
| `catalogueCardState` | Order of states (in progress beats queued beats missing requirement…); first unmet requirement named, « +N » count; building level cap only for capped buildings; defense capacity; queue full vs free slot vs no queue (level 0); insufficient resources with "affordable in" time, zero rate → no time, cost above warehouse → « Entrepôt trop petit »; water ignored when 0. |
| Grouping | `building_family` covers every listed building (type + test like `branch.test.ts`); `groupByBuildingFamily`, troop role groups and defense common / faction groups keep input order and drop empty groups. |
| `CatalogueCard` | Renders level vs count, cost chips (plasma / water only when > 0), red chip when short, badge copy, progress bar, selected state, outpost variant without cost. |
| Grid keyboard | Arrows across a 4-column grid and across group boundaries, Home / End, Enter selects, roving tabindex. |
| URL sync | `?code=` selects on load; click updates with `replace`; unknown code ignored; troop code resolves to the row id. |
| Filters | « Masquer les verrouillés » hides locked cards, keeps the selected one, shows the hidden count; `localStorage` failure falls back to defaults. |
| Pages | Building, technology, troop, defense pages render groups and the queue panel; outpost troop route renders read-only cards and details. |
| Server | `BuildingListQuery`, `TechnologyListQuery` (with and without `city_id`, not-owner), `TroopListQuery` / mapper: new fields equal the details queries' cost and requirement; handler specs for the response shapes. |
| Layout | `LayoutPage` uses the fixed `28rem` details column at `xl`. |

## Out of scope

- Action shortcuts from cards (upgrade / recruit without opening details).
- Sorting or searching within a catalogue.
- New artwork (artwork slice); placeholders in the `image.ts` files stay.
- Comparing levels (current vs next effects) on the card; effects stay in the details panel.
- Tablet / phone layouts.
- Changing which level the details and the card price (both price `level + 1`, even when the entry is queued).

## Assumptions (confirm on review)

| # | Assumption |
| --- | --- |
| 1 | Widths follow `040` / `041` (left 256 px, right 224 px, workspace content 1392 px), giving 3 columns at 1920 px. Cards never shrink below 15 rem; 4 columns only on wider windows. |
| 2 | Details panel fixed at **28 rem** (448 px) on `xl`. |
| 3 | Building families: solar panel under « Production »; research lab and trading post under « Spécial »; the Enceinte stays in the Défense tab. |
| 4 | Troop role groups merge founder, cultivator and salvager into « Expansion et récolte ». |
| 5 | Queued entries are priced at `level + 1` (like the details panel), not at the level after the queue. |
| 6 | The « dans 12 min » affordability hint uses the city's current `earnings_per_second` and ignores queued payments. |
| 7 | Outposts get a dedicated `/outpost/$outpostId/troop` route rather than a section in the outpost page. |
| 8 | Filters and collapse states are per-viewer and per-browser (`localStorage`), not saved on the server. |

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`007`](../007-buildings-upgrade-queue/spec.md) | Building list entries carry `upgrade_cost` and `requirement`; building families in the web list. |
| [`008`](../008-technology-research/spec.md) | `GET /technology?city_id=`, `research_cost` and `requirement` per entry. |
| [`009`](../009-troops-stationary/spec.md) | Troop list entries carry `cost` and `requirement`; outpost troop page. |
| [`019`](../019-web-shell-routing/spec.md) | `?code=` on catalogue routes; `/outpost/$outpostId/troop`; `LayoutPage` fixed details column. |
| [`027`](../027-military-economy-technologies/spec.md) | `List` `groups` replaced by `CatalogueGrid`. |
| [`029`](../029-city-defenses/spec.md) | Defense groups; Enceinte card in the grid; `defense_faction` exported by the api-client. |

## Implementation notes

- **Server**: `BuildingListQuery` prices every entry with the same `PricingService.getBuildingLevelCost` inputs as `BuildingGetQuery` (architecture level already loaded) and adds `RequirementService.getBuildingRequirement`; `upgrade_started_at` reuses that cost. `TechnologyListQuery` takes an optional `city_id`: it checks ownership first (`city:not-owner`), reads the research lab level in the same `Promise.all`, and every entry gets the level-scaled requirement (`research_cost` only with `city_id`). `TroopListQuery` adds `requirements` next to the existing `costs`; the troop mapper copies both. The handler reads `city_id` from the query string (empty → absent). Tests compare the list values with the details queries run on the same mocks.
- **Building list mapper**: it used to drop `duration_seconds`, `start_at` and `finish_at` from `upgrade_queue` rows (the web queue timing read `undefined`); it now copies them, since the mapper was rewritten anyway.
- **api-client**: `technology.list(token, { city_id? })` sends `?city_id=` only when given; `defense_faction` is exported. `core/defense/constant/faction.ts` now imports its codes with relative paths, like the other constants the api-client re-exports (the `#core` alias does not resolve in the api-client build).
- **Card state**: `catalogueCardState` follows the table order. Inputs are already resolved by the lists: `level_cap` is passed only for capped buildings (`isLevelCappedBuilding`), `queue` is `{ active, length, limit }` (limit 0 = no slot, so a running batch without command center / Enceinte is « File pleine »), `city` is optional (no resource check until `GET /city` is loaded). « dans … » is the max over short resources of `ceil((cost − stock) / rate)`; any short resource without production, or a plastic / mushroom cost above its warehouse, gives no time (the latter shows « Entrepôt trop petit » after « Ressources insuffisantes »). Queued buildings and technologies show the level the last waiting row reaches (« En file ×2 → niv. 7 »); troops and defenses count their waiting batches.
- **Formatting**: durations on cards and badges use a new compact `formatCompactDuration` (« 2 h 05 », « 14 min », « 40 s ») to match the spec's examples, including « dans 12 min » (the exact `formatTime` value is in the chip `title`). Numbers use `transformDecimals` with the dot decimals kept by [`041`](../041-app-shell-navigation/spec.md) (« 12.48k », not « 12,4k »). Type tokens: name `text-body`, level / count `text-meta`, badge and cost row `text-caption` (the 13 px of the anatomy is not a token). The badge sits under the level, as in the anatomy drawing.
- **Countdown**: queue panels keep the per-frame `useCountdownProgress`; the in-progress card uses `useCatalogueCountdown` (`ui/catalogue/countdown.ts`, once a second) so the grid does not re-render every animation frame. The building and research queue panels moved to `building/list/queue.tsx` / `technology/list/queue.tsx` for the same reason. `QueuePanel` renders one line (« Aucune construction en cours · File 0/3 ») when nothing runs or waits.
- **Grid**: `CatalogueGrid` takes `scope`, `groups`, `selectedCode`, `onSelect`, `queue`, `toolbar`, `absentFilterDefault` (adds « Masquer les unités absentes ») and `lockedFilter` (off on the outpost grid, which has no locked card). Group titles are buttons with `aria-expanded` and the total card count. ↓ from a card above a partial last row lands on that row's last card before leaving the group. Columns come from `readGridColumnCount` (computed `grid-template-columns`, 1 when unreadable). Settings keys: `eoneom.catalogue.<building|technology|troop|defense|outpost_troop>.<hide_locked|hide_absent|collapsed>`, JSON values validated on read, every access in `try/catch`.
- **Requirements**: `modules/requirement/hook.ts` exports `listUnmetRequirements`, `unmetRequirementName` and `useRequirementEvaluator(cityId)`; `useRequirement` is built on it. Requirement lists use `useListTechnologies({ cityId })` (`['technologies', cityId]`), so a catalogue page makes one technology request shared with the technology catalogue; movement creation keeps the city-less `['technologies']` key. Requirement names link through `RequirementLink` (`city_wall` → Défense tab); `RequirementTechnology` now takes `cityId`.
- **Details panel**: the action block is `LayoutDetailsAction` (`ui/layout/details/action.tsx`, `<section aria-label="Action">`) between two `LayoutDetailsContent` blocks, so the cost and requirement lists keep their own styles (`LayoutDetailsContent` styles every nested `ul`). The building energy warning moves with the « Construire » button; defense stats and counts follow the action block. `TroopDetails` takes `readOnly` (no `cityId`): picture, effect, « Stationnées ici », description; the city troop GET carries no characteristics to show.
- **Pages and routes**: page components take `selectedCode` / `onSelect`; routes validate with `pickSearchValue` (`helpers/search.ts`) and navigate with `replace`. The building route accepts listed buildings only; the defense route accepts `city_wall` and every `DefenseCode`. `TroopPage` / `OutpostTroopPage` resolve the code to the row id through the list. `DefenseCityWallCard` became `DefenseCityWallCapacity` (the points line and bar inside the Enceinte card).
- **Layout**: `LayoutPage` is `grid-cols-1` (stacked) below `xl` and `xl:grid-cols-[minmax(0,1fr)_28rem]` from `xl`; the former `lg` side-by-side split is gone, per the breakpoint table.
- **Requests**: building page — building list, technology list, city; technology page — technology list, building list, city; troop and defense pages — their list plus those three. The details request fires for the selected entry only.
- **Removed**: `ui/list/` (`index.tsx`, `item`, `item/level`, `item/count`), `building/list/item`, `technology/list/item`, `troop/list/item`.

## Follow-ups

- **Visual pass**: not checked in a browser at 1920 × 1080 (running the app needs a signed-in player); card height, the 3-column fit and badge wrapping are verified only through classes and the built CSS.
- **City switch**: the location column links to the city dashboard, so `?code=` survives only navigations that stay on the catalogue route; keeping the sub-route and the param when switching city needs the location links of [`041`](../041-app-shell-navigation/spec.md) to follow the current page.
- **Decimal separator**: cards inherit the client-wide dot decimals (041 follow-up).
- **Details list styles**: `LayoutDetailsContent` still forces `list-disc` / `pl-4` on nested lists such as the defense stats grid (pre-existing); building metadata sections add a top border right under the action block's bottom border.

## Evidence index

| Area | Paths |
| --- | --- |
| Shared catalogue UI | `apps/web/src/ui/catalogue/{card.tsx,grid.tsx,state.ts,badge.tsx,filter.ts,navigation.ts,countdown.ts,city.ts}`, tests `ui/catalogue/{state.test.ts,card.test.tsx,grid.test.tsx,navigation.test.ts,url.test.tsx,pages.test.tsx}`; deleted `apps/web/src/ui/list/` |
| Layout and shared UI | `apps/web/src/ui/layout/page.tsx` (+ `page.test.tsx`), `ui/layout/details/action.tsx`, `ui/queue-panel.tsx`, `ui/typography-tokens.test.tsx`, `ui/nav/menu/index.tsx` (+ test, « Unités »), `apps/web/src/helpers/transform.ts` (`formatCompactDuration`), `helpers/search.ts` |
| Buildings (web) | `apps/web/src/modules/building/{family.ts,family.test.ts,card.ts,page.tsx,translations.ts}`, `building/list/{index.tsx,queue.tsx}`, `building/details/index.tsx`, `routes/city/$cityId/base/building.tsx`; deleted `building/list/item` |
| Technologies (web) | `apps/web/src/modules/technology/{page.tsx,hooks.ts}`, `technology/list/{index.tsx,queue.tsx}`, `technology/details/{index.tsx,research/index.tsx}`, `routes/city/$cityId/base/technology.tsx`; deleted `technology/list/item` |
| Troops (web) | `apps/web/src/modules/troop/{group.ts,group.test.ts,page.tsx}`, `troop/list/index.tsx`, `troop/details/index.tsx`, `routes/city/$cityId/base/troop.tsx`, `routes/outpost/$outpostId/troop.tsx`, `modules/outpost/page.tsx`; deleted `troop/list/item` |
| Defenses (web) | `apps/web/src/modules/defense/{group.ts,group.test.ts,page.tsx}`, `defense/list/index.tsx`, `defense/city-wall/index.tsx`, `defense/details/index.tsx`, `routes/city/$cityId/base/defense.tsx` |
| Requirements (web) | `apps/web/src/modules/requirement/{hook.ts,hook.test.ts,link.tsx,index.tsx}`, `requirement/building/index.tsx`, `requirement/technology/index.tsx` |
| Routing | `apps/web/src/routeTree.gen.ts` |
| Server | `apps/server/src/app/query/building/list.ts` (+ spec), `app/query/technology/list.ts` (+ spec), `app/query/troop/list.ts` (+ spec), `web/handler/building/list.mapper.ts` (+ `list.spec.ts`), `web/handler/technology/list.ts`, `list.mapper.ts` (+ `list.spec.ts`), `web/handler/troop/list/mapper.ts` (+ `city.spec.ts`, `outpost.spec.ts`), `core/defense/constant/faction.ts` |
| API client | `packages/api-client/src/endpoints/building/list.ts`, `technology/{list,index}.ts`, `troop/list/shared.ts`, `packages/api-client/src/index.ts` (`defense_faction`) |
| Specs | `specs/007-buildings-upgrade-queue/spec.md`, `008-technology-research`, `009-troops-stationary`, `019-web-shell-routing`, `027-military-economy-technologies`, `029-city-defenses`, `specs/README.md` |
