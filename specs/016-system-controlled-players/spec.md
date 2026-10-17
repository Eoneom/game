# Slice 016 — System-controlled players

**Status**: As implemented on `main` (brownfield).

## Summary

The server maintains **system-controlled** players (non-human opponents) that cannot log in (`player:system-controlled`). On boot, `ensureSystemPlayer` creates one singularity-faction player named `Alpha` with city `Core I` if none exist. A recurring **system player tick** job rotates scripted actions (explore, base, settle, make-permanent, upgrade, research, recruit, transport) until one succeeds per tick. By default the ring is **expansion-first**; when the main city needs baseline upkeep (warehouse pressure, energy starvation, or missing core production), the ring flips to **economy-first** for that tick.

**Depends on**: faction ([`004`](../004-faction-domain/spec.md)), bootstrap ([`003`](../003-player-registration-signup/spec.md)), all game commands invoked by tick actions.

## Boot

`apps/server/src/index.ts`:

1. `ensureSystemPlayer()` — returns existing `player_id` or bootstraps with `system_controlled: true`.
2. `ensureSystemPlayerTickScheduled({ tick_index: 0 })`.

Constants (`core/player/constant/system.ts`):

| Constant | Value |
| --- | --- |
| `SYSTEM_PLAYER_NAME` | `Alpha` |
| `SYSTEM_PLAYER_FACTION_CODE` | `the_technological_singularity` |
| `SYSTEM_FIRST_CITY_NAME` | `Core I` (roman numerals via `systemCityName`) |

## Tick pipeline

| Piece | Role |
| --- | --- |
| `SYSTEM_PLAYER_TICK_QUEUE` | pg-boss stately queue |
| `tickSystemPlayers` | Lists `repository.player.listSystemControlled()`, runs `actForSystemPlayer` per player, schedules next tick |
| `categoriesForTick` | Rotates expansion vs economy blocks by `tick_index`; optional `economy_first` swaps block order |
| `shouldPrioritizeEconomyForSystemPlayer` | Main-city signal for economy-first rotation (`storage.ts`) |
| `expansion-cell` | Scout / outpost / city-site cell scores for explore, base, settle, make-permanent |
| `systemTickActions` | Per-category handlers in `app/command/player/system/actions.ts` |
| `actForSystemPlayer` | First action returning a payload wins the tick |
| `storage.ts` | Warehouse pressure threshold and upgrade / transport helpers |

Interval: `SYSTEM_PLAYER_TICK_INTERVAL_MS` (`app/scheduling/intervals`).

## Warehouse storage awareness

System tick actions use `CityGetQuery` warehouse fields (`warehouses_capacity`, `resource_stock`, `warehouse_space_remaining`) — same capacity math as human city reads; no duplicate domain logic.

**Pressure threshold**: a plastic or mushroom stock counts as pressured when `stock >= capacity × 0.7`. This matches the web header warehouse progress warn level (`HeaderResourcesItem` `warnCapacity`).

**Upgrade** (`tryUpgrade`): when the city is under warehouse pressure **or** `production_energy_ratio < 1`, eligible buildings are sorted before the first affordable upgrade is chosen:

1. **Energy** (`solar_panel`) when energy-starved (`production_energy_ratio < 1`).
2. Warehouse for each pressured resource (`plastic_warehouse` / `mushroom_warehouse`).
3. Other warehouses.
4. Non-production buildings (labs, etc.).
5. Production buildings (`recycling_plant`, `mushroom_farm`, `central_inductor`) — deprioritized while energy-starved; among production buildings, **lower level first** so plastic and mushroom production stay roughly aligned (avoids mushroom starvation from one-sided upgrades).

When not pressured, building iteration order is unchanged (repository list order).

**Transport** (`tryTransport`, helpers in `system/transport.ts`): only **permanent** outposts whose plastic or mushroom stock is at **warehouse pressure** (`stock >= capacity × 0.7`, same ratio as city upgrades) or that hold **any plasma** are candidates; outposts are tried **highest total stock first** (cell resource score tie-break). **Destination city** is the one that can accept the most deliverable cargo (`min(origin, destination warehouse_space_remaining)` per resource; plasma uncapped at destination). Requires at least one **carrier** troop (`TroopRole.CARRIER`, e.g. Hauler) on the outpost; sends the **minimum** hauler count needed for the load (up to garrison). Cargo is capped to destination warehouse space, then **clamped to transporter capacity** (partial loads allowed, same as human transport UI). One transport movement per successful tick; no batching across outposts.

**Research** (`tryResearch`): technologies are ordered by `sortTechnologiesForSystemResearch` (`system/technologies.ts`) — highest priority first: `architecture`, `photovoltaic_optimization`, `replication_catalyst`, `outpost_logistics`; tiebreaker lower `level` first. Skips codes with in-flight research (`research_at` on list entries or pending job via `hasPendingTechnologyResearchByCode`). If any technology is already researching, the action returns idle (unchanged).

**Recruit** (`tryRecruit`): troop choice uses `sortTroopsForSystemRecruit` (`system/troops.ts`) instead of roster `troop_order`. Per-**city** caps (garrison in that city’s cell only; outpost troops do not count): `SYSTEM_MAX_SCOUT_TROOPS = 2`, `SYSTEM_MAX_FOUNDER_TROOPS = 1`. **Carrier** troops are preferred for general economy; scout and founder are deprioritized when that city is at cap. **Cultivators** (harvester) and **salvagers** (reclaimer) are recruited only when the empire has at least one **permanent** outpost on a cell with the matching gather coefficient (mushroom / plastic) **and** a stocked permanent outpost still lacks that role; otherwise those codes are skipped and deprioritized (expansion-first). When the need flag is set, recruiting that role is boosted empire-wide for the next city recruit attempt. Each successful recruit tick may start **one recruitment job per city** (skipped when that city already has pending recruitment) with `count` set by `systemRecruitBatchCount` — as many units as resources afford, capped by scout/founder headroom for limited roles; unlimited roles batch until stock runs out. Cities are processed in list order until every city has been considered; observability payload includes `recruits[]` and `total_count`.

**Production-ready research priority** (`tickSystemPlayers`): when `isEmpireProductionReadyForResearch(player_id)` is true for the first city — projected building levels satisfy `isCoreProductionSatisfied`, `production_energy_ratio >= 1`, and warehouses are not under pressure (`isCityWarehouseUnderPressure`) — `prioritizeResearchBeforeUpgrade` swaps `upgrade` and `research` in that tick’s category list so research is attempted before building upgrades when research would otherwise run later on the same tick.

## Expansion focus

**Tick priority (default)**: `explore` → `base` → `settle` → `make-permanent` → `upgrade` → `research` → `recruit` → `transport`, rotated by `tick_index` so each category leads periodically.

**Early outposts / small empire**: while the empire has fewer than two outposts (`SYSTEM_EXPANSION_LOW_OUTPOST_COUNT`) or total settlements (cities + outposts) are at most `SYSTEM_EXPANSION_SMALL_EMPIRE_MAX_SETTLEMENTS` (4), the expansion block rotates as **`base` → `explore` → …** (`systemTickExpansionCategories`). While any **temporary** outposts exist, rotation is **`settle` → `make-permanent` → `base` → `explore`** so commits run before further scouting. `tryExplore` returns idle when an explored, unoccupied cell meets the minimum score for the current goal (city site vs resource outpost) and is at least **75%** of the best unexplored scout target across owned viewports (founder need not be idle at that origin) — the same tick can then succeed on `base` / `settle` without mapping the whole viewport first.

**Economy override**: when `shouldPrioritizeEconomyForSystemPlayer` is true for the first city, the economy block (`upgrade`, `research`, `recruit`, `transport`) is tried before expansion for that tick.

**Cell heuristics** (`core/player/system/expansion-cell.ts`):

| Action | Candidate filter | Score |
| --- | --- | --- |
| `explore` | Unexplored cells in viewport (server has full coefficients) | `solar × 1.25 + plastic + mushroom` |
| `base` | Explored, unoccupied | City site: `solar` when below city cap; else `plastic + mushroom` for gathering outposts |
| `settle` | Temporary outposts with founder | Highest `solar` first |
| `make-permanent` | Temporary outposts | Highest `plastic + mushroom` first |

Tie-break: ascending coordinates for stable ordering.

## Requirement gating (upgrade, research, recruit)

Before calling `upgradeBuilding`, `researchTechnology`, or `recruitTroop`, system tick actions evaluate the same domain rules as human commands via `RequirementService` (`core/requirement/`, slice [`014`](../014-requirements-pricing/spec.md)). Helpers live in `system/requirements.ts`:

| Helper | Role |
| --- | --- |
| `levelsForSystemRequirementGate` | Builds `Levels` for checks; **current** building/technology levels when starting an action (`can_start`), **projected** levels (pending upgrades + research queue) when only enqueueing behind in-flight work (`can_enqueue`) — aligned with `startBuildingUpgrade` / `startTechnologyResearch` reading live DB state on start |
| `meetsBuildingUpgradeRequirement` | `RequirementService.checkBuildingRequirement` |
| `meetsTechnologyResearchRequirement` | `RequirementService.checkTechnologyRequirement` (research-lab level offset uses the technology’s current or projected level as appropriate) |
| `meetsTroopRecruitRequirement` | `RequirementService.checkTroopRequirement` (always current levels) |

Candidates that fail a check are skipped; the tick does not invoke the command (avoiding requirement errors and wasted queue slots). Sorting (`sortBuildingsForSystemUpgrade`, `sortTechnologiesForSystemResearch`) is unchanged — filtering happens immediately before enqueue/start.

Alpha’s **`war_machine`** / **`disruptor`** recruits (024 on `main`) go through the same `recruitTroop` path and **`meetsTroopRecruitRequirement`** gate as economy troops (`TroopRequirement` per 024: **`cloning_factory`** + **`replication_catalyst`** only — not `architecture` or `photovoltaic_optimization`); combat policy in `system/troops.ts` does not bypass requirement checks.

## Player errors (relevant)

| `PlayerError` | Meaning |
| --- | --- |
| `player:system-controlled` | Login blocked for system players |
| `player:not-found` / `player:already-exists` | Bootstrap edge cases |

## Out of scope

Human signup/login ([`002`](../002-player-session-auth/spec.md), [`003`](../003-player-registration-signup/spec.md)).

## Evidence index

| Area | Paths |
| --- | --- |
| Commands | `apps/server/src/app/command/player/ensure-system.ts`, `system/{tick,policy,actions,requirements,transport,troops,technologies,production}.ts` |
| Jobs | `apps/server/src/adapter/job-queue/player/system-tick.ts` |
| Core | `apps/server/src/core/player/constant/system.ts`, `core/player/system/expansion-cell.ts` |

Tests: `apps/server/src/app/command/player/ensure-system.spec.ts`, `system/tick.spec.ts`, `system/actions.spec.ts`, `system/requirements.spec.ts`, `system/troops.spec.ts`, `system/technologies.spec.ts`, `system/production.spec.ts`, `system/transport.spec.ts`, `system/policy.spec.ts`, `system/storage.spec.ts`, `core/player/system/expansion-cell.spec.ts`, `core/player/constant/system.spec.ts`.
