# Slice 041 — App shell and navigation

**Status**: Implemented on `main`.

## Summary

Rework the authenticated shell ([`019`](../019-web-shell-routing/spec.md)) for a 1920 × 1080 screen, with the type scale and flat surfaces of [`040`](../040-readability-typography-theme/spec.md):

- **One bar less**: the horizontal « Activité » strip (`ui/activity/index.tsx`, chips Construction / Recherche / Recrutement / Défense / Déplacement) is **removed** from the top and **merged into the left column**. Each location page entry of the left column carries its own activity line (current job, progress, time left, queue depth, idle / finishing states). Today those chips are the **only** links to the buildings, technologies, troops and defense pages, so the left column also gains these entries.
- **Right column stays**: the location list (cities, outposts), more readable, with an incoming-attack marker per location.
- **Chat** stays a collapsible bottom panel, a little taller when open.
- **Header resources: compact + expandable**: the header shows only the stock of each resource (plastic, mushroom, plasma, water, energy). Clicking opens a panel with the rate per hour, warehouse capacity and fill, time to full, and the production breakdown (base, cell, faction, technology, energy) built from fields the city / outpost `GET` already returns.
- **Keyboard and ARIA basics**: skip link, landmarks, `aria-current`, disclosure pattern for the resource panel, tabs pattern for the chat, progress bars with text values.

One small server change: the location activity endpoint ([`013`](../013-location-activity/spec.md)) gains the fortification batch and the queue depths, so the left column needs a single request per location (today the Défense chip makes a second request to `GET /city/:city_id/defense`).

Source of truth for the decisions: [`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md).

**Depends on**: [`040`](../040-readability-typography-theme/spec.md) (tokens, surfaces, guard), [`019`](../019-web-shell-routing/spec.md), [`013`](../013-location-activity/spec.md), [`022`](../022-timing-and-resources/spec.md) / [`015`](../015-resources-model/spec.md) (resources), [`027`](../027-military-economy-technologies/spec.md) (technology multipliers), [`028`](../028-command-center-shelter/spec.md) (movement cap, recruitment queue), [`029`](../029-city-defenses/spec.md) (fortification queue), [`030`](../030-intelligence/spec.md) (incoming attacks), [`032`](../032-messaging/spec.md) (chat), [`035`](../035-faction-exchange/spec.md) (water), [`036`](../036-faction-symbiosis/spec.md) (faction multiplier).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Target** | 1920 × 1080 desktop (viewport ≈ 1920 × 960). |
| **Activity strip** | Removed from the top; its content lives in the **left column**, under the matching page entry. |
| **Left column** | Location section (entries of the current city or outpost, each with its activity line), then the empire-wide entries, then « Se déconnecter ». Fixed **256 px**, not collapsible. |
| **Right column** | Location list stays on the right, **224 px**. |
| **Chat** | Collapsible bottom panel, full width; **40 px** collapsed, **288 px** open. |
| **Header resources** | Compact: **stock only** per resource (plastic, mushroom, plasma, water, energy). Click → **panel** with rates per hour, warehouse capacity / fill, production breakdown (cell, technology, faction; plus base and energy ratio). |
| **Activity data** | One `GET /city/:city_id/activity` (or `/outpost/:outpost_id/activity`) per current location, extended with fortification and queue depths. |
| **Motion** | No pulsing glow on the header and the two columns (`neon-amber` removed there); active entries use a static highlight. |

## Layout at 1920 × 1080

Viewport ≈ 1920 × 960 CSS px. Chat collapsed.

```
x=0          256                                                                   1696          1920
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐ y=0
│ EONEOM      │  Nouvelle-Rouille  12.7   [⚠ 2 attaques entrantes]   │ ▣12,4k ▣8,2k ▣340 ▣1,2k ⚡120/150 ▾│ header 56 px
│ Command term│                                                        │   ┌── resource panel (760 px) ──┐ │
├─────────────┼────────────────────────────────────────────────────────────────────────┼─────────────┤ y=56
│ COLONIE     │                                                                        │ EMPLACEMENTS│
│ Nouvelle-R. │                                                                        │             │
│─────────────│                                                                        │ Villes 2/3  │
│▌Tableau de  │                                                                        │▌Nouvelle-R.●│ ● = incoming
│ bord        │                 WORKSPACE  <main id="workspace">                       │  Ferraille  │   attack
│ Bâtiments +2│                 1440 × 864 px, padding 24 px                           │             │
│ Usine rec.→5│                 → 1392 px of content                                   │ Avant-postes│
│ ██████░ 4:12│                 flat bg-chrome, scrolls vertically                     │ 3/5         │
│ Technologies│                                                                        │ PERMANENTS  │
│ Agronomie→3 │                                                                        │  12.9       │
│ ███░░ 1:12:4│                                                                        │  14.2       │
│ Troupes     │                                                                        │ TEMPORAIRES │
│ Libre       │                                                                        │  11.7       │
│ Défense     │                                                                        │             │
│ Enceinte re.│                                                                        │             │
│ Déplacem 3/7│                                                                        │             │
│ prochain 0:4│                                                                        │             │
│ ⚠ 2 attaques│                                                                        │             │
│ Carte       │                                                                        │             │
│ EMPIRE      │                                                                        │             │
│ Rapports  3 │                                                                        │             │
│ Courrier  1 │                                                                        │             │
│ Alliance    │                                                                        │             │
│ Classements │                                                                        │             │
│ Bourse      │                                                                        │             │
│[Déconnexion]│                                                                        │             │
├─────────────┴────────────────────────────────────────────────────────────────────────┴─────────────┤ y=920
│ ▸ DISCUSSION   [GLOBAL] [FACTION] [ALLIANCE] •                                                      │ chat 40 px
└───────────────────────────────────────────────────────────────────────────────────────────────────┘ y=960
   256 px                                   1440 px                                         224 px
```

Shell markup (`App.tsx`):

```
<a class="skip-link" href="#workspace">Aller au contenu</a>
<div class="app-shell flex h-full flex-col">
  <Header />                                   // 56 px, surface-frame
  <div class="app-body flex min-h-0 flex-1">
    <NavMenu />                                // <nav aria-label="Navigation principale">, w-64
    <main id="workspace" tabIndex={-1} class="min-w-0 flex-1 overflow-auto bg-chrome p-6">
      <Outlet />
    </main>
    <NavLocation />                            // <aside aria-label="Emplacements">, w-56
  </div>
  <ChatPanel />                                // 40 px / 288 px
  <FxLayer />                                  // bursts only (040)
</div>
```

`<ActivityStrip />` and the `ui/activity/` folder are deleted. `main` loses `surface-inset scanlines` and its `p-3` becomes `p-6` (24 px). Heights with the chat open: workspace 1440 × 616 px.

## Left column (`ui/nav/menu`)

### Structure

```
<nav aria-label="Navigation principale">     256 px, surface-frame, border-r border-rust/70, overflow-y-auto, p-3
  Location section  (city or outpost currently selected in LocationContext)
    section label    « COLONIE » / « AVANT-POSTE »        text-caption uppercase text-label
    location name    city name / outpost coordinates      text-body font-semibold text-amber (truncate + title)
    entries          (table below), each 36 px + optional activity line
  Empire section
    section label    « EMPIRE »
    entries          Rapports, Courrier, Alliance, Classements, Bourse, Observabilité IA (admins)
  « Se déconnecter »  pinned at the bottom (mt-auto), ghost button
```

On empire-wide routes (`/inbox/*`, `/alliance`, `/ranking`, `/exchange`, `/admin`), the location section still shows the **last selected location** (kept by `LocationProvider`), so its activity stays visible everywhere.

### City entries

| Entry (FR) | Route | Activity line (from the activity endpoint) |
| --- | --- | --- |
| « Tableau de bord » | `/city/$cityId/base/` | none |
| « Bâtiments » | `/city/$cityId/base/building` | `building` + `building_queue_depth` |
| « Technologies » | `/city/$cityId/base/technology` | `research` (player-wide; shows the city when it runs elsewhere) + `research_queue_depth` |
| « Troupes » | `/city/$cityId/base/troop` | `recruitment` + `recruitment_queue_depth` |
| « Défense » | `/city/$cityId/base/defense` | `fortification` + `fortification_queue_depth`, `fortification_available` |
| « Déplacements » | `/city/$cityId/world/movement` | `movements` (count, next arrival) + movement cap (`useMovementCapacity`) + incoming attacks on this city (`useListIncomingMovements`, `target.id === cityId`) |
| « Carte » | `/city/$cityId/world/map` | none |

The current « Colonie » label becomes « Tableau de bord » (the section label already says « Colonie »).

### Outpost entries

| Entry (FR) | Route | Activity line |
| --- | --- | --- |
| « Tableau de bord » | `/outpost/$outpostId` | none |
| « Déplacements » | `/outpost/$outpostId/world/movement` | movements + cap + incoming attacks on this outpost (`target.kind === 'outpost' && target.id === outpostId`) |
| « Carte » | `/outpost/$outpostId/world/map` | none |

Outposts have no buildings, research, recruitment or fortification, so those entries are absent (not disabled). The location name line shows the coordinates (`font-mono`) and the type as `text-caption`: « Permanent » / « Temporaire ».

### Empire entries

| Entry (FR) | Route | Badge |
| --- | --- | --- |
| « Rapports » | `/inbox/report` | unread count (`useCountUnreadReports`), hidden at 0 |
| « Courrier » | `/inbox/mail` | unread count (`useCountUnreadMail`), hidden at 0 |
| « Alliance » | `/alliance` | — |
| « Classements » | `/ranking` | — |
| « Bourse » | `/exchange` | — |
| « Observabilité IA » | `/admin` | — (only when `useObservabilitySession().is_admin`) |

Badges replace today's « Rapport (3) » text: a right-aligned pill `text-caption font-mono`, `bg-copper/30 text-amber`, with a visually hidden « non lus » for screen readers. « Rapport » becomes the plural « Rapports ».

### Entry and activity line rendering

| Part | Style |
| --- | --- |
| Entry row | `RouterLink`, block, `px-2 py-1.5`, `text-body`, `text-amber-dim`, hover `bg-chrome-3/60 text-amber`. Right slot (queue depth « +2 », cap « 3/7 », badge) `text-caption font-mono text-label`. |
| Current entry | `aria-current="page"`, `bg-chrome-3 text-amber`, 2 px left bar `border-l-2 border-amber` (static, no `neon-amber`). The « Tableau de bord » entry matches its exact path only; the others match their path and sub-paths (movement details). |
| Activity line | Under the entry, inside the same link, indented `pl-2`: one `text-meta` line plus, while a job runs, a 4 px progress bar with the time left (`text-caption font-mono`) at its right. Linked to the entry with `aria-describedby`. |

Activity line states:

| State | Condition | Display |
| --- | --- | --- |
| **Libre** | No running job and empty queue | « Libre » in `text-terminal` (a free slot is something to act on). |
| **En cours** | Running job | `<name> → <level + 1>` (building, technology) or `<remaining_count> <troop / defense name>` (recruitment, fortification); bar `bg-amber`; time `formatDurationMmSs(remaining)`; queue depth in the entry's right slot as « +N ». Research running in another city adds « · <city_name> ». |
| **Bientôt fini** | Running and (`elapsedProgress ≥ 0.9` or remaining ≤ 60 s) | Same, time in `text-amber font-semibold`. (Today's `urgent` chip state.) |
| **Terminé** | Countdown reached 0, refetch not yet back | « Terminé » in `text-terminal`; triggers `invalidateQueries(activityKeys.all)` once (`useCountdownProgress` `onDone`). |
| **Indisponible** | Défense with `fortification_available === false` | « Enceinte requise » in `text-label`. |
| **Mouvements** | Déplacements entry | « Aucun » when `movements.count = 0`; otherwise « Prochaine arrivée 00:42 » (countdown on `next_arrive_at`); right slot « used/limit » from `useMovementCapacity`, `text-danger` when `used ≥ limit`. |
| **Menace** | Incoming attacks on this location (list non-empty; detection-gated by the server, [`030`](../030-intelligence/spec.md)) | Extra line « ⚠ N attaque(s) entrante(s) · mm:ss » (earliest `arrive_at`) in `text-danger`; the entry gets `border-l-2 border-danger` when not current. |

Countdowns tick locally (`useCountdownProgress`); nothing is announced by screen readers on each tick (no `aria-live` on timers). Completion already raises a toast and an FX burst.

### Components

| File | Role |
| --- | --- |
| `ui/nav/menu/index.tsx` | `NavMenu`: column frame, location section, empire section, logout. |
| `ui/nav/menu/entry.tsx` (new) | `NavEntry`: link row, current state, right slot, optional activity line. |
| `ui/nav/menu/activity.tsx` (new) | `BuildingActivity`, `ResearchActivity`, `RecruitmentActivity`, `FortificationActivity`, `MovementActivity`: logic moved from today's chips in `ui/activity/index.tsx`, rendering the states above. |
| `ui/activity/index.tsx` | Deleted. |
| `modules/location/activity-hooks.ts` | `useLocationActivity` kept (15 s polling kept as a safety net). The unused `useActivityWsBridge` is deleted. |

## Location activity endpoint (server + api-client)

`GET /city/:city_id/activity` and `GET /outpost/:outpost_id/activity` ([`013`](../013-location-activity/spec.md)) gain fields. Existing fields are unchanged.

| Field | Type | City | Outpost | Source |
| --- | --- | --- | --- | --- |
| `research.city_id`, `research.city_name` | `string` | ✓ | ✓ | `pending_research.city_id`, city name lookup |
| `research_queue_depth` | `number` | player-wide | player-wide | `repository.technology_research_queue.listByPlayer({ player_id }).length` |
| `recruitment_queue_depth` | `number` | ✓ | 0 | `repository.troop_recruit_queue.listByCity({ city_id }).length` |
| `fortification` | `{ code: DefenseCode, remaining_count, finish_at, started_at } \| null` | ✓ | `null` | `job_queue.getPendingDefenseBuildProgress({ city_id })` + defense code lookup, same as `app/query/defense/list.ts` |
| `fortification_queue_depth` | `number` | ✓ | 0 | `repository.defense_build_queue.listByCity({ city_id }).length` |
| `fortification_available` | `boolean` | `city_wall` level ≥ 1 | `false` | `repository.building.getLevel({ city_id, code: BuildingCode.CITY_WALL })` |

Files: `apps/server/src/app/query/location/activity.ts`, `apps/server/src/web/handler/location/activity.mapper.ts`, `packages/api-client/src/endpoints/location/activity.ts` (`LocationActivityFortification`, new fields on `LocationActivityDataResponse`).

### Realtime

Existing listeners already invalidate `activityKeys.all` on `BuildingUpgradeFinished`, `TechnologyResearchFinished`, `TroopRecruitmentUpdated`, `TroopMovementFinished`, `BattleFinished`. Added:

| Event | Listener file | Added invalidation |
| --- | --- | --- |
| `DefenseBuildUpdated`, `DefenseQueueItemDropped` | `modules/defense/ws-listener.ts` | `activityKeys.all` |
| `BuildingQueueItemDropped` | `modules/building/ws-listener.ts` | `activityKeys.all` |
| `TechnologyQueueItemDropped` | `modules/technology/ws-listener.ts` | `activityKeys.all` |
| `TroopQueueItemDropped` | `modules/troop/ws-listener.ts` | `activityKeys.all` |
| `ExchangeFilled` (convoys start) | `modules/exchange/ws-listener.ts` | `activityKeys.all` |
| Defense build / cancel mutations | `modules/defense/hooks.ts` | `activityKeys.all` (like the building, research and recruit mutations) |

## Header (`ui/header`)

| Zone | Content | Style |
| --- | --- | --- |
| Left (256 px, aligned with the left column) | « EONEOM » + « Command terminal » | `text-title tracking-[0.12em] text-amber` / `text-caption uppercase tracking-wider text-label` (was 9.6 px) |
| Centre | Location title link (`HeaderTitle`: city name or outpost coordinates) + coordinates for cities + incoming attacks badge (`HeaderIncomingAttacks`, unchanged behaviour) | title `text-heading`; coordinates `text-meta font-mono text-label`; badge `text-caption uppercase` on `bg-danger-deep/50 border-danger` |
| Right | Compact resources button (below) | — |

The header is `surface-frame`, 56 px high, `border-b border-rust/80`; `neon-amber motion-safe-neon` is removed.

### Compact resources

One `<button type="button">` holding one chip per resource, followed by a chevron (▾ closed, ▴ open).

| Chip | City | Outpost | Value | State colours |
| --- | --- | --- | --- | --- |
| Plastic | ✓ | ✓ | `plastic` stock | `text-amber`; 6 px `bg-danger` dot after the value when stock ≥ 90 % of `warehouses_capacity.plastic`; `text-danger` when ≥ 100 % |
| Mushroom | ✓ | ✓ | `mushroom` stock | same with `warehouses_capacity.mushroom` |
| Plasma | ✓ | ✓ | `plasma` stock | `text-amber` (unlimited storage) |
| Water | ✓ | — (no water at outposts, [`035`](../035-faction-exchange/spec.md)) | `water` stock | `text-amber` (unlimited) |
| Energy | ✓ | — | `energy_consumption / energy` (energy has no stock: consumption over production) | `getEnergyDisplayStatus`: `text-terminal` / `text-amber` / `text-danger` |

Chip: resource icon 20 px (`ui/icon/*`, `text-label`) + value `text-body font-mono font-medium tabular-nums` via `transformDecimals` (« 12,4k »). Each chip has `title` with the exact value and a visually hidden name (« Plastique 12 480 »). `transformDecimals(0)` returns `''` today; it is fixed to return « 0 ». The per-chip hourly rate line (10.4 px) and the two progress bars / tooltips of today's `HeaderResourcesItem` are removed from the bar: they move to the panel.

Button attributes: `aria-expanded`, `aria-controls="resource-panel"`, accessible name « Ressources — afficher le détail ».

### Resource panel

A non-modal disclosure rendered right after the button, anchored under the header's right edge: `id="resource-panel"`, `role="region"`, `aria-labelledby` its title, width **760 px**, `surface-panel p-4`, `z-30`, shadow `0 8px 24px rgba(0,0,0,.45)`.

**1. « Stocks et entrepôts »**

| Column | Plastic / mushroom | Plasma | Water |
| --- | --- | --- | --- |
| « Stock » | stock | stock | stock |
| « Capacité » | `warehouses_capacity.*` | « illimitée » | « illimitée » |
| « Remplissage » | 8 px bar + percent (`stock / capacity`); `bg-amber`, `bg-danger` from 90 % | — | — |
| « Plein dans » | `transformApproximateTimeUntilSeconds(warehouse_full_in_seconds.*)`, « plein » when stock ≥ capacity, « — » when production is 0 | — | — |
| « Production / h » | `transformHourlyEarnings(earnings_per_second.*)` | same | same |

**2. « Détail de la production (par heure) »** — replaces `ui/production-terrain-readout.tsx` with a 4-row `ui/production-breakdown-table.tsx`:

| Column | Source | Plastic | Mushroom | Plasma | Water |
| --- | --- | --- | --- | --- | --- |
| « Base » | `pre_cell_earnings_per_second.* × 3600` | ✓ | ✓ | ✓ | ✓ |
| « Terrain » | `cell_resource_coefficient.*` as « ×1,2 » | ✓ | ✓ | « ×1 » (fixed until the map rework) | « ×1 » |
| « Faction » | `faction_production_multiplier.*` via `formatTechnologyBonus` (« +10 % », « — » when 1) | ✓ | ✓ | « — » (not exposed) | « — » |
| « Techno » | `technology_production_multiplier.*` via `formatTechnologyBonus` | ✓ | ✓ | ✓ | « — » (never applies) |
| « Énergie » | `production_energy_ratio` as a percent; `text-danger` below 100 % | ✓ | ✓ | ✓ | ✓ |
| « Actuelle » | `earnings_per_second.* × 3600` | ✓ | ✓ | ✓ | ✓ |

Footnote (`text-meta text-amber-dim`): « Actuelle = base × terrain × faction × techno × énergie (valeurs arrondies par le serveur). » When `production_energy_ratio < 1`: « Production réduite à N % par manque d'énergie. » in `text-danger`.

**3. « Énergie »** (cities): the existing `EnergyReadout` with its breakdown (consumption, base, optimisation, sun, production, usage bar).

Outposts: section 1 without water; section 2 with plastic, mushroom, plasma and without the « Énergie » column (outposts have no energy fields); no section 3. A **temporary** outpost shows section 1 only with « Production / h » « — », plus « Avant-poste temporaire : aucune production. Rendez-le permanent pour produire. ».

Behaviour:

| Action | Result |
| --- | --- |
| Click / Enter / Space on the button | Toggles the panel. |
| `Escape` inside the panel or on the button | Closes, focus returns to the button. |
| Click outside the panel and the button | Closes. |
| Route or location change | Closes. |
| « Fermer » (panel title row, `Button variant="ghost"`) | Closes, focus returns to the button. |
| Data refresh | Live: same `useGetCity` / `useGetOutpost` queries (refreshed by `CityResourcesGathered` / `OutpostResourcesGathered`). |

Tab order runs from the button into the panel (DOM order); there is no focus trap. Open state is not persisted. [`042`](../042-city-dashboard/spec.md) opens the same panel from the dashboard production card, so the open state lives in a small context `ResourcePanelProvider` (`ui/header/resources/context.tsx`) exposing `open()`, `close()`, `isOpen`.

## Right column (`ui/nav/location`)

| Part | Change |
| --- | --- |
| Frame | `<aside aria-label="Emplacements">`, **224 px** (`w-56`, was `w-44`), `surface-frame`, `border-l border-rust/70`, `p-3`, `overflow-y-auto`. |
| Title | « Emplacements » `text-caption uppercase tracking-wider text-label` (was 10.4 px). |
| Group headers | « Villes 2/3 », « Avant-postes 3/5 » `text-meta text-label`; sub-groups « Permanents » / « Temporaires » `text-caption uppercase` (were 10.4 px). |
| Items | `text-body`, 36 px rows; outposts `font-mono`; long names `truncate` with `title`. |
| Current item | `aria-current="page"`, `bg-chrome-3 text-amber border-l-2 border-amber`; `neon-amber` removed (`ui/nav/location/item.tsx`). |
| Threat marker | 8 px `bg-danger` dot at the right of a city / outpost targeted by an incoming attack (`useListIncomingMovements`, `target.id`, already fetched by the header), with visually hidden « attaque entrante » and `title` « Attaque entrante ». Hidden below detection 1 (the server returns nothing). |
| Ordering | Unchanged (API order for cities; outposts sorted by coordinates). |

## Chat (`modules/communication/chat/panel.tsx`)

| Part | Change |
| --- | --- |
| Frame | `surface-frame` (was `surface-chrome`), full width, `border-t border-rust/70`. |
| Collapsed | 40 px bar: toggle « Discussion » (`text-caption uppercase`), channel tabs, unread dots. |
| Open | **288 px** (`h-72`, was `h-64`). |
| Text | Message lines `text-meta`, body `text-ink`; author names keep their faction colour; timestamps `text-caption font-mono text-label`; « charger plus » `text-meta`; input `text-body`; « Envoyer » `Button` style (`text-meta uppercase`); action menu items `text-meta`. |
| Toggle | `aria-expanded` + `aria-controls` pointing at the message area. |
| Tabs | WAI-ARIA tabs: `role="tablist"` with `aria-label="Canaux"`, `role="tab"` + `aria-selected` + `aria-controls`, roving `tabIndex`, `ArrowLeft` / `ArrowRight` / `Home` / `End` move between tabs, Enter / Space selects (and opens the panel). |
| Messages | List container `role="log"` (polite) so new messages are announced only while the panel is open. |
| Persistence | Unchanged (`chat-panel` key in `localStorage`, `modules/communication/chat/storage.ts`). |

## Keyboard and ARIA basics (shell)

| Item | Rule |
| --- | --- |
| Skip link | First focusable element: « Aller au contenu », visually hidden until focused, targets `#workspace` (`tabIndex={-1}`). |
| Landmarks | `header` (banner), `nav aria-label="Navigation principale"`, `main#workspace`, `aside aria-label="Emplacements"`, `section aria-label="Discussion"`. |
| Current page | `aria-current="page"` on the active entry of both columns. |
| Focus | `focus-visible` amber outline from [`040`](../040-readability-typography-theme/spec.md) on every link, button and tab; no `outline-none` without replacement. |
| Progress | Activity bars use `role="progressbar"` with `aria-valuenow` (0–100) and `aria-valuetext` (« Usine de recyclage niveau 5, 04:12 restantes »); the time is also visible as text. |
| Badges | Counts carry a visually hidden label (« 3 non lus », « attaque entrante »). |
| Shortcuts | No global keyboard shortcuts in this slice. |

## Testing

| Area | Cases |
| --- | --- |
| Activity query (server) | New `apps/server/src/app/query/location/activity.spec.ts`: fortification running / none; `fortification_available` from the Enceinte level; queue depths (building, research player-wide, recruitment, fortification); research city id and name; outpost → fortification `null`, depths 0, `fortification_available` false; existing fields unchanged. |
| Left column | `ui/nav/menu/index.test.tsx`: city entries and hrefs; outpost entries only (no Bâtiments / Technologies / Troupes / Défense); empire entries; admin entry gated; `aria-current`; activity line states Libre / En cours / Bientôt fini / Terminé (with `invalidateQueries`) / Enceinte requise; research in another city shows its name; queue depth « +N »; movement cap « used/limit » red when full; incoming-attack line for the current location only. |
| Header resources | `ui/header/resources/index.test.tsx` rewritten: 5 chips for a city, 3 for an outpost, no water / energy for outposts, no progress bar in the bar; zero stock shows « 0 »; ≥ 90 % dot and ≥ 100 % danger; button toggles the panel (`aria-expanded`); Escape and « Fermer » close and restore focus; outside click closes. |
| Resource panel | Rows and capacity « illimitée »; fill percent; breakdown: technology 1.15 → « +15 % », faction 1 → « — », energy ratio 0.8 → « 80 % » and warning line; water techno « — »; temporary outpost note; outpost without energy column. |
| Header | `ui/header/index.test.tsx` updated (no progress bars in the bar; brand and title links unchanged). |
| Right column | `ui/nav/location/city/index.test.tsx`, `outpost/index.test.tsx`: threat dot when an incoming attack targets the location, absent otherwise; `aria-current`. |
| Chat | `modules/communication/chat/panel.test.tsx`: arrow-key tab navigation, `aria-selected`, `role="log"`, open height class. |
| Shell | `App` renders the skip link and the landmarks; no `ActivityStrip`. |
| Guard | [`040`](../040-readability-typography-theme/spec.md) guard passes on every touched file. |

## Out of scope

- Collapsing the left column, tablet / phone layouts.
- Empire-wide activity (every city's queues at once): the left column shows the current location only; an empire overview stays with [`031`](../031-empire-overview/spec.md).
- Coordinates in the right column for cities (`GET /city` returns no coordinates).
- Global keyboard shortcuts, command palette.
- Dashboard content (`042`), catalogue / map / movements / Bourse layouts (043–047).

## Assumptions (confirm on review)

| # | Assumption |
| --- | --- |
| 1 | The left column is **not collapsible** (256 px always): at 1920 there is room, and collapsing would hide the activity lines that replace the strip. |
| 2 | The left column shows the activity of the **current location only**, not of every city. |
| 3 | Outposts show only « Tableau de bord », « Déplacements » and « Carte »; the player-wide research is not shown in an outpost's section. |
| 4 | Entries are text only (no icons): there is no icon set beyond the resource icons. |
| 5 | The energy chip shows « consumption / production » (energy has no stock); a warehouse at ≥ 90 % shows a danger dot, at 100 % a danger colour. These are the only "state" hints kept in the compact bar. |
| 6 | The resource panel is a non-modal popover of 760 px, not persisted, also openable from the dashboard (`042`) through a small context. |
| 7 | The incoming-attack badge stays in the header centre (as today) and is repeated in the left column and as a dot in the right column. |
| 8 | « Colonie » becomes the section label and the dashboard entry is called « Tableau de bord »; « Rapport » becomes « Rapports »; unread counts become badges hidden at 0. |
| 9 | Chat open height 288 px, message text 14 px (`text-meta`). |
| 10 | The activity endpoint is extended rather than adding a second request per location; the 15 s polling stays as a safety net. |

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`019`](../019-web-shell-routing/spec.md) | Shell: no activity strip; left column with location entries and activity; resource panel; skip link and landmarks; Global UI table. |
| [`013`](../013-location-activity/spec.md) | New response fields; web consumer is the left column (not `ui/activity`). |
| [`032`](../032-messaging/spec.md) | Chat panel height, tabs keyboard pattern, `role="log"`. |
| [`030`](../030-intelligence/spec.md) | Incoming attacks also shown in the left column and the right column. |
| [`035`](../035-faction-exchange/spec.md) | Header water: stock in the bar, rate in the panel. |
| `README.md` (specs index) | Slice 041 row. |

## Implementation notes

- **Shell** (`App.tsx`): `ResourcePanelProvider` wraps the shell; the skip link « Aller au contenu » is the first focusable element and focuses `main#workspace` (`tabIndex={-1}`) on click without touching the router URL (`preventDefault` + `focus()`); `.skip-link` in `index.css` slides in on focus. `<ActivityStrip />` and `ui/activity/` are deleted. `main` keeps the 040 border and `flex flex-col` (the catalogue pages size themselves with `min-h-0 flex-1`), `overflow-hidden` became `overflow-y-auto` so non-flex pages scroll vertically.
- **Left column** (`ui/nav/menu`): `NavEntry` (`entry.tsx`) names each link with `aria-labelledby` (label + right slot, e.g. « Bâtiments +2 en file », « Rapports 3 non lus ») and links the activity line with `aria-describedby`, so the activity is a description rather than part of the name. Queue depth, movement cap and badges carry visually hidden words (« en file », « déplacements utilisés », « non lus »). The activity lines (`activity.tsx`) render the states of the spec; « Terminé » calls `useInvalidateLocationActivity` from `useCountdownProgress` `onDone` (once per job end). One extra state: a job-less slot with a non-empty queue shows « En attente » (`text-label`), so « Libre » stays reserved for "no job and empty queue". The location name comes from `useGetCity` / `useGetOutpost` (same queries as the header). The section is hidden only when no location was ever selected.
- **Activity endpoint**: `LocationActivityQuery` fetches the new data in the same `Promise.all` (research queue by player, recruit / defense queues by city, `getPendingDefenseBuildProgress`, Enceinte level) and the research city name with the research lab level; outposts skip every city-only call. `LocationActivityFortification` is added to the query and the api-client; the mapper copies the new fields.
- **Realtime**: `activityKeys.all` is invalidated by the listeners and the three defense mutations listed in the spec (build, cancel, cancel queued). `useActivityWsBridge` (never mounted) is deleted; `useLocationActivity` now checks the token before calling the client.
- **Header**: 56 px grid `16rem | 1fr | auto` (brand aligned with the left column); the city coordinates follow the title. `HeaderResources` is one `<button>` (`aria-label` « Ressources — afficher le détail », `aria-describedby` the chips, `aria-expanded`, `aria-controls="resource-panel"`) holding `HeaderResourceChip`s (`item/index.tsx`, spans because a button only takes phrasing content); each chip has a `title` and a visually hidden « Plastique 12 480[, entrepôt presque plein] ». Escape (on the button or inside the panel) and « Fermer » close and refocus the button; a document `mousedown` outside the panel and the button closes; a pathname or location change closes. The header is `z-30` so the panel stays above an open chat panel.
- **Resource panel** (`panel.tsx`): three sections as specified. The `EnergyReadout` is rendered without `productionEnergyRatio`, since the breakdown footnote already carries the « Production réduite à N % » warning. Fill bars are `role="progressbar"` with « N % » next to them.
- **Breakdown table** (`ui/production-breakdown-table.tsx`, with `formatTechnologyBonus`, `cityProductionRows`, `outpostProductionRows`) replaces `ui/production-terrain-readout.tsx` everywhere: the resource panel, the city page and the outpost page (the city page's separate plasma / water rate lines are dropped, the table has those rows). Values are hourly amounts without the « ~…/h » decoration; the outpost footnote omits « × énergie ».
- **Right column**: `NavLocation` derives the threatened ids from `useListIncomingMovements` and passes them to `NavLocationCities` / `NavLocationOutposts` (`threatenedIds` prop). The current item test was tightened to `href` or `href/…` (a city id prefix no longer matches another city). The unused `helpers/classname.ts` (`getActiveClassName`) is deleted.
- **Chat**: manual-activation tabs (arrows / Home / End move the focus, click / Enter / Space select and open); the message area is a `tabpanel` (`id="chat-messages"`, always in the DOM, `hidden` when collapsed) that holds the `role="log"` list; « Envoyer » uses `Button`.
- **`transformDecimals`**: 0 → « 0 », `undefined` / `NaN` → « ». Formatting keeps the existing dot decimals (« 12.48k », « ×1.2 ») used across the client; the « 12,4k » / « ×1,2 » of the spec were not applied to avoid mixed separators. The per-minute / per-day helpers (`formatEarningsRates`, `transformMinuteEarnings`, `transformDailyEarnings`) and `ui/tooltip.tsx`, only used by the old header item, are deleted.
- **Tests**: header and outpost page tests stub `localStorage` (jsdom here has none), which makes the 7 header and 5 outpost page baseline failures pass.

## Follow-ups

- **Visual pass**: not checked in a browser at 1920 × 1080 (running the app needs a signed-in player in the local database); only unit tests and the build were run.
- **Decimal separator**: switch the client to French number formatting (« 12,4k », « ×1,2 ») in one pass, not per screen.
- **Building / research queue mutations** (cancel, cancel queued) still refresh the left column through the WebSocket drop events and the 15 s polling only.

## Evidence index

| Area | Paths |
| --- | --- |
| Shell | `apps/web/src/App.tsx` (skip link, landmarks, `ResourcePanelProvider`, no `ActivityStrip`), `apps/web/src/App.test.tsx`, `apps/web/src/index.css` (`.skip-link`) |
| Left column | `apps/web/src/ui/nav/menu/index.tsx`, `ui/nav/menu/entry.tsx`, `ui/nav/menu/activity.tsx`, `ui/nav/menu/index.test.tsx`; deleted `apps/web/src/ui/activity/`, `apps/web/src/helpers/classname.ts` |
| Activity | `apps/server/src/app/query/location/activity.ts`, `activity.spec.ts`, `apps/server/src/web/handler/location/activity.mapper.ts`, `packages/api-client/src/endpoints/location/activity.ts`, `apps/web/src/modules/location/activity-hooks.ts` |
| Realtime | `apps/web/src/modules/{defense,building,technology,troop,exchange}/ws-listener.ts`, `modules/defense/hooks.ts` |
| Header | `apps/web/src/ui/header/index.tsx`, `ui/header/incoming/index.tsx`, `ui/header/resources/index.tsx`, `ui/header/resources/item/index.tsx`, `ui/header/resources/panel.tsx`, `ui/header/resources/context.tsx`, tests alongside (`index.test.tsx`, `resources/index.test.tsx`, `resources/item/index.test.tsx`, `resources/panel.test.tsx`); deleted `apps/web/src/ui/tooltip.tsx` |
| Production | `apps/web/src/ui/production-breakdown-table.tsx`, `production-breakdown-table.test.tsx` (replace `ui/production-terrain-readout.tsx` and its test), `apps/web/src/modules/city/page.tsx`, `modules/outpost/page.tsx`, `modules/outpost/page.test.tsx` |
| Helpers | `apps/web/src/helpers/transform.ts` (`transformDecimals(0)`), `transform.test.ts` |
| Right column | `apps/web/src/ui/nav/location/index.tsx`, `item.tsx`, `city/index.tsx`, `outpost/index.tsx`, `city/index.test.tsx`, `outpost/index.test.tsx` |
| Chat | `apps/web/src/modules/communication/chat/panel.tsx`, `panel.test.tsx` |
| Specs | `specs/019-web-shell-routing/spec.md`, `specs/013-location-activity/spec.md`, `specs/030-intelligence/spec.md`, `specs/032-messaging/spec.md`, `specs/035-faction-exchange/spec.md`, `specs/README.md` |
