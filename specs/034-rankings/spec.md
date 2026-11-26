# Slice 034 — Rankings

**Status**: Planned.

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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Domain | `core/ranking/` (value, score, competition rank) |
| Military credit | `app/command/combat/apply-battle-outcomes.ts` |
| Job | `adapter/job-queue/ranking/compute.ts`, `app/command/ranking/compute.ts` |
| Queries / HTTP | `app/query/ranking/`, `web/handler/ranking/` |
| Web | `modules/ranking/`, navigation |
