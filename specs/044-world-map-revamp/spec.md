# Slice 044 — World map revamp

**Status**: Planned.

## Summary

The world map today is a 7 × 7 window (`CITY_MAP_INITIAL_HALF_EXTENT` 3, zoom capped at 19 × 19 by the server's `MAX_VIEWPORT_SIDE` 20) squeezed into the left part of `LayoutPage`, with three-colour markers, no movements and a side panel that embeds the whole movement form. The player finds it "not useful". This slice rebuilds it around the six map features of [`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md) (« Map »):

1. **Full-workspace view + zoom** from 7 to 41 cells tall, a **minimap** and **« Aller à »** coordinates.
2. **Readable markers** coloured by relation (mine / ally / same faction / enemy / system), `[TAG]` and name on hover, size hint by level.
3. **Movements on the map**: own and incoming movements drawn as arrows with ETA; clicking an arrow shows its details.
4. **Act from the map**: clicking a cell opens an action menu in place (attack, spy, transport, reinforce, explore, settle); an action opens the **send wizard (045)** prefilled with that destination.
5. **Terrain bonus overlay**: explored cells coloured by plastic / mushroom coefficient.
6. **Targets & threats overlay**: attackable system bases and enemy outposts near the player, enemy cities as threats, with last spy report age and estimated strength; fog when nothing is known.

To make this fast, the map stops paging terrain through `GET /world/cells`: the static terrain is downloaded once, exploration once, and markers, movements and intel come from small dedicated endpoints.

**Depends on**: [`005`](../005-world-grid-visibility/spec.md) (grid, exploration, coefficients), [`010`](../010-troop-movement-combat/spec.md) (movements), [`011`](../011-outposts/spec.md) (outposts, settle), [`016`](../016-system-controlled-players/spec.md) / [`025`](../025-lawless-human-faction/spec.md) (system players), [`024`](../024-player-combat-pvp/spec.md) (attack targets), [`028`](../028-command-center-shelter/spec.md) (movement cap), [`030`](../030-intelligence/spec.md) (detection, spy reports, `report_spy`), [`033`](../033-alliances/spec.md) (alliance tags, reinforce), [`035`](../035-faction-exchange/spec.md) (exchange convoys), `045` (« send wizard (045) »). Lands after `040` (typography, contrast) and `041` (activity in the left column).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **View** | The map fills the workspace (between the left menu column and the right locations column). No `LayoutPage` split; details open in a drawer over the map. |
| **Zoom** | Discrete levels from **7** to **41 cells tall**; width follows the stage aspect ratio. |
| **Navigation aids** | Minimap of the whole 100 × 100 world; « Aller à » X / Y; « Recentrer » on the current location; `?x=&y=&zoom=` in the URL. |
| **Markers** | Coloured by **relation** computed by the server: `mine`, `ally`, `faction`, `enemy`, `system`. Size hint from the city's total building levels. `[TAG] name` on hover. |
| **Movements** | Own movements always; incoming attacks only as far as the player's **Détection** allows ([`030`](../030-intelligence/spec.md)). |
| **Actions** | In-place cell menu, gated by the same rules the server enforces; actions open the send wizard (045) with the destination (and action) prefilled. |
| **Overlays** | « Bonus de terrain » (explored cells only) and « Cibles et menaces » (nearby targets with spy-report age and estimated strength), each a toggle. |
| **Renderer** | Konva stays (`konva` 10.2.5 / `react-konva` 19.2.3), reorganised into layers; terrain drawn in one shape. |

## Layout at 1920 × 1080

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER  location · ▣ 12,4k ◍ 9,8k ✦ 420 💧 35 ⚡ 82 %                          (compact, slice 041)   │
├────────────┬──────────────────────────────────────────────────────────────────────────────┬───────────┤
│ MENU       │ [−] ●●●○○○ [+]  41×67   Aller à X [ 42 ] Y [ 57 ] [Aller]  [Recentrer]        │ EMPLACE-  │
│ Base       │ Calques : [✓] Mouvements  [ ] Bonus de terrain ▾Plastique  [ ] Cibles et menaces│ MENTS     │
│ Carte  ◄   ├──────────────────────────────────────────────────────────────────┬───────────┤           │
│ Mouvements │ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │ DRAWER    │ ▸ Core II │
│ Rapports   │ · · · ▲ · · · · · · · · · · · · · · · · · · · · · · · · · · · · │ (26 rem)  │ ▸ Avant-  │
│ ...        │ · · · · · ●[ABC] Rivet · · · · · · · · · · · · · · ◆ · · · · · · │ Cellule   │   poste   │
│            │ · · · · · · · ╲ · · · · · · · · · · · · · · · · · · · · · · · · │ (42, 57)  │   (40,51) │
│ ACTIVITÉ   │ · · · · · · · · ╲ 12:04 · · · · · · · · ■ · · · · · · · · · · · │ Plaine    │           │
│ (041)      │ · · · · · · · · · ➤ ◉ Core II · · · · · · · · · · · · · · · · · │ ▣ 1,42    │           │
│ Constr. 4m │ · · · · · · · · · · · · · · · ┌────────────┐ · · · · · · · · · │ ◍ 0,88    │           │
│ Rech.  12m │ · · · · · · · · · · · · · · · │ Attaquer   │ · · · · · · · · · │ Cible :   │           │
│            │ · · ┌────────┐ · · · · · · · · │ Espionner  │ ← cell menu      │ [SYS]     │           │
│            │ · · │MINIMAP │ · · · · · · · · │ Détails    │ · · · · ┌──────┐ │ Harrow    │           │
│            │ · · │100×100 │ · · · · · · · · └────────────┘ · · · · │LÉGEN-│ │ Rapport : │           │
│            │ · · │ [▭]    │ · · · · · · · · · · · · · · · · · · · · │ DE   │ │ il y a 3h │           │
│            │ · · └────────┘ · · · · · · · · · · · · · · · · · · · · └──────┘ │ [Attaquer]│           │
├────────────┴──────────────────────────────────────────────────────────────────┴───────────┴───────────┤
│ CHAT (collapsed bar)                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Area | Size at 1920 × 1080 | Content |
| --- | --- | --- |
| Toolbar | 2 rows, ≈ 80 px | Zoom steps, current size (« 41×67 »), « Aller à », « Recentrer », layer toggles. |
| Stage | ≈ 1480 × 860 px (≈ 1060 px wide when the drawer is open) | Konva stage. |
| Minimap | 200 × 200 px, bottom-left, 8 px inset | 2 px per cell. Collapsible (« Masquer la minicarte »). |
| Legend | bottom-right, collapsible, closed by default after first visit | Relations, terrain, active overlay scale. |
| Drawer | 26 rem (416 px), right edge of the stage, closed by default | Cell / movement / target details and actions. Closing (`Esc`, « × ») keeps the selection outline off. |

The map route no longer wraps its content in `LayoutPage`; `MapPage` renders a full-height `map-root` with the stage and the drawer.

## 1. View, zoom and navigation

### Zoom levels

| Level | Rows (cells tall) | Columns at 1480 × 860 (aspect ≈ 1.72) | Cell size |
| --- | --- | --- | --- |
| 1 | 7 | 12 | ≈ 123 px |
| 2 | 11 | 19 | ≈ 78 px |
| 3 | 15 | 26 | ≈ 57 px |
| 4 | 21 | 36 | ≈ 41 px |
| 5 | 29 | 50 | ≈ 30 px |
| 6 | 41 | 71 | ≈ 21 px |

- New constant `MAP_ZOOM_ROWS = [7, 11, 15, 21, 29, 41]` in `modules/map/viewport.ts`, replacing `MAP_MIN_HALF_EXTENT` / `MAP_MAX_HALF_EXTENT` / `clampHalfExtent`. Columns = `ceil(rows × stage_width / stage_height)`, so cells stay square. The world edges clamp the window (no space outside 1–100).
- Default level on open and on « Recentrer »: **level 3** (15 rows). `CITY_MAP_INITIAL_HALF_EXTENT` is removed from the web; the server's `INITIAL_VIEWPORT_HALF_EXTENT` (AI snapshot) is unrelated and stays.
- Wheel: one level per notch, anchored on the pointer cell (`centerAfterZoom` reused). Buttons `−` / `+` and keys `-` / `+` zoom around the centre.
- Pan: drag (continuous pixel pan, see Performance), arrow keys (1 cell, `Shift` 5 cells).
- Labels: city names are drawn on the stage only from level 1 to 3 (cell ≥ 40 px); below that, names show on hover only.

### URL

`/city/$cityId/world/map` and `/outpost/$outpostId/world/map` accept `?x=&y=&zoom=&layers=` (`layers` = comma list of `movements`, `terrain`, `targets`; `terrain` may carry the metric: `terrain:mushroom`). The current `validateSearch` (`routes/city/$cityId/world/map.tsx`) gains `zoom` and `layers`; the outpost route gets the same. Panning updates `x`, `y` with `replace: true` after the pan ends (no history entry per drag). Alliance links that already pass `x` / `y` (slice 033) keep working.

### « Aller à »

- Two number inputs (1–100) and « Aller » (`Enter` submits). Out-of-range values show « Coordonnées entre 1 et 100 ».
- A select « Mes emplacements » next to it lists the player's cities and outposts (from `useListCities` / `useListOutposts`) and jumps to the chosen one.
- After a jump the target cell is selected and its outline pulses once.

### Minimap

| Item | Spec |
| --- | --- |
| Rendering | Plain 2D `<canvas>` 200 × 200 (not Konva), redrawn when its inputs change. |
| Terrain | From `GET /world/terrain` (below), one pixel block per cell, dimmed palette. |
| Fog | Unexplored cells darkened (from `GET /world/exploration`). |
| Dots | Own cities / outposts (amber), allied (green), incoming attack targets (red ring). Other settlements are not drawn (too dense, and the main map shows them). |
| Viewport | Rectangle of the visible window; click or drag on the minimap recentres the main map. |

## 2. Readable markers

### Relation

Computed **on the server** for each marker, from the viewer's point of view, first match wins:

| Relation | Rule | Colour token (040 palette) | Legend (FR) |
| --- | --- | --- | --- |
| `mine` | Owner is the viewer. | amber | « Vos emplacements » |
| `ally` | Owner is in the viewer's alliance ([`033`](../033-alliances/spec.md), same `alliance_id`). | green | « Alliance » |
| `system` | Owner is `system_controlled` ([`016`](../016-system-controlled-players/spec.md)). | violet | « Système » |
| `faction` | Same faction, not allied. | teal | « Même faction » |
| `enemy` | Another faction (human). | red | « Factions ennemies » |

`getSettlementOwnership` and `settlementMarkerStyles` (`modules/map/helper.ts`) are replaced by a `relation` → style table. The legend overlay (`legend-overlay.tsx`) moves out of Konva into an HTML panel (crisper text at 16 px / 13 px).

### Shapes and size hint

| Settlement | Shape | Size |
| --- | --- | --- |
| City | Filled circle, relation colour, darker stroke | `size` 1–4 → radius 28 / 34 / 40 / 46 % of the cell (minimum 5 px) |
| Permanent outpost | Diamond | 30 % of the cell |
| Temporary outpost | Hollow diamond | 26 % of the cell |
| Current location | Extra outer ring (amber) | — |

City `size` buckets from the city's **total building levels** (all buildings, Enceinte included): 1 = 0–19, 2 = 20–49, 3 = 50–79, 4 = ≥ 80. The exact total is never sent.

A city and an outpost on the same cell are offset as today (`markers.tsx`).

### Hover card

Hovering a marker shows an HTML tooltip (not a Konva `Text`): `[TAG] Name` (city name or « Avant-poste » / « Camp temporaire »), owner `[TAG] Joueur`, faction name, relation, coordinates, and the spy-report age when the targets overlay is on. The cell tooltip (« (x, y) ») is merged into it; an empty cell shows coordinates, terrain and, when explored, its coefficients.

## 3. Movements on the map

### Sources

| Layer | Source | Visible |
| --- | --- | --- |
| Own movements | `GET /troop/movement` (`useListMovements`), every action including exchange convoys and return trips | Always (toggle « Mouvements ») |
| Incoming attacks | `GET /troop/movement/incoming` (`useListIncomingMovements`) | Only what Détection allows (below) |

Both lists already refresh through the existing WS invalidations (`troop:movement-finished`, `movement:incoming`, `battle:finished`, `technology:research-finished`).

### Drawing

| Action | Style |
| --- | --- |
| `attack` | Red solid arrow |
| `spy` | Violet dotted arrow |
| `transport` | Cyan solid arrow |
| `reinforce` | Green solid arrow |
| `explore` | Light grey dotted arrow |
| `base` (incl. return trips) | Grey dashed arrow |
| `exchange` | Thin amber arrow |
| Incoming attack (detection ≥ 2) | Thick red arrow with a pulsing head |
| Incoming attack (detection 1) | No arrow: pulsing red ring on the target cell |

- Straight segment origin → destination (cell centres), arrowhead at the destination, a **dot at the current position** `lerp(origin, destination, (now − departure_at) / (arrive_at − departure_at))`.
- **ETA label** next to the dot: countdown (« 12:04 », `formatTime`), 13 px; at zoom levels 5–6 only on hover or for the selected movement.
- Off-screen ends are clipped by the stage; a movement whose segment crosses the window is drawn.
- Several movements on the same segment are offset by 4 px each so they stay clickable.
- The movement layer redraws once per second (ETA, dot position); nothing else redraws on that timer.

### Detection rules (incoming)

| `detection` | Map shows |
| --- | --- |
| 0 | Nothing (the list is empty, slice 030). |
| 1 | Target ring + ETA on the targeted location. |
| ≥ 2 | Full arrow from the attack's **origin**, with departure time, plus attacker name in the details. |
| 3 / ≥ 4 | Same arrow; size / composition in the details, as in the « Attaques entrantes » list. |

This needs `origin` and `departure_at` on incoming attacks from detection 2 (API below), a new reveal level relative to [`030`](../030-intelligence/spec.md) (see Assumptions).

### Click → details

Hit test: pointer within 6 px of a segment or on its dot (computed in the stage handler, not by per-shape listeners). The drawer then shows:

| Movement | Drawer content |
| --- | --- |
| Own | `MovementDetails` (`modules/movement/details/index.tsx`) fed by `GET /troop/movement/:movement_id`, plus « Ouvrir dans Mouvements » linking to `/city/$cityId/world/movement/$movementId`. |
| Incoming | `IncomingMovementItem` (`modules/movement/incoming/item.tsx`): target, countdown, attacker / size / composition per detection. |

## 4. Act from the map

### Cell menu

Clicking a cell selects it and opens a small HTML menu anchored next to the cell (flips to stay inside the stage). It lists the allowed actions, then « Détails » (opens the drawer). `Esc` or a click elsewhere closes it. Right-click does nothing special.

### Gating (client side, mirrors the server)

The menu offers only the actions the server would accept for that destination, from what the client knows: the cell's exploration state (`/world/exploration`), the marker on it (`/world/markers`, `relation`), the viewer's `espionage` level (technology list), the movement cap (`GET /troop/movement/capacity`) and the outpost cap. Troop composition is chosen in the wizard, where the remaining rules (scouts only, combat only, carriers, capacity) apply.

| Destination | Actions (FR label → `MovementAction`) | Server rule mirrored |
| --- | --- | --- |
| Unexplored cell | « Explorer » → `explore` | Explore any cell. |
| Explored, empty | « Établir un avant-poste » → `base` (settle) | `base` on an empty cell creates a temporary outpost ([`011`](../011-outposts/spec.md)); disabled with « Limite d'avant-postes atteinte » at `outpost:limit-reached` cap. |
| Own city | « Transporter » → `transport`, « Stationner » → `base` | Transport deposits only into own locations (`resolveOwnedDepositTarget`). |
| Own outpost | « Transporter », « Stationner », « Fonder une ville » (link to the outpost page settle form, `modules/outpost/settle`) | Settle needs a founder on the outpost (slice 011). |
| Allied city (`ally`) | « Renforcer » → `reinforce` | `alliance:invalid-reinforce-target` otherwise ([`033`](../033-alliances/spec.md)). |
| Same faction (`faction`), not allied | — (« Aucune action possible sur un emplacement de votre faction ») | `combat:same-faction-attack`. |
| Enemy or system city / outpost | « Attaquer » → `attack`, « Espionner » → `spy` (only with `espionage` ≥ 1, else shown disabled « Recherchez Espionnage ») | [`024`](../024-player-combat-pvp/spec.md), [`030`](../030-intelligence/spec.md). |
| Explored cell without settlement | « Attaquer » is **not** offered (field stacks are not on the map). | — |

- When the movement cap is reached, every movement action is disabled with « Mouvements X / Y — limite atteinte » ([`028`](../028-command-center-shelter/spec.md)).
- The origin is the current location (city or outpost of the route). The server stays the authority; its errors are shown with the existing `translateError` copy.

### Hand-off to the send wizard (045)

Choosing an action opens the **send wizard (045)** with:

```ts
{ origin: { kind: 'city' | 'outpost', id: string }, destination: { x: number, y: number }, action?: MovementAction }
```

- The wizard opens **inside the map drawer**, at its step 2 (action + troops) since the destination is known; « Retour » goes to step 1 with the destination filled. After « Envoyer », the drawer shows the new movement and its arrow appears.
- The wizard component, its route and its search params belong to slice 045. This slice only requires that the wizard can be mounted in a container (drawer) and accepts the prefill above. If 045 ships a route only, the map navigates to it with the same values as search params.
- The compact `MovementCreate` embedded in `map/details/index.tsx` today is removed.
- **Contract shipped by [`045`](../045-movements-revamp/spec.md)**: mount `MovementSendWizard` (`modules/movement/send/index.tsx`) with `origin`, `state = parseMovementSendSearch({ step: 'ordre', x, y, action })` (`send/search.ts`) held in a `useState`, `onStateChange={setState}`, `onSent(movement_id)`, `onCancel` and `layout="drawer"` (recap below the steps; no origin select without `onOriginChange`). Route fallback: `…/world/movement/send?x=&y=&action=`. Movement arrows and toasts link to `…/world/movement/$movementId`; the drawer reuses `MovementDetails` (`modules/movement/details/index.tsx`, optional `mapPath`) and `IncomingMovementDetails` (`modules/movement/incoming/details.tsx`). `WORLD_SIZE` and `GET /city` coordinates already ship with 045; 045 added no `started_at` column, so 044 adds its migration next to `00022_movement_return`.

## 5. Terrain bonus overlay

| Item | Spec |
| --- | --- |
| Toggle | « Bonus de terrain » with a metric select: « Plastique », « Champignon », « Mixte » (mean of both). |
| Cells | **Explored cells only** (from `/world/exploration`); unexplored cells get a neutral hatch and no value. |
| Scale | Coefficients are in [0.5, 2.0] ([`005`](../005-world-grid-visibility/spec.md), `WorldService.fixInterval`). Five sequential bins: < 0.8, 0.8–1.1, 1.1–1.4, 1.4–1.7, ≥ 1.7, a single-hue ramp per metric (plastic warm, mushroom green), drawn at 55 % opacity over the terrain. |
| Legend | The legend panel shows the ramp with bin bounds (« ×0,8 … ×1,7 ») while the overlay is on. |
| Labels | At zoom levels 1–3 each explored cell also shows its value (« ×1,42 », 12 px). |
| Occupied cells | Cells holding a city or outpost are outlined, so free spots stand out. |
| Drawer | Selected cell shows plastic, mushroom and solar coefficients (today's block in `map/details/index.tsx`) and its bin. |

## 6. Targets & threats overlay

### Content

Computed by the server around **all** the player's cities and outposts, within **15 cells** (Manhattan) of the nearest one:

| Category | Settlements | Highlight |
| --- | --- | --- |
| **Cible** | System cities and outposts (`relation = system`); enemy-faction **outposts** (`relation = enemy`). | Crosshair ring in the relation colour. |
| **Menace** | Enemy-faction human **cities**; plus every incoming attack (from the movement layer). | Red hatched ring; incoming targets pulse. |

Each entry carries the latest **successful** spy report the viewer holds on that cell (if any):

| Field | Display |
| --- | --- |
| Age | Badge on the map and in the list: « 2 h » — fresh (< 6 h) solid, aging (6–24 h) faded, stale (> 24 h) outline only. |
| Tier | « Rapport niv. 3 » (slice 030 tiers). |
| Estimated strength | « ATK ≈ 1 200 · VIE ≈ 3 400 », prefixed « ≥ » when the tier does not reveal defenses (city tier 1). |
| Balance | Ratio of the current location's combat attack (sum of `attackContribution` over its available troops, client side from the troop list) to the target's estimated life: ≥ 1.5 « Favorable » (green), 0.75–1.5 « Incertain » (amber), < 0.75 « Risqué » (red). |
| No report | **Fog**: grey hatch over the marker and « ? »; drawer says « Aucun rapport d'espionnage — envoyez des éclaireurs » with the « Espionner » action. |

### Panel

While the overlay is on, the drawer (when no cell is selected) lists the entries sorted by distance: name / owner, category, distance, report age, balance, and buttons « Voir » (centre the map), « Espionner », « Attaquer », « Voir le rapport » (opens `/inbox/report` on that report).

### Estimated strength (server)

New `IntelService.estimateStrength(metadata)` in `apps/server/src/core/intel/service.ts`, from the stored spy metadata:

```
attack = Σ troops attackContribution(code, count) + Σ defenses count × defense attack (round 1 for attack_by_round)
life   = Σ troops lifeContribution(code, count)   + Σ defenses count × defense life
```

`attackContribution` / `lifeContribution` come from `core/combat/troop-combat.ts`, defense stats from `defense_characteristics`; no strategy or technology modifier (unknown to the spy), so values are labelled « ≈ ». `defenses_known` is `true` when the tier revealed defenses (tier ≥ 2 on a city; outposts have none).

## API

All new endpoints require auth, live under `/world` (`apps/server/src/web/router.ts`), and have their shapes in `packages/api-client/src/endpoints/world/`.

### `GET /world/terrain` (new)

Static terrain of the whole world, downloaded once.

```ts
export interface WorldTerrainDataResponse {
  size: number            // WORLD_SIZE, 100
  /** size × size chars, row-major from (1,1): index = (y − 1) × size + (x − 1). 'f' forest, 'r' ruins, 'l' lake. */
  terrain: string
}
```

- ≈ 10 KB (≈ 2 KB gzipped). Response header `Cache-Control: private, max-age=86400`; web query `staleTime: Infinity`.
- Built from `repository.cell.getByBounds` over the whole world (cached in memory after the first call: the world is generated once at startup, slice 005).

### `GET /world/exploration` (new)

The viewer's explored cells with their coefficients (replaces per-cell `detail=full` fetches for the map).

```ts
export interface WorldExplorationDataResponse {
  /** One tuple per explored cell: [x, y, plastic, mushroom, solar], coefficients rounded to 2 decimals. */
  cells: [number, number, number, number, number][]
}
```

- Coefficients are only exposed for explored cells, as in slice 005.
- Web query key `['world', 'exploration']`, invalidated on `troop:movement-finished` (explore / spy success mark cells explored) and on `outpost:created`.

### `GET /world/markers?min_x&max_x&min_y&max_y` (new)

Settlements in bounds with relation and size.

```ts
export type WorldMarkerRelation = 'mine' | 'ally' | 'faction' | 'enemy' | 'system'

export interface WorldMarkerCity {
  id: string
  name: string
  player_id: string
  owner_name: string
  faction_code: FactionCode
  alliance_tag: string | null
  relation: WorldMarkerRelation
  /** Bucket of the city's total building levels: 1 (0–19), 2 (20–49), 3 (50–79), 4 (≥ 80). */
  size: 1 | 2 | 3 | 4
  coordinates: Coordinates
}

export interface WorldMarkerOutpost {
  id: string
  player_id: string
  owner_name: string
  faction_code: FactionCode
  alliance_tag: string | null
  relation: WorldMarkerRelation
  type: OutpostType
  coordinates: Coordinates
}

export interface WorldMarkersDataResponse {
  viewer: { player_id: string, faction_code: FactionCode, alliance_id: string | null }
  cities: WorldMarkerCity[]
  outposts: WorldMarkerOutpost[]
}
```

- Bounds validated like `/world/cells` but with a max side of **100** (`MAX_MARKER_VIEWPORT_SIDE`), so the minimap can ask for the whole world.
- Queries: `city.listInBounds`, `outpost.listInBounds`, `player.listByIds` (name, faction, `system_controlled`), `alliance.listTagsByPlayerIds` (already returns `alliance_id`), and a new grouped `building.sumLevelsByCityIds(city_ids)` (one `GROUP BY city_id` query). No per-settlement query.
- `GET /world/cells` keeps its current shape (used by the movement destination stance, `movement/api/destination.ts`).

### `GET /world/targets` (new)

```ts
export interface WorldTargetIntel {
  report_id: string
  recorded_at: number
  tier: number
  troop_count: number
  defenses_known: boolean
  estimated: { attack: number, life: number }
}

export interface WorldTarget {
  kind: 'city' | 'outpost'
  id: string
  category: 'target' | 'threat'
  relation: 'system' | 'enemy'
  name: string | null            // city name; null for outposts
  outpost_type: OutpostType | null
  owner_name: string
  alliance_tag: string | null
  faction_code: FactionCode
  size: 1 | 2 | 3 | 4 | null     // cities only
  coordinates: Coordinates
  /** Nearest own city or outpost and its Manhattan distance in cells. */
  nearest: { kind: 'city' | 'outpost', id: string, coordinates: Coordinates, distance: number }
  intel: WorldTargetIntel | null
}

export interface WorldTargetsDataResponse {
  radius: number                 // TARGET_SCAN_RADIUS, 15
  targets: WorldTarget[]         // sorted by distance, at most TARGET_SCAN_LIMIT (60)
}
```

- Settlements: one `city.listInBounds` and one `outpost.listInBounds` over the bounding box of the player's locations expanded by the radius, then a distance filter in memory.
- Intel: new repository method `report.listLatestSpyIntel({ player_id, coordinates[] })`: latest `spy` report per destination cell for that player with `success = true` (`report` joined to `report_spy`, `DISTINCT ON (destination_x, destination_y) … ORDER BY recorded_at DESC`). Reports deleted by the 30-day read-report cleanup (`REPORT_READ_RETENTION_MS`) are simply gone, so such targets show fog again.
- Web query key `['world', 'targets']`, fetched only while the overlay is on, `staleTime` 60 s, invalidated on `troop:movement-finished` and `battle:finished`.

### `GET /world/intel?x=&y=` (new)

Latest successful spy summary for one cell (the drawer, for cells outside the targets radius): `{ intel: WorldTargetIntel | null }`. Same repository method with one coordinate.

### `GET /troop/movement` (changed)

Each movement gains `departure_at: number` (ms). Stored in a new `movement.started_at` column (`timestamptz`, default `now()`), written from the `start_at` already passed to `TroopService.createMovement` (`app/command/troop/movement/create.ts`, rebase, return trips, exchange convoys). Rows that exist when the migration runs get `now()` (their progress dot starts at the origin until they arrive).

### `GET /troop/movement/incoming` (changed)

`TroopIncomingMovement` gains, from `detection` ≥ 2 only:

```ts
origin?: Coordinates
departure_at?: number
```

Filtered in `app/query/troop/movement/incoming.ts` like `attacker`. At detection 0–1 they are absent.

### Server constants and limits

| Constant | Value | File |
| --- | --- | --- |
| `MAX_VIEWPORT_SIDE` (`/world/cells`) | **20, unchanged** — the map no longer pages terrain through it | `core/world/constant/size.ts` |
| `MAX_MARKER_VIEWPORT_SIDE` | 100 | same file |
| `TARGET_SCAN_RADIUS` | 15 cells | `core/intel/constant/targets.ts` |
| `TARGET_SCAN_LIMIT` | 60 | same file |
| `CITY_SIZE_LEVEL_THRESHOLDS` | `[20, 50, 80]` | `core/world/constant/marker.ts` |

Also fix the O(cells × explored) lookup in `web/handler/world/get-cells.ts` (`explored_cell_ids.some(…)`) with a `Set`; the same `Set` serves `/world/exploration`.

## Performance

### Rendering

| Rule | Detail |
| --- | --- |
| Layers | `terrain` (one `Konva.Shape` whose `sceneFunc` fills every visible cell — ≤ 41 × 71 ≈ 2 900 `fillRect`s — from the terrain string), `overlay` (heat map / targets, one shape), `markers`, `movements` (redraw at 1 Hz), `ui` (hover outline, selection outline). |
| Listening | All layers `listening: false` except a transparent hit rect; cell, marker and arrow hits are computed from the pointer with `gameCellAtStagePoint` and segment distance. No per-cell `Rect` with event handlers (today's `cells.tsx` creates one per cell). |
| Pan | Drag moves the layers in pixel space (fractional centre); React state (`center`) is committed once per animation frame at most and on drag end. Terrain draws one extra cell of margin so edges never flash. |
| Text | City labels only at cell ≥ 40 px; other text (tooltips, menu, drawer, legend) is HTML. |
| Budget | ≥ 50 fps while panning at level 6 on a 1920 × 1080 desktop; first paint of a new window < 16 ms of drawing. |

### Fetching

| Data | When | Limit |
| --- | --- | --- |
| Terrain | Once per session | `staleTime: Infinity` |
| Exploration | Once, then on invalidation | 1 request |
| Markers | On window change, debounced 150 ms, bounds = visible window padded by 50 % (clamped to the world, side ≤ 100); a window inside the last fetched bounds triggers nothing | 1 in flight (stale responses dropped by generation counter, as `useWorld` does today) |
| Minimap markers | Whole world, `staleTime` 60 s | 1 request |
| Movements, incoming, capacity | Existing hooks and WS invalidations | — |
| Targets | Overlay on, `staleTime` 60 s | 1 request |
| Cell intel | Drawer opened on a cell with an enemy / system settlement outside the targets list | 1 request per selection |

Opening the map costs **5 requests** (terrain, exploration, markers, movements, incoming) instead of today's chain of `/world/cells` pages and prefetch rings. `cell-cache.ts`, `world-fetch-scheduler.ts`, `api/cells.ts` and the paging logic in `hook/world.ts` are removed; `hook/world.ts` becomes a small view-state hook (centre, zoom, stage size).

## Web structure

| File | Role |
| --- | --- |
| `modules/map/page.tsx` | Full-workspace page: toolbar, stage, minimap, legend, drawer. Reads `x`, `y`, `zoom`, `layers` from the route. |
| `modules/map/canvas.tsx` | Stage, layers, pointer handling (hover, click, drag, wheel). |
| `modules/map/layers/{terrain,overlay,markers,movements,selection}.tsx` | One Konva layer each. |
| `modules/map/minimap.tsx` | 2D canvas minimap. |
| `modules/map/toolbar.tsx` | Zoom, « Aller à », « Recentrer », layer toggles. |
| `modules/map/cell-menu.tsx` | In-place action menu + `mapCellActions(context)` pure gating function. |
| `modules/map/drawer/{index,cell,movement,targets}.tsx` | Drawer contents; hosts the send wizard (045). |
| `modules/map/legend.tsx` | HTML legend (replaces `legend-overlay.tsx`). |
| `modules/map/hooks.ts` | `useWorldTerrain`, `useWorldExploration`, `useWorldMarkers`, `useWorldTargets`, `useCellIntel`. |
| `modules/map/viewport.ts`, `geometry.ts` | Zoom levels, rectangular window, hit tests (`pointToSegmentDistance`). |

## Testing

| Area | Cases |
| --- | --- |
| Viewport | Rows / columns per zoom level and aspect; clamping at world edges; zoom anchored on the pointer; arrow-key pan. |
| Hit tests | Pointer → cell at every zoom; segment distance for arrows; marker beats empty cell. |
| Cell menu gating | Every row of the gating table, including espionage 0 (spy disabled), movement cap reached, outpost cap reached, same-faction and allied cities, unexplored cells. |
| Markers | Relation precedence (`mine` > `ally` > `system` > `faction` > `enemy`); size buckets at 19 / 20 / 49 / 50 / 79 / 80. |
| Movements | Dot position from `departure_at` / `arrive_at`; detection 1 → ring only; detection ≥ 2 → arrow from origin; click opens own details vs incoming card. |
| Overlays | Terrain bins and explored-only rule; targets fog without report; age classes; balance thresholds; « ≥ » when defenses unknown. |
| Minimap | Viewport rectangle; click recentres. |
| URL | `x`, `y`, `zoom`, `layers` round-trip; invalid values ignored; outpost route accepts them. |
| Server `/world/terrain` | Length 10 000, index mapping, cell types. |
| Server `/world/exploration` | Only explored cells; coefficients rounded; empty for a fresh player. |
| Server `/world/markers` | Relation per case (own, alliance member, system player, same faction, enemy); size from summed levels; bounds up to 100 accepted, 101 rejected; one grouped level query. |
| Server `/world/targets` | Radius from the nearest location; categories (system city / outpost → target, enemy outpost → target, enemy city → threat, same faction and allies excluded); latest successful spy report wins over older and failed ones; strength estimate per tier; limit 60. |
| Server `/world/intel` | Report present / absent; another player's reports never returned. |
| Server movements | `departure_at` equals the creation time for create, rebase, return trips and exchange convoys; migration default. |
| Server incoming | `origin` / `departure_at` hidden at detection 1, present at 2+. |
| Performance | A render test with level 6 and 300 markers stays under a fixed draw-call count (single terrain shape). |

## Out of scope

- Shared vision with allies (allies' movements, their spy reports) — still out of scope as in [`033`](../033-alliances/spec.md).
- Showing field troop stacks on the map.
- Battle reports as intel (only spy reports feed the targets overlay).
- Suggesting the best settle spot automatically.
- Water / lake bonuses (cell water coefficient stays 1, slice 035).
- Tablet / phone layouts, touch gestures beyond what Konva gives for free.
- Changing combat or spy rules; strength estimates are display only.

## Assumptions (confirm on review)

| # | Assumption |
| --- | --- |
| 1 | Zoom is defined by **rows** (7 → 41 cells tall); columns follow the stage aspect, so level 6 shows ≈ 41 × 71 cells at 1920 × 1080. |
| 2 | Default zoom on open is level 3 (15 rows), not 7 × 7. |
| 3 | Relation precedence `mine` > `ally` > `system` > `faction` > `enemy`; system players always render as `system` (their factions are non-playable). |
| 4 | City size hint = buckets of total building levels (0–19 / 20–49 / 50–79 / ≥ 80); outposts have no size beyond temporary / permanent. |
| 5 | **New reveal**: incoming attacks expose `origin` and `departure_at` from **Détection 2** (with the attacker name); at level 1 the map shows only the target ring and ETA. This extends the [`030`](../030-intelligence/spec.md) table. |
| 6 | Movement progress needs a stored `movement.started_at`; in-flight movements at migration time get `now()`. |
| 7 | Targets radius 15 cells (Manhattan) from the nearest own location, limit 60; enemy-faction human cities count as **threats**, system cities / outposts and enemy outposts as **targets**. |
| 8 | Strength estimate = unmodified attack / life pools from the spy snapshot; « Favorable / Incertain / Risqué » thresholds 1.5 and 0.75 against the current location's available combat attack. |
| 9 | Spy report age classes: < 6 h fresh, 6–24 h aging, > 24 h stale. |
| 10 | « Établir un avant-poste » is the map's « settle » action (`base` to an empty explored cell); founding a city stays on the outpost page. |
| 11 | The send wizard (045) can be mounted inside the map drawer and accepts `{ origin, destination, action? }`; otherwise the map navigates to the wizard route with the same values. |
| 12 | The full world terrain is not secret (terrain type was already returned for any viewport in slice 005), so it can be sent in one response. |

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`005`](../005-world-grid-visibility/spec.md) | `/world/terrain`, `/world/exploration`, `/world/markers`; web map no longer uses `/world/cells` paging; `CITY_MAP_INITIAL_HALF_EXTENT` removed; `Set` lookup. |
| [`010`](../010-troop-movement-combat/spec.md) | `movement.started_at`, `departure_at` on `GET /troop/movement`. |
| [`011`](../011-outposts/spec.md) | Map settle action. |
| [`019`](../019-web-shell-routing/spec.md) | Map routes: full workspace, `zoom` / `layers` search params, outpost map search. |
| [`030`](../030-intelligence/spec.md) | Incoming `origin` / `departure_at` from Détection 2; `/world/targets`, `/world/intel`, `IntelService.estimateStrength`. |
| [`033`](../033-alliances/spec.md) | `ally` relation on markers. |
| `045` | Wizard prefill from the map (`origin`, `destination`, `action`), drawer mounting. |

## Evidence index

| Area | Paths |
| --- | --- |
| Current map (web) | `apps/web/src/modules/map/{page.tsx,canvas.tsx,cells.tsx,markers.tsx,legend-overlay.tsx,helper.ts,viewport.ts,geometry.ts,cell-cache.ts,world-fetch-scheduler.ts,api/cells.ts,hook/world.ts,details/index.tsx}` (+ `*.spec.ts`), `routes/city/$cityId/world/map.tsx`, `routes/outpost/$outpostId/world/map.tsx`, `routes/city/$cityId/map.tsx`, `ui/layout/page.tsx`, `App.tsx` |
| Movements (web) | `apps/web/src/modules/movement/{details/index.tsx,incoming/item.tsx,incoming/index.tsx,create/index.tsx,create/action/index.tsx,api/destination.ts,spy.ts,reinforce.ts,capacity/index.tsx,translations.ts}`, `modules/troop/hooks.ts` (`useListMovements`, `useListIncomingMovements`, `troopKeys`), `modules/troop/ws-listener.ts` |
| Outposts / alliance (web) | `apps/web/src/modules/outpost/{page.tsx,settle/index.tsx}`, `modules/alliance/translations.ts` (`allianceDisplayName`) |
| World server | `apps/server/src/app/query/world/get-cells.ts` (+ `.spec.ts`), `web/handler/world/get-cells.ts` (+ `.spec.ts`), `core/world/constant/size.ts`, `core/world/service.ts` (coefficients, `getDistance`), `core/world/value/cell-type.ts`, `core/world/exploration/`, `adapter/database/repository/{city,outpost}.ts` (`listInBounds`), `adapter/database/repository/alliance.ts` (`listTagsByPlayerIds`), `core/player/entity.ts` (`system_controlled`), `core/faction/constant/playable.ts`, `web/router.ts` |
| Movement server | `apps/server/src/app/query/troop/movement/{list,incoming,resolve-arrive-at}.ts`, `web/handler/troop/movement/{list,incoming}.ts`, `app/command/troop/movement/create.ts`, `core/troop/movement/entity.ts`, `core/troop/constant/movement-action.ts`, `adapter/job-queue/troop/finish-movement.ts`, `adapter/database/types.ts` (`Movement`), `app/command/troop/movement/finish/{transport,base}.ts` |
| Intel server | `apps/server/src/core/intel/service.ts`, `app/port/repository/report.ts` (`createSpyReports`, `getSpyMetadataByReportId`), `adapter/database/types.ts` (`Report`, `ReportSpy`), `app/command/communication/report/cleanup-old-read.ts` (`REPORT_READ_RETENTION_MS`), `core/combat/troop-combat.ts` (`attackContribution`, `lifeContribution`), `core/defense/constant/characteristic.ts` |
| API client | `packages/api-client/src/endpoints/world/{get-cells,index}.ts`, `endpoints/troop/movement/{list,incoming,get,capacity}.ts`, `types/report-spy.ts`, `events.ts`, `index.ts` |
| Specs | [`005`](../005-world-grid-visibility/spec.md), [`010`](../010-troop-movement-combat/spec.md), [`011`](../011-outposts/spec.md), [`024`](../024-player-combat-pvp/spec.md), [`030`](../030-intelligence/spec.md), [`033`](../033-alliances/spec.md) |
