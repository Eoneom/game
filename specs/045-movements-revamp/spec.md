# Slice 045 — Movements revamp: tabbed list and send wizard

**Status**: Planned.

## Summary

The movements page (`/city/$cityId/world/movement`, `/outpost/$outpostId/world/movement`) stacks three unrelated blocks on one screen: an always-open « Nouveau déplacement » form, the « Attaques entrantes » cards and the « Déplacements en cours » cards. Returns, exchange convoys and outgoing orders are mixed in one list, and the form auto-switches the action under the player's feet when the selected troops change.

This slice splits the page in two (decision « Movements » of [`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md)):

- **List**: a compact table in four tabs, **« Sortants » / « Entrants » / « Retours » / « Convois »**, with live countdowns, sorting, empty states and the movement-cap readout of [`028`](../028-command-center-shelter/spec.md).
- **Send wizard**: a 3-step flow on its own route, **destination → action + troops → summary → send**, whose whole state lives in the URL so the map ([`044`](../044-world-map-revamp/spec.md)), the city dashboard and any other page can deep-link into it with a prefilled destination.

The server keeps every rule it has today; it gains a few read fields so the client can classify movements (returns vs outgoing vs convoys) and show richer rows.

**Depends on**: [`010`](../010-troop-movement-combat/spec.md) (movements), [`024`](../024-player-combat-pvp/spec.md) (attack, strategy), [`027`](../027-military-economy-technologies/spec.md) (Propulsion tactique), [`028`](../028-command-center-shelter/spec.md) (movement cap), [`030`](../030-intelligence/spec.md) (spy, incoming attacks, detection), [`033`](../033-alliances/spec.md) (reinforce, recall), [`035`](../035-faction-exchange/spec.md) (exchange convoys, reserved carriers, water), [`039`](../039-confederation-identity/spec.md) (logistics bonus), [`040`](../040-readability-typography-theme/spec.md) (type scale, plain panels), [`041`](../041-app-shell-navigation/spec.md) (shell). Consumed by [`044`](../044-world-map-revamp/spec.md) (map cell actions open this wizard).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **List layout** | One page, four tabs **« Sortants » / « Entrants » / « Retours » / « Convois »**, each a compact table (one row per movement) with a live countdown. |
| **Tab membership** | Decided by a server-provided `kind` (`outgoing` / `return` / `convoy`) for own movements; « Entrants » reads `GET /troop/movement/incoming` (detection-gated, slice 030). See [Tabs](#tabs). |
| **Send flow** | Dedicated route `…/world/movement/send`, 3 steps: **1 Destination**, **2 Ordre et troupes**, **3 Récapitulatif**, then « Envoyer ». The wizard is one component, `MovementSendWizard`, with a pluggable state store: the route binds it to the URL, the map drawer of 044 mounts it with local state (see [Embedding](#embedding-map-drawer-044)). |
| **Order of step 2** | **Action first, then troops**: the action cards are those the destination allows; picking one filters which troops can be selected. No silent action switching. |
| **Gating** | The client mirrors the server rules (same checks, same order) to hide or disable choices; the server stays the authority and its errors are shown in French. |
| **Deep link** | Every wizard field is a URL search param; a link with `?x=&y=` (and optionally `action=`) opens step 2 with the destination filled. |
| **Details** | Selecting a row opens the movement in the fixed right details panel (`LayoutPage details`), at the stable route `…/world/movement/$movementId`. |
| **Origin** | The current location of the route (city or outpost). The wizard can switch it among the player's own locations. Recall of reinforcements stays on the troop page (033). |
| **Server rules** | Unchanged. Additions are read-only fields plus one `movement.is_return` column (see [API changes](#api-changes)). |
| **Target** | 1920 × 1080 desktop only (decisions « Target »). |

## Current state (replaced)

| Piece | File | Fate |
| --- | --- | --- |
| Page composition | `apps/web/src/modules/movement/page.tsx` | Rewritten: header + tabs + table; no inline form. |
| Inline create form (~330 lines, one state blob, effects that auto-switch the action) | `modules/movement/create/index.tsx` | Replaced by the wizard (`modules/movement/send/`). Sub-components are reused or folded in (see [Web components](#web-components)). |
| Card list of own movements | `modules/movement/list/index.tsx`, `list/item/index.tsx` | Replaced by `MovementTable` rows. |
| « Attaques entrantes » section | `modules/movement/incoming/index.tsx`, `incoming/item.tsx` | Becomes the « Entrants » tab rows; `incoming/item.tsx` becomes `incoming/details.tsx` (`IncomingMovementDetails`, also used by the 044 map drawer); `incoming/translations.ts` kept. |
| Details panel | `modules/movement/details/index.tsx` | Enriched (names, countdown, strategy, troop thumbs, map link). |
| Capacity readout | `modules/movement/capacity/index.tsx` | Kept, restyled as a meter in the page header and the wizard. |
| Map side panel embeds `MovementCreate compact` | `modules/map/details/index.tsx` | Replaced by links into the wizard (until 044 ships its cell actions). |
| Arrival time in the estimate | `create/estimation/index.tsx` adds `estimation.duration` (seconds, see `app/query/troop/movement/estimate.ts` `duration / 1000`) to `Date.now()` as if it were milliseconds | **Bug fixed** in the summary step: `arrive_at = now + duration × 1000`. |

## Routes and URL state

### Routes

| Route (file under `apps/web/src/routes/`) | Content |
| --- | --- |
| `city/$cityId/world/movement/route.tsx` | List page (tabs). Search: `tab`, `sort`, `incoming`. |
| `city/$cityId/world/movement/$movementId.tsx` | List page with the movement in the details panel (stable link target for 044 arrows and toasts). Keeps the list search params. |
| `city/$cityId/world/movement/send.tsx` **(new)** | Send wizard. Static segment, so TanStack Router matches it before `$movementId`. |
| `outpost/$outpostId/world/movement/route.tsx`, `$movementId.tsx`, `send.tsx` **(new)** | Same three, origin = outpost. |
| `city/$cityId/movement/*` | Existing redirects kept (`/city/$cityId/movement` → `/world/movement`). |

### List search params

| Param | Values | Default |
| --- | --- | --- |
| `tab` | `sortants` \| `entrants` \| `retours` \| `convois` | `sortants` |
| `sort` | `arrival` \| `-arrival` \| `action` | `arrival` (soonest first) |
| `incoming` | id of an incoming attack, shows it in the details panel | — |

Invalid values are dropped by `validateSearch` (same pattern as `routes/exchange.tsx` and `routes/city/$cityId/world/map.tsx`).

### Wizard search params

| Param | Format | Notes |
| --- | --- | --- |
| `step` | `destination` \| `ordre` \| `recap` | Default: `ordre` when `x` and `y` are set, else `destination`. |
| `x`, `y` | integers, `1 ≤ v ≤ WORLD_SIZE` | Destination. Out-of-range values are dropped. |
| `action` | `MovementAction` except `exchange` | Optional prefill; ignored if the destination does not allow it. |
| `troops` | `code:count` pairs joined by `,` — e.g. `legionnaire:20,interceptor:5` | Unknown codes and counts ≤ 0 dropped; counts clamped to what is available at render. |
| `plastic`, `mushroom`, `plasma`, `water` | integers ≥ 0 | Transport cargo only; clamped to stock and remaining capacity. `water` ignored for outpost origins. |
| `strategy` | `CombatStrategy` | Attack only; default `balanced`. |

- Field edits use `navigate({ search, replace: true })` (no history spam); step changes push a history entry, so the browser back button goes back one step.
- **Step guard**: `step=ordre` without a valid destination falls back to `destination`; `step=recap` without an action or troops falls back to `ordre`. The fallback replaces the URL.
- **Deep links used by other slices**:
  - map cell action (044): `…/world/movement/send?x=12&y=7&action=attack`;
  - list header « Envoyer des troupes »: `…/world/movement/send`;
  - city dashboard movements card: same as the list header;
  - troop page « Envoyer » on a stack (optional, same slice if trivial): `…/send?troops=<code>:<count>`.

## Movement list

### Page header

« Mouvements » title, the **cap meter** « Mouvements 4 / 7 » (`GET /troop/movement/capacity`, slice 028) and the primary button « Envoyer des troupes ». When `used ≥ limit` the meter turns `danger`, the button stays enabled (the wizard explains the block at step 3) and a one-line hint reads « Limite atteinte : attendez un retour ou améliorez un centre de commandement. ».

The meter counts what the server counts (`movement.countByPlayer`): **outgoing and return** movements; **convoys never count** (slice 035), which the meter's tooltip states: « Les convois de bourse ne comptent pas. ».

### Tabs

Tab labels show their row count: « Sortants (3) ». « Entrants » is drawn in `danger` with its count when non-empty.

| Tab | Source | Rows |
| --- | --- | --- |
| **« Sortants »** | `GET /troop/movement`, `kind = outgoing` | Movements the player sent and that are on their way out: `explore`, `base` (stationing, temporary outpost, rebase between own locations), `transport`, `attack` (including arrived attacks in battle, `battle_id ≠ null`), `spy`, `reinforce`. Includes moves from an outpost. |
| **« Entrants »** | `GET /troop/movement/incoming` | Hostile **attacks** aimed at the player's cities, outposts or field stacks, as revealed by **Détection** (030): nothing at level 0, target + ETA at 1, attacker at 2, `≈ N unités` at 3, composition at 4. Spy missions and allied reinforcements are never listed (the server does not expose them). |
| **« Retours »** | `GET /troop/movement`, `kind = return` | Troops going home on their own: returns after `explore`, `transport` (with leftover cargo), `spy`, a `reinforce` turned back (target no longer allied), a rebase after the outpost limit, the automatic return of reinforcements (leave / kick / dissolve, 033) and the owner's recall « Rappeler » (033). |
| **« Convois »** | `GET /troop/movement`, `kind = convoy` | Faction exchange convoys (`action = exchange`, « Livraison ») and their carriers' trip home (`action = base` with an `exchange_trade_id`, « Retour des transporteurs »). Read-only. |

Attacks have **no return trip**: at battle end survivors either occupy the target or are put back on the origin cell instantly (`apply-battle-outcomes.ts`, slice 024), so they never appear in « Retours ».

### Classification (server)

`kind` is computed per movement row:

```
kind = exchange_trade_id ≠ null  → 'convoy'
     | is_return                → 'return'
     | otherwise                → 'outgoing'
```

`is_return` is a new boolean column on `movement` (see [Persistence](#persistence)), set to `true` by:

| Creator | File |
| --- | --- |
| `createReturnBaseTrip` (explore, transport, spy, reinforce turned back, rebase on outpost limit, exchange carriers — the latter end up `convoy` anyway) | `apps/server/src/app/command/troop/movement/shared.ts` |
| Automatic reinforcement return | `apps/server/src/app/command/troop/reinforcement/return-home.ts` |
| Owner recall from a foreign city (`is_foreign_city` branch) | `apps/server/src/app/command/troop/movement/create.ts` |

Every other creation (player `POST /troop/movement`, system AI `createTroopMovement`) stores `false`. Rows created before the migration are `false` (they show in « Sortants » until they land; acceptable for a one-off).

### Columns

All tables use the dense table style of 040 (`text-meta` body rows, 32 px row height, first column may stay `text-body`), tabular numbers for times and coordinates.

**« Sortants »** and **« Retours »**

| Column | Content |
| --- | --- |
| « Ordre » | « Sortants »: action label (`MovementActionLabels`) with a small icon. « Retours »: always « Retour », since the action that started the trip is not stored (see assumption 4). |
| « Départ » | Location label (below). |
| « Destination » | Location label. |
| « Troupes » | Total units, e.g. « 25 unités »; tooltip lists `Nom × n`. |
| « Cargaison » | `formatCargo` with resource icons; « — » when empty. |
| « Arrivée dans » | Countdown `formatTime`; « En bataille » badge instead when `battle_id ≠ null`; « Arrivée… » at 0 until the refetch. |
| « Heure » | Local arrival clock `HH:mm:ss` (date prefix when not today). |

**« Entrants »**

| Column | Content |
| --- | --- |
| « Cible » | `formatIncomingTarget` (« Ville Alpha (3.4) »). |
| « Attaquant » | « Nom (faction) » from detection 2; « Inconnu » below. |
| « Armée » | `≈ N unités` from detection 3, composition tooltip at 4; « Inconnue » below. |
| « Arrivée dans » | Countdown in `danger`. |
| « Heure » | Local arrival clock. |

**« Convois »**

| Column | Content |
| --- | --- |
| « Trajet » | « Livraison » (`exchange`) or « Retour des transporteurs » (`base`). |
| « Départ » / « Destination » | Location labels. |
| « Cargaison » | Goods or water carried. |
| « Transporteurs » | Units, e.g. « 3 Transporteurs légers ». |
| « Arrivée dans » / « Heure » | As above. |

**Location label** (`modules/movement/location-label.ts`, new): own city → « Nom (x.y) », own outpost → « Avant-poste (x.y) », allied member's city (from `GET /alliance/mine`) → « [TAG] Nom (x.y) », anything else → « x.y ». Own city coordinates come from `GET /city` (see [API changes](#api-changes)).

### Countdowns and live updates

- One shared ticker for the table (`useNow(1000)` hook in `apps/web/src/hook/`), not one `useTimer` per row.
- When a row reaches 0: invalidate `troopKeys.movements` (or `troopKeys.incomingMovements`) once, debounced 1 s; the row shows « Arrivée… » until the refetch drops or replaces it.
- The list queries also refetch on window focus and every 30 s while the page is mounted; existing WS invalidations (`movement:incoming`, `exchange:filled`, troop listeners) stay.

### Sorting

- Default: « Arrivée dans » ascending (soonest first) in every tab.
- Clickable headers: « Arrivée dans » (toggles `arrival` / `-arrival`) and « Ordre » (`action`, then arrival). The header shows `aria-sort`.
- The sort is shared by all tabs and kept in the URL (`sort`).

### Empty states

| Tab | Copy |
| --- | --- |
| « Sortants » | « Aucun déplacement en cours. » + button « Envoyer des troupes ». |
| « Entrants », Détection 0 | « Recherchez la Détection pour être prévenu des attaques entrantes. » (link to the technology page). |
| « Entrants », Détection ≥ 1 | « Aucune attaque détectée. » |
| « Retours » | « Aucune troupe sur le chemin du retour. » |
| « Convois » | « Aucun convoi de bourse en route. » + link « Ouvrir la bourse » (`/exchange`). |

The Détection level comes from `useListTechnologies` (already used by the spy preview).

## Movement details

Right details panel (`LayoutDetailsContent`), opened by clicking a row (keyboard: Enter on the focused row).

| Block | Content |
| --- | --- |
| Title | Action label; for convoys « Convoi de bourse — Livraison » / « Retour des transporteurs ». |
| Status | « En route », « En bataille depuis HH:mm » (`battle_id`), « Retour en cours ». |
| Route | Origin → destination location labels, distance in cells. |
| Timing | Countdown, arrival date and time. |
| Troops | One line per stack with a 40 px thumb (`EntityThumb`, `troopImageSrc`), name and count. |
| Cargo | Resource icons and amounts (incl. water). |
| Attack | Combat strategy label (`CombatStrategyLabels`) — needs `combat_strategy` on `GET /troop/movement/:id`. |
| Convoy | « Convoi de la bourse de faction : il ne peut être ni modifié ni intercepté. » (existing copy). |
| Actions | « Voir sur la carte » → `…/world/map?x=&y=` (destination). No cancel (not a game rule). |

**Incoming attack details** (`?incoming=<id>`): built from the cached `GET /troop/movement/incoming` row (no extra request): target, ETA, and the detection-gated attacker / army fields, plus « Ces informations dépendent de votre niveau de Détection. ». Hidden when the id is no longer listed.

Empty panel (no selection): « Sélectionnez un mouvement pour voir son détail. » (`ui/layout/details/empty.tsx`).

## Send wizard

### Layout

- Main column: a **stepper** « 1 Destination · 2 Ordre et troupes · 3 Récapitulatif » (completed steps are clickable), the step content, and « Retour » / « Suivant » buttons at the bottom.
- Right details panel: a live **« Récapitulatif »** card visible at every step: origin, destination (label + what is there), action, selected troops (total + list), cargo, strategy, and once troops are chosen the ETA from the estimate endpoint. Plus the cap meter.
- « Annuler » returns to the list (`tab=sortants`) without sending.

### Step 1 — Destination

| Element | Behaviour |
| --- | --- |
| « Depuis » | Origin label; a select of own cities and outposts. Changing it navigates to the same wizard under the other location (`/city/<id>/…/send` or `/outpost/<id>/…/send`), keeping `x`, `y`, `action`; `troops` and cargo are dropped (they belong to the old origin). |
| Coordinates | Two number inputs « X » / « Y » (`1 … WORLD_SIZE`); Enter validates. Same cell as the origin → « Choisissez une autre case que le point de départ. ». |
| Quick picks | Grouped list with one click to fill X/Y: **« Mes villes »** (`GET /city`), **« Mes avant-postes »** (`GET /outpost`), **« Villes alliées »** (members' cities from `GET /alliance/mine`, without the player's own), **« Cibles récentes »** (below). The current origin is excluded. |
| Cell preview | Once X/Y are valid: what the cell is (see [Destination resolution](#destination-resolution)), e.g. « Ville ennemie [ABC] Brasier — Liturgie des cendres », « Case inexplorée », « Votre avant-poste ». |
| « Suivant » | Enabled when the destination is valid and differs from the origin. |

**Recent targets**: the last 8 destinations the player sent troops to from this browser, newest first, with the action used and the date (« 12.7 — Attaquer, il y a 2 h »). Stored in `localStorage` under `eoneom:movement:recent-targets:<player_id>`, written after a successful send, every access wrapped in `try/catch` (empty list when storage is unavailable).

### Destination resolution

A 1 × 1 `GET /world/cells` (`detail: 'terrain'`), as `useDestinationStance` already does, generalised to `useDestinationInfo(destination)` in `modules/movement/api/destination.ts`:

| `DestinationKind` | Rule |
| --- | --- |
| `unexplored` | `cells[0].explored = false`. |
| `own_city` / `own_outpost` | Settlement with `player_id = viewer.player_id`. |
| `allied_city` | City whose `player_id` is another member of the viewer's alliance (`GET /alliance/mine`). |
| `friendly` | City or outpost of the viewer's faction, not own, not allied city (incl. allied outposts). |
| `enemy_city` / `enemy_outpost` | Settlement of another faction (humans or system players). |
| `empty` | Explored, no settlement (a field stack may be there: stacks are not on the map). |

### Step 2 — Action and troops

#### Actions offered by destination

| Destination | « Explorer » | « Baser » | « Transporter » | « Attaquer » | « Espionner » | « Renforcer » |
| --- | --- | --- | --- | --- | --- | --- |
| `unexplored` | ✓ | — | — | — | — | — |
| `empty` | — | ✓ (temporary outpost) | — | ✓ (field stack) | ✓ (field stack) | — |
| `own_city`, `own_outpost` | — | ✓ | ✓ | — | — | — |
| `allied_city` | — | — | — | — | — | ✓ |
| `friendly` | — | — | — | — | — | — |
| `enemy_city`, `enemy_outpost` | — | — | — | ✓ | ✓ | — |

- « Convoi de bourse » (`exchange`) is **never** offered (server refuses it: `troop:movement:action-not-implemented`).
- `friendly` shows « Aucune action possible : cette case appartient à votre faction. » and blocks « Suivant ».
- « Baser » takes the contextual labels of the 044 cell menu: **« Stationner »** on an own city or outpost, **« Établir un avant-poste »** on an empty cell (`MovementActionLabels.base` « Baser » stays for list rows).
- On `empty`, « Attaquer » and « Espionner » carry the hint « Seulement si des troupes ennemies s'y trouvent » (the server answers `combat:no-valid-target` / `intel:no-valid-target`). The 044 map menu does not offer them on empty cells (field stacks are not on the map); the wizard does, for players typing coordinates of a known field stack.
- The explore-only rule for unexplored cells mirrors today's map panel (`EXPLORED_CELL_ACTIONS` in `modules/map/details/index.tsx`).
- A prefilled `action` that the destination does not allow is ignored; when only one action is offered it is preselected.

#### Troops by action

The troop table lists the origin's stacks with **available** counts (`count − exchange_reserved`, slice 035), one row per code: 40 px thumb, name, role, an input (0 … available), « Max ». Global buttons « Tout » / « Aucun » act on the selectable rows only. Rows that the chosen action forbids are disabled with the reason as tooltip.

| Action | Selectable troops | Other requirement | Server check mirrored |
| --- | --- | --- | --- |
| « Explorer » | All | ≥ 1 unit | — |
| « Baser » | All | ≥ 1 unit; warning when it would empty a temporary outpost | `OutpostError.LIMIT_REACHED` at arrival (warning only) |
| « Transporter » | All (carriers give the capacity) | Cargo > 0 and ≤ capacity | `TroopService.assertTransportResources` |
| « Attaquer » | `combat`, `carrier` and other non-scout roles; **scouts disabled** | ≥ 1 `combat` unit; strategy | `TroopService.assertAttackArmy` (`combat:combat-troop-required`, `combat:scout-not-allowed-on-attack`), `resolveAttackTarget` (same faction refused) |
| « Espionner » | **`scout` role only** | **Espionnage ≥ 1** — otherwise the card is disabled with « Recherchez l'Espionnage pour envoyer des espions. » | `IntelService.assertEspionageLevel`, `assertScoutsOnly`, `resolveSpyTarget` |
| « Renforcer » | **`combat` role only** | ≥ 1 unit; allied city | `TroopService.assertReinforcementArmy`, `resolveReinforceTarget` |

Roles come from `troop_role` (api-client); the helpers `isScoutOnlySelection` (`modules/movement/spy.ts`) and `isCombatOnlySelection` (`modules/movement/reinforce.ts`) are reused. Changing the action **keeps** the counts of rows that stay selectable and zeroes the others (shown once as « Les troupes non autorisées pour cet ordre ont été retirées. »).

#### Cargo (« Transporter » only)

`MovementCreateResources` reused: plastic, mushroom, plasma and **water** (cities only), each with « Max », a capacity bar « Charge 1 240 / 1 500 » using `resource_transport_weight` (water weighs 2). Capacity is `transport_capacity` from the estimate (includes the Confederation × 1.10 carrier bonus, slice 039). The per-resource caps keep today's formula (`create/index.tsx` `maxPlastic…maxWater`).

#### Strategy (« Attaquer » only)

`MovementCreateCombatStrategy` reused (four strategies, default « Équilibrée »).

« Suivant » is enabled when the action is chosen and its row of the table above is satisfied.

### Step 3 — Summary

| Block | Content |
| --- | --- |
| Order | « Attaquer — Ville ennemie [ABC] Brasier (14.9) depuis Ville Alpha (12.7) ». |
| Troops | Table: thumb, name, count; total units. |
| Cargo / strategy | When relevant. |
| **Estimate** (`POST /troop/movement/estimate`) | « Distance » (cells), « Vitesse » (slowest unit), « Durée », « Arrivée prévue » (`now + duration × 1000`, refreshed every second), « Capacité de transport ». A « Bonus appliqués » line lists « Propulsion tactique niv. N » when `modifiers.propulsion_level > 0` and the movement has combat units, « Logistique confédérée : +5 % vitesse » when `non_combat_speed_multiplier > 1` and it has none, « +10 % capacité des transporteurs » when `carrier_capacity_multiplier > 1` and it has carriers. |
| **Spy odds** (« Espionner ») | `MovementCreateSpyPreview` (« ≥ 5 % (jusqu'à X % contre une cible sans Détection) ») and the failure warning. |
| **Warnings** | `MovementCreateWarning` extended (table below). |
| Send | « Envoyer » (primary). Disabled with the blocking warning visible when the cap is reached. |

| Warning | Condition | Blocking |
| --- | --- | --- |
| « Limite de mouvements simultanés atteinte : attendez le retour d'un mouvement ou améliorez un centre de commandement. » | `capacity.used ≥ capacity.limit` | Yes |
| « Attention : les ressources dépassent la capacité de stockage de la destination. L'excédent sera renvoyé. » | Transport and `destination_capacity_exceeded` | No |
| « Attention : ce déplacement va supprimer l'avant-poste temporaire. » | Origin is the player's temporary outpost and every unit leaves | No |
| « Limite d'avant-postes atteinte : vos troupes reviendront à leur point de départ. » | « Baser » on `empty` and `outposts.length ≥ count_limit` (`GET /outpost`) | No |
| « En cas d'échec, tous les éclaireurs envoyés sont détruits et la cible est prévenue. » | « Espionner » | No |
| « L'eau ne peut pas être stockée dans un avant-poste : elle reviendra avec les transporteurs. » | Transport with water to an own outpost | No |

**Send**: `useCreateMovement` (`modules/troop/hooks.ts`) with the URL state. On success: toast « Les troupes sont en route » (existing), the destination is pushed to recent targets, and the app navigates to `…/world/movement/<movement_id>?tab=sortants` (the new movement open in the details panel). On error: toast with `translateError` and the wizard stays on step 3 with the same state, so a stale troop count or a lost target can be fixed by going back.

The estimate request is a react-query `useQuery` keyed by origin, destination, troops and cargo (300 ms debounce on inputs), started from step 2 so the recap panel already shows the ETA; it replaces the manual `launchMovementEstimation` effect.

### Embedding (map drawer, 044)

`MovementSendWizard` (`modules/movement/send/index.tsx`) takes:

```ts
interface MovementSendWizardProps {
  origin: { kind: 'city' | 'outpost', id: string }
  /** URL-backed on the route, `useState`-backed in the map drawer. Same shape as the parsed search params. */
  state: MovementSendState
  onStateChange: (next: MovementSendState, options: { push: boolean }) => void
  /** Route: navigate to the new movement. Drawer: show it and its arrow (044). */
  onSent: (movement_id: string) => void
  onCancel: () => void
  /** Drawer: the recap renders below the steps instead of in the right details panel. */
  layout?: 'page' | 'drawer'
}
```

- The route component (`routes/…/world/movement/send.tsx`) maps `Route.useSearch()` ↔ `state` and `navigate` ↔ `onStateChange`.
- The 044 drawer prefill `{ origin, destination, action? }` becomes `state = { step: 'ordre', x, y, action }`; « Retour » goes to step 1 with the destination filled, as 044 requires.
- `MovementSendState` and its parser / serialiser live in `send/search.ts`, so both hosts validate the same way.

## API changes

All additive; older clients keep working.

| Endpoint | Change | Shape |
| --- | --- | --- |
| `GET /troop/movement` | Each entry gains `kind`, `battle_id`, `troops`. | `kind: 'outgoing' \| 'return' \| 'convoy'`, `battle_id: string \| null`, `troops: { code: TroopCode, count: number }[]` |
| `GET /troop/movement/:movement_id` | Gains `kind` and `combat_strategy`. | `kind` as above, `combat_strategy: CombatStrategy \| null` |
| `POST /troop/movement` | Response gains the created id. | `{ movement_id: string, deleted_outpost_id?: string }` |
| `POST /troop/movement/estimate` | Response gains the modifiers already computed by the query. `duration` stays in **seconds** (documented in the type). | `modifiers: { propulsion_level: number, non_combat_speed_multiplier: number, carrier_capacity_multiplier: number }` |
| `GET /city` | Each city gains its coordinates (skip if 041 / 044 already added them). | `cities: { id, name, coordinates: Coordinates }[]` |
| api-client exports | `WORLD_SIZE` from `@server-core/world/constant/size` (skip if 044 already exports it). | — |

[`044`](../044-world-map-revamp/spec.md) also changes `GET /troop/movement` (`departure_at`, from a new `movement.started_at` column) and `GET /troop/movement/incoming` (`origin`, `departure_at` from Détection 2). The two slices touch the same mapper and the same table: whichever lands second adds its fields next to the first one's, and if both are built together they share one migration. When `departure_at` exists, the details panel shows « Départ : HH:mm » and rows get a progress bar under the countdown.

Server touch points: `app/query/troop/movement/list.ts` (batch-load troops with one `troop.listByMovementIds` repository call, add `battle_id` from the battle repository as `get.ts` does), `web/handler/troop/movement/list.ts` / `get.ts` / `create.ts` / `estimate.ts` mappers, `app/command/troop/movement/create.ts` (return the id, set `is_return` on recall), `shared.ts`, `reinforcement/return-home.ts`, `core/troop/movement/entity.ts` (`is_return`), `core/troop/service.ts` `createMovement` (pass-through), `adapter/database/repository/movement.ts`, api-client `endpoints/troop/movement/{list,get,create,estimate}.ts`, `endpoints/city/list.ts`.

## Persistence

Migration (next free number after `00021`, e.g. `00022_movement_return`): `movement.is_return boolean not null default false`. `down` drops the column. No backfill.

## Web components

| New / changed | Path |
| --- | --- |
| List page | `modules/movement/page.tsx` (header, tabs, table, details) |
| Tabs + tables | `modules/movement/list/tabs.tsx`, `list/table.tsx`, `list/row.tsx`, `list/incoming-row.tsx`, `list/sort.ts` (pure sort + tab filter helpers, unit-tested) |
| Location labels | `modules/movement/location-label.ts` |
| Ticker | `apps/web/src/hook/now.ts` (`useNow`) |
| Wizard | `modules/movement/send/index.tsx` (stepper, guards), `send/search.ts` (parse / serialise the URL state, unit-tested), `send/step-destination.tsx`, `send/step-order.tsx`, `send/step-summary.tsx`, `send/recap-panel.tsx`, `send/recent-targets.ts`, `send/actions.ts` (destination × action matrix and troop eligibility, unit-tested) |
| Reused as-is or lightly adapted | `create/resources`, `create/strategy` (also used by `modules/troop/garrison-strategy`), `create/spy`, `create/warning`, `create/troops/input`, `create/destination/coordinate` — moved under `send/` with their tests; imports in `troop/garrison-strategy/index.tsx` updated. |
| Destination info | `modules/movement/api/destination.ts` (`useDestinationInfo` replacing `useDestinationStance`) |
| Routes | `routes/{city/$cityId,outpost/$outpostId}/world/movement/send.tsx` (new), list routes gain `validateSearch` |
| Map panel | `modules/map/details/index.tsx`: the two `MovementCreate compact` blocks become buttons « Explorer cette case » / « Envoyer des troupes ici » linking to the wizard with `x`, `y` (and `action=explore` for unexplored cells). 044 replaces this panel with its own cell actions. |
| Kept for 044 | `modules/movement/details/index.tsx` (`MovementDetails`, enriched), `incoming/details.tsx` (`IncomingMovementDetails`, from `incoming/item.tsx`) — both used by the list details panel and the 044 map drawer |
| Removed | `modules/movement/create/index.tsx`, `create/action`, `create/destination/index.tsx`, `create/destination/location-select.tsx`, `create/estimation`, `list/index.tsx`, `list/item`, `incoming/index.tsx` (logic moved into the new rows) |

## Removed from the current page

- The always-open « Nouveau déplacement » form and its explanatory paragraph.
- The separate red « Attaques entrantes » section above the list (now the « Entrants » tab).
- Card-style movement items with the « Temps restant jusqu'à l'arrivée… » subtitle.
- The automatic action switch when troops change (`useEffect` resetting `action` in `create/index.tsx`).
- The « Ville ou avant-poste » select that fetched each city to read its coordinates (replaced by quick picks fed by `GET /city` coordinates).
- The embedded compact create form in the map details panel.

## Testing

| Area | Cases |
| --- | --- |
| Server — classification | Player-created movements are `outgoing`; explore / transport / spy return trips, reinforce turned back, rebase and automatic reinforcement return are `return`; owner recall is `return`; exchange convoy and its carriers' return are `convoy`; system AI movements are `outgoing`. |
| Server — list / get | `troops` and `battle_id` present (attack in battle); `combat_strategy` on get; create returns `movement_id`; estimate returns `modifiers` (propulsion level, Confederation 1.05 / 1.10, neutral 1 / 1). |
| Server — migration | Column added with default `false`; existing rows readable. |
| Web — tab filter / sort | `sort.ts`: rows land in the right tab by `kind`; arrival asc / desc; action then arrival; ties stable. |
| Web — wizard URL | `search.ts`: round-trip of every param; invalid codes, counts, coordinates and actions dropped; step default and guards (`recap` without troops → `ordre`). |
| Web — action matrix | `actions.ts`: each `DestinationKind` offers exactly the table's actions; `exchange` never offered; spy needs scouts only and Espionnage ≥ 1 (disabled, not hidden, at 0); attack disables scouts and requires one combat unit; reinforce combat only; switching action zeroes forbidden rows. |
| Web — components | Tabs render counts and empty states (Détection 0 vs ≥ 1); countdown reaching 0 invalidates once; summary arrival time uses `duration × 1000`; cap reached disables « Envoyer »; success calls `onSent` (route: navigates to the new movement); the wizard works with a local-state store (drawer host) as with the URL; recent targets survive a throwing `localStorage`. |
| Web — existing tests | `capacity/index.test.tsx`, `create/warning/index.test.tsx`, `spy.test.ts`, `reinforce.test.ts`, `incoming/translations.test.ts` kept (paths updated). |

## Out of scope

- Cancelling or redirecting a movement under way (not a game rule).
- Listing incoming allied reinforcements, incoming spy missions, or the counterparty's exchange convoys delivering to the player (no server data; possible follow-up with a `GET /exchange/convoy/incoming`).
- Multi-origin sends (one movement per send, as today).
- Settling (`settle`) and outpost actions: they are not movements (map / outpost pages, 044).
- Recall of stationed reinforcements from the wizard (stays « Rappeler » on the troop page, 033).
- Tablet / phone layouts.

## Assumptions (confirm on review)

1. **Explore only on unexplored cells**, and no « Explorer » on explored cells: mirrors the current map panel; today's movements page offers every action everywhere.
2. **Transport only to own locations** (city or outpost): the server accepts any destination but only deposits in the sender's own locations (`resolveOwnedDepositTarget`), so elsewhere the cargo just comes back.
3. **« Baser » only to own locations or empty explored cells**, not onto another player's settlement.
4. **Owner recall counts as a return** (« Retours »), and returns show the generic label « Retour » (the originating action is not stored; adding `return_of: MovementAction` is cheap if the reviewer wants « Retour d'exploration » etc.).
5. **Convoy carriers' trip home goes to « Convois »**, not « Retours », so « Retours » only shows troops the player controls.
6. **Default tab is always « Sortants »**, even when attacks are incoming (the tab label turns red with its count instead of auto-switching).
7. **Recent targets are per browser** (`localStorage`), not synced across devices; no server table.
8. **Rows created before the migration** show as « Sortants » until they land (no backfill heuristics).
9. **Changing the origin drops the selected troops and cargo** (they belong to the old location's stacks).
10. The **list refetches every 30 s** while open, on top of countdown expiry and WS events.
11. The **wizard is a page**, not a modal: on its route it uses the main column plus the right details panel for the live recap; the same component also mounts in the 044 map drawer with local state.
12. **Attack and spy stay available on empty explored cells** in the wizard (field stacks), while the 044 cell menu does not offer them there.

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`010`](../010-troop-movement-combat/spec.md) | `movement.is_return`, `kind` on list / get, create returns `movement_id`, estimate `modifiers`. |
| [`028`](../028-command-center-shelter/spec.md) | Cap meter location (list header, wizard recap). |
| [`030`](../030-intelligence/spec.md) | Incoming attacks shown in the « Entrants » tab; spy action gating in wizard step 2. |
| [`033`](../033-alliances/spec.md) | Reinforce offered only for allied cities in step 2; recall and automatic returns listed as « Retours ». |
| [`035`](../035-faction-exchange/spec.md) | Convoys in the « Convois » tab. |
| [`044`](../044-world-map-revamp/spec.md) | Wizard deep-link contract (`…/send?x=&y=&action=`), details route for movement arrows. |
| [`019`](../019-web-shell-routing/spec.md) | New `send` routes and list search params. |

## Evidence index

| Area | Paths |
| --- | --- |
| Current web page | `apps/web/src/modules/movement/page.tsx`, `create/index.tsx`, `create/{action,destination,destination/coordinate,destination/location-select,estimation,resources,spy,strategy,troops,troops/input,warning}/index.tsx`, `list/index.tsx`, `list/item/index.tsx`, `incoming/{index,item,translations}.tsx/ts`, `details/index.tsx`, `capacity/index.tsx`, `spy.ts`, `reinforce.ts`, `cargo.ts`, `translations.ts`, `api/{destination,estimate}.ts` |
| Routes | `apps/web/src/routes/city/$cityId/world/movement/{route,$movementId}.tsx`, `routes/outpost/$outpostId/world/movement/{route,$movementId}.tsx`, `routes/city/$cityId/movement/{route,$movementId}.tsx` (redirects), `routes/city/$cityId/world/map.tsx` (`x` / `y` search pattern) |
| Other web users | `apps/web/src/modules/map/details/index.tsx` (`MovementCreate compact`), `modules/troop/garrison-strategy/index.tsx` (`MovementCreateCombatStrategy`), `modules/troop/hooks.ts` (`useListMovements`, `useListIncomingMovements`, `useMovementCapacity`, `useCreateMovement`, `troopKeys`), `hook/timer.ts`, `helpers/transform.ts` (`formatTime` in seconds), `ui/layout/page.tsx`, `ui/layout/details/empty.tsx`, `ui/entity-thumb.tsx` |
| Server movement | `apps/server/src/app/command/troop/movement/{create,rebase,shared,attack-target,spy-target,reinforce-target}.ts`, `finish/{explore,transport,spy,reinforce,exchange,base}.ts`, `app/command/troop/reinforcement/return-home.ts`, `app/command/combat/apply-battle-outcomes.ts` (no attack return trip), `app/query/troop/movement/{list,get,estimate,capacity,incoming}.ts`, `web/handler/troop/movement/{list,get,create,estimate,capacity,incoming}.ts`, `web/router.ts`, `core/troop/movement/entity.ts`, `core/troop/constant/{movement-action,role}.ts`, `core/troop/service.ts` (`assertAttackArmy`, `assertReinforcementArmy`, `assertTransportResources`), `core/intel/service.ts` (detection levels), `core/faction/constant/logistics-modifier.ts`, `core/world/constant/size.ts` |
| API client | `packages/api-client/src/endpoints/troop/movement/{list,get,create,estimate,capacity,incoming}.ts`, `endpoints/troop/reinforcement/list.ts`, `endpoints/world/get-cells.ts`, `endpoints/city/list.ts`, `endpoints/outpost/list.ts`, `index.ts` |
