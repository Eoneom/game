# Slice 034 — Rankings

**Status**: Implemented on `main` (slice 034): ranking domain (`core/ranking/`: resource value, points, cumulative building / technology cost, competition ranking, alliance and faction averages, military credit split), `player.military_value` credited in `applyBattleOutcomes`, hourly self-rescheduling `ranking.compute` job with 7-day retention, `GET /ranking` and `GET /ranking/me`, web « Classements » page, alliance ranks on the alliance page, public alliance view `/alliance/$allianceId`, migration `00016_rankings`.

## Summary

Public **rankings** of human players, alliances and factions, in three categories:

| Category | FR | Measures |
| --- | --- | --- |
| `global` | **Général** | Value invested in everything the player still owns: buildings, technologies, troops, defenses. |
| `economy` | **Économie** | Value invested in buildings and technologies. |
| `military` | **Militaire** | Cumulative value of enemy troops and defenses destroyed, in attack and defense. |

Scores are computed by an **hourly job** that stores a snapshot. **System players are excluded** from every ranking, but battles against them count toward military scores. Alliances and factions are ranked by the **average** score of their members. Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`007`](../007-buildings-upgrade-queue/spec.md), [`008`](../008-technology-research/spec.md), [`009`](../009-troops-stationary/spec.md), [`014`](../014-requirements-pricing/spec.md) (costs), [`024`](../024-player-combat-pvp/spec.md) (battle losses), [`026`](../026-plasma-economy/spec.md) (plasma), [`029`](../029-city-defenses/spec.md) (defenses), [`033`](../033-alliances/spec.md) (alliances, reinforcements), [`018`](../018-app-composition-jobs/spec.md) (jobs).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Global / economy score** | **Value invested** in what still exists, in points. A lost unit or a captured city lowers the score. |
| **Military score** | **Losses inflicted**: cumulative value of enemy troops and defenses destroyed. Never decreases. Battles against system players count. |
| **Refresh** | **Hourly** snapshot. |
| **Groups** | Alliances and factions ranked by **average** member score; member count shown. |
| **System players** | Excluded from all rankings. |

## Value and points

### Resource value

`value(resource) = plastic + mushroom + PLASMA_WEIGHT × plasma`, with `PLASMA_WEIGHT = 5` (plasma is scarcer). `points = floor(value / 1000)`.

### What counts

| Item | Value |
| --- | --- |
| Building at level `L` | Σ `getBuildingLevelCost(code, level = 1..L)` resources. Includes free starting levels and the Enceinte ([`029`](../029-city-defenses/spec.md)). |
| Technology at level `L` | Σ `getTechnologyLevelCost(code, level = 1..L)` resources. |
| Troops | `count × unit cost` for every stack the player owns: stationed, in movement, reinforcements abroad ([`033`](../033-alliances/spec.md)). |
| Defenses | `count × unit cost`. |

Durations and reductions (architecture, cloning factory…) do not change resource costs, so values are independent of them. Items in progress (upgrade, research, recruitment, construction) count only once finished.

| Category | Sum of |
| --- | --- |
| `global` | Buildings + technologies + troops + defenses |
| `economy` | Buildings + technologies |

### Military score

Stored as a cumulative counter `player.military_value`, updated when battle outcomes are applied (`apply-battle-outcomes.ts`, same transaction):

- **Attacker** gains the value of all defender losses (troops and defenses).
- **Defender side** gains the value of all attacker losses, split between the host and reinforcement owners in proportion to each owner's **combat attack value** in the battle snapshot (`attack_capacity × count`, before modifiers). With no reinforcements the host gets everything.
- System players' counters are not updated.
- `military` points = `floor(military_value / 1000)`.

Existing battles are not backfilled: every counter starts at 0 on deploy.

## Ranking computation

### Job

`ranking.compute`: self-rescheduling every **60 minutes** (`singletonKey` = `global`), ensured on boot like the gather loop. Steps:

1. Load every human player with buildings, technologies, troops, defenses and `military_value` in batched queries, not one query per player.
2. Compute the three scores per player.
3. Rank players per category with **competition ranking** (equal scores share a rank: 1, 2, 2, 4). Ties keep a stable display order by name.
4. Groups:
   - **Alliances**: average of members' scores per category, rounded down; ranked only with **≥ 3 members**.
   - **Factions**: playable factions with at least one human player; average of their human players.
5. Write one snapshot (`computed_at`) in a single transaction.

### Snapshot retention

Keep hourly snapshots for **7 days**, then delete them in the same job. The **rank change** shown in the UI compares with the snapshot closest to 24 h earlier.

## HTTP

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/ranking?category=global\|economy\|military&kind=player\|alliance\|faction&page=` | Latest snapshot, 50 rows per page: `rank`, `rank_change_24h` (nullable), `points`, entity (`player`: name, faction, alliance tag; `alliance`: name, tag, member count; `faction`: code, player count), `computed_at` |
| `GET` | `/ranking/me` | Caller's rank and points in each category, alliance and faction ranks, and the page where they appear |

Before the first snapshot exists, both return an empty result with `computed_at: null`.

## Web UI

| Surface | Change |
| --- | --- |
| Navigation | New **Classements** entry. |
| Rankings page | Tabs **Général / Économie / Militaire**, sub-tabs **Joueurs / Alliances / Factions**. Table: rank, change (▲▼ with value), name with `[TAG]`, faction, points. Own row highlighted; "Ma position" jumps to the right page. Footer: "Mis à jour à HH:MM". |
| Links | Player name → compose a letter ([`032`](../032-messaging/spec.md)); alliance → public alliance view ([`033`](../033-alliances/spec.md)). |
| Alliance page | Shows the alliance's ranks when it has ≥ 3 members. |

## Persistence

Migration (next free number):

| Table / column | Content |
| --- | --- |
| `player.military_value` | Big integer, default 0 |
| `ranking_snapshot` | `id`, `computed_at` |
| `ranking_entry` | `snapshot_id`, `category`, `kind`, `entity_id`, `rank`, `points`; index `(snapshot_id, category, kind, rank)`; index `(entity_id, category, kind)` for "me" and change lookups |

## Testing

| Area | Cases |
| --- | --- |
| Values | Building and technology cumulative cost per level; plasma weight; troops in movement and abroad counted; in-progress items not counted. |
| Military | Attacker credited with defender losses including defenses; defender split with reinforcements by attack value; system players not credited; counter never decreases. |
| Ranking | Competition ranking with ties; system players absent; alliance < 3 members not ranked; faction averages; snapshot retention; rank change vs ~24 h earlier. |
| HTTP | Pagination, empty state, `/ranking/me`. |
| Job | Self-reschedules; batched loading (no N+1). |

## Out of scope

- Seasons and rewards.
- Historical charts beyond the 24 h change.
- Rankings by region, by city, or by single battle.
- Ranking system players.

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`024`](../024-player-combat-pvp/spec.md) | Military value credited at outcome time. |
| [`018`](../018-app-composition-jobs/spec.md) | `ranking.compute` job. |
| [`033`](../033-alliances/spec.md) | Alliance ranks on the alliance page. |

## Implementation notes

- **Values**: `RankingService` (`core/ranking/service.ts`) prices everything through `PricingService` with every reduction level set to 0 (`architecture_level`, `research_lab_level`, `cloning_factory_level`, `replication_catalyst_level`, `city_wall_level`); those reductions only shorten durations today, and passing 0 guarantees no level-based reduction can ever leak into a value. Values are integers (costs are `ceil`ed per level), points are `floor(value / 1000)` of the category sum (not a sum of per-item points).
- **What is loaded** (`RankingRepository`, one query each, human players only): finished `building.level` of every city they own (levels > 0, free starting levels and the Enceinte included), `technology.level`, troops summed per owner and code over **every** row of the `troop` table (stationed, in movement, reinforcing an ally), `defense` rows summed per city owner, `player.military_value` with the alliance membership, and the alliance names. Queues are never read, so upgrades, research, recruitment batches and defense batches count only once finished; recruitment and defense progress already add finished units to their rows one by one.
- **Military credit** (`core/ranking/military.ts`, called from `applyBattleOutcomes` after the battle and movement updates, inside the outcome transaction): the attacker gains the value of `cumulative_defender_losses` (troops, defenses, consumed minefields) **plus, on an attacker win, the defender stacks still standing** (non-combat troops, unarmed defenses), since the capture destroys them too; this is the reading of "all defender losses" that matches what the defender's global score loses. The defender side gains the value of `cumulative_attacker_losses`. The split uses raw attack at battle start, reconstructed as final `defender_stacks` + `cumulative_defender_losses` per owner: `attack_capacity × count` for troops, plus `attack × count` for the host's defenses (they fight for the host; a host defended only by turrets would otherwise get nothing). Stacks without `player_id` and every defense belong to the host.
- **Split rounding**: each reinforcement owner gets `floor(value × attack / total_attack)` and the host gets `value − Σ shares`, so the shares always add up to the exact loss value (nothing lost or duplicated). With no reinforcements, or when no defender stack has attack, the host gets everything. Zero credits are skipped; system players are filtered with one `player.listByIds` call; `player.addMilitaryValue` runs `military_value = military_value + n` in SQL and ignores non-positive amounts, so counters never decrease. `military_value` is not part of `PlayerEntity` (so `player.updateOne` can never overwrite it); it is read only by the ranking job.
- **bigint typing**: `player.military_value` and `ranking_entry.points` are `bigint`; `types.ts` declares them with a hand-written `Int8` column type (`string` on select, as `pg` returns int8 as text). The ranking repository converts them (and `sum()` / `count()` results) with `Number(...)`, and writes points and increments as strings cast to `::bigint`.
- **Ranking**: competition ranking per category and kind (`core/ranking/competition-rank.ts`), points descending, ties ordered by name (`localeCompare` in French, accent and case insensitive, then code-point order and id for a total order). Alliance and faction names / codes are their tie-breakers. Alliance averages and faction averages are floored per category; alliances need ≥ 3 members; factions are `playableFactionCodes()` with ≥ 1 human player.
- **`ranking_entry.position`** (column not listed in the spec's persistence table): the 1-based display order inside one snapshot, category and kind. Pages read `ORDER BY rank, position` with `OFFSET`, and "the page where they appear" is `ceil(position / 50)`, so ties keep the compute-time name order and pages are stable. `ranking_snapshot.computed_at` is also indexed (retention and latest / closest lookups). `ranking_entry.entity_id` is `text` (player or alliance uuid, or a faction code); entries cascade with their snapshot.
- **Job**: `ranking.compute` (stately queue, `singletonKey` `global`) is ensured at boot with `execute_at: now()` like the gather and cleanup loops, so the first snapshot is written right after startup. `computeRankings` runs in one command transaction: six batched reads (`Promise.all`), scoring, one snapshot insert (entries in chunks of 1000 rows), deletion of snapshots older than 7 days (real time), then `scheduleRankingCompute(computed_at + 60 min)`.
- **Rank change**: computed at read time. The reference is the snapshot with `computed_at` closest to `latest − 24 h` among the snapshots older than the latest (`ORDER BY abs(computed_at − target)`); `rank_change_24h = previous rank − current rank` (positive = moved up), `null` without an earlier snapshot or when the entity was not ranked then. With fewer than 24 h of history the closest older snapshot is used, as the spec says.
- **HTTP**: `GET /ranking` answers `{ computed_at, category, kind, page, page_size, total, rows }`; unknown `category` / `kind` fall back to `global` / `player`, invalid pages to 1. Rows carry `rank`, `rank_change_24h`, `points` and `entity` (`player`: `id`, `name`, `faction_code`, `alliance_tag`; `alliance`: `id`, `name`, `tag`, `member_count`; `faction`: `code`, `player_count`). Names, tags and counts are **current** (resolved at read time, batched per page): the snapshot stores only ids, ranks and points. An alliance dissolved after the snapshot keeps its row with `name` / `tag` `null`. `GET /ranking/me` answers `{ computed_at, positions }`, one position per category for the player, their alliance (only when ranked) and their faction, each with `rank`, `rank_change_24h`, `points` and `page`. Before the first snapshot: `computed_at: null` with empty `rows` / `positions`.
- **Web**: « Classements » nav entry → `/ranking?category=&kind=&page=` (`modules/ranking/page.tsx`): category tabs Général / Économie / Militaire, sub-tabs Joueurs / Alliances / Factions, table rank / « 24 h » (▲n, ▼n, = or empty) / name / faction (members or players for groups) / points, own row highlighted (`aria-current`), « Ma position » navigates to the page from `/ranking/me` (disabled when unranked), pagination, footer « Mis à jour à HH:MM ». Player names open the compose form prefilled with the name (`/inbox/mail?view=compose&to=`, slice 032); alliance names open a **new** public alliance view `/alliance/$allianceId` (`modules/alliance/public-view.tsx`, backed by the existing `GET /alliance/:alliance_id`; the web had no public alliance page). The alliance page shows « Classement » (rank, change, points per category, linking to the right ranking page) when the alliance has ≥ 3 members and is ranked in the latest snapshot. The `/alliance` route file moved to `routes/alliance/index.tsx` so `/alliance/$allianceId` is not nested under it.
- **Verification**: migration applied (and reverted / reapplied) on the local database; the ranking SQL was run against Postgres with fixtures in a rolled-back transaction (humans with buildings, a technology, troops stationed, in movement and abroad, a defense, an alliance of 3, a system player with troops and military value): expected points, alliance and faction averages, system player absent, `addMilitaryValue` ignoring a negative amount.

## Follow-ups

- **No live refresh**: the page refetches on navigation (1 min stale time); there is no `ranking:*` WebSocket event when a snapshot is written.
- **Public alliance view** shows no ranks (the spec only asks for them on the alliance page) and no member list.
- **Historical display names**: rows show current names and tags; a renamed alliance or a member who left shows today's data against past points.
- **Capture loot is not military value**: resources looted or the captured city's buildings do not count as losses inflicted (buildings are never destroyed on capture, slice 024), though the defender's global score drops with the city.

## Evidence index

| Area | Paths |
| --- | --- |
| Domain | `apps/server/src/core/ranking/` (`service.ts` + spec: cumulative building / technology cost, Enceinte, plasma weight, troops and defenses, categories; `competition-rank.ts` + spec: 1-2-2-4, stable name order; `build.ts` + spec: alliances ≥ 3 members, floored averages, playable factions only; `military.ts` + spec: attacker credit with defenses and captured stacks, split by raw attack, rounding; `type.ts`, `constant/limits.ts`, `value/category.ts`, `value/kind.ts`) |
| Military credit | `apps/server/src/app/command/combat/apply-battle-outcomes.ts` (+ `apply-battle-outcomes-military.spec.ts`: attacker credited with troop and defense losses, defender split with reinforcements, captured stacks, system players not credited, no update without losses; existing outcome specs mock the new calls), `app/port/repository/player.ts`, `adapter/database/repository/player.ts` (`addMilitaryValue`) |
| Job | `apps/server/src/adapter/job-queue/ranking/compute.ts`, `adapter/job-queue/{job-queue,index,register-workers}.ts`, `app/port/job-queue.ts`, `app/scheduling/intervals.ts`, `apps/server/src/index.ts`, `app/command/ranking/compute.ts` (+ spec: repository calls constant for 2 vs 60 players, snapshot entries, 7-day retention, 60-minute reschedule) |
| Persistence | `apps/server/src/adapter/database/migrations/00016_rankings.ts`, `adapter/database/types.ts`, `adapter/database/repository/ranking.ts` (+ spec: compiled SQL counts every troop row, finished levels only, built defenses only, retention delete), `repository/index.ts`, `app/port/repository/{ranking,generic}.ts` |
| Queries / HTTP | `apps/server/src/app/query/ranking/` (`list.ts`, `me.ts`, `shared.ts`; `list.spec.ts`: empty state, 50-row pages, current names and tags, rank change vs ~24 h, `/ranking/me` ranks and pages), `apps/server/src/web/handler/ranking/get.ts`, `web/router.ts` |
| API | `packages/api-client/src/endpoints/ranking/` (`list.ts`, `me.ts`, `index.ts`), `endpoints/index.ts`, `src/index.ts` (`RankingCategory`, `RankingKind`, `RANKING_PAGE_SIZE`, `client.ranking`) |
| Web | `apps/web/src/modules/ranking/` (`page.tsx` + test: row content and links, own row, « Ma position », tabs, alliance link, empty state; `hooks.ts`, `alliance-ranks.tsx`, `translations.ts` + test), `apps/web/src/routes/ranking.tsx`, `routes/alliance/index.tsx`, `routes/alliance/$allianceId.tsx`, `modules/alliance/public-view.tsx`, `modules/alliance/hooks.ts` (`useAllianceDetails`), `modules/alliance/my-alliance.tsx`, `ui/nav/menu/index.tsx`, `routeTree.gen.ts`, `tsconfig.json` / `vite.config.ts` (`#ranking` alias) |
| Specs | `specs/018-app-composition-jobs/spec.md` (`ranking.compute`, plus the missing `communication.chat.cleanup` row), `specs/024-player-combat-pvp/spec.md` (military value at outcome time), `specs/033-alliances/spec.md` (alliance ranks, public view, moved route) |
