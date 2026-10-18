# Slice 025 — Lawless human system faction

**Status**: Implemented on `main` (Liturgie des cendres / Harrow / Cinder I).

## Summary

Add a third faction: **human**, **non-playable**, **system-controlled only** (one AI empire at launch). Flavor: humans who reject Confederation law — horror tone in art and naming; **mechanics** still obey domain rules (requirements, outpost limits, no loop-owned commands, etc.). Cross-faction PvP vs humans from day one, same as vs Singularity (Alpha).

**Depends on**: [`004`](../004-faction-domain/spec.md), [`016`](../016-system-controlled-players/spec.md), [`024`](../024-player-combat-pvp/spec.md) (four PvP troops per faction).

## Faction identity (locked)

| Field | Value |
| --- | --- |
| `FactionCode` wire | `the_ash_liturgy` |
| French UI name | **Liturgie des cendres** |
| Enum member (proposed) | `THE_ASH_LITURGY` |

Cult / ritual horror humans; lawless flavor only. Pairs with system player **Harrow** and capital **Cinder I**.

Visibility: same as Singularity — on map, settlements, battle reports, admin; **not** in signup `playableFactionCodes()`.

## System player bootstrap

| Field | Value (generated) |
| --- | --- |
| Player name | **Harrow** |
| First city | **Cinder I** (roman numerals for later cities: Cinder II, …) |
| Count at launch | **One** system player; more players same faction later (out of scope) |

Boot: **`ensureLawlessSystemPlayer()`** (or generalized multi-system boot) on server start — create if missing, `system_controlled: true`, same bootstrap kit as Alpha (buildings/troops/recipes per faction roster).

Spawn position: **random** valid city site **far from Alpha** (`Core I`). Minimum Manhattan separation from Alpha’s capital cell: `SYSTEM_ASH_LITURGY_MIN_DISTANCE_FROM_ALPHA` = **40** (`apps/server/src/core/player/constant/system.ts`).

Tick: same pipeline as 016 (`SYSTEM_MAX_ACTIONS_PER_TICK` = 25, shared job `player.system.tick` lists **all** system players).

Admin: second card on `/admin` observability; existing **POST /admin/system-player-tick** runs ticks for **all** system players (no change required beyond listing).

## Troops & art (024)

- **Four new PvP combat `TroopCode`s** exclusive to this faction (no reuse of Confederation or Singularity codes).
- **Economy roster**: same recruit gates as Confederation (`TroopRequirement` / buildings / tech per 024 economy rules — “same” as Q13).
- **Stats**: **wild** — deliberately off-meta vs Confederation/Singularity mirrors (higher variance: glass cannon, spike damage, fragile defense, etc.). Exact numbers in `plan.md` / balance table at implementation time.
- **Art**: **new horror-style troop PNGs** (not silhouettes of existing factions). Web `troopImageSrc` + `EntityThumb` paths per code; placeholder art acceptable for first merge if labeled in tasks.

## AI policy

- **Same planner architecture** as Alpha (`planSystemPlayerActions`, `actForSystemPlayer`, replan-after-commit).
- **Separate policy profile** (constants module, e.g. `system/policy-ashen-covenant.ts` or profile id on player row) with Valentin-approved aggression:

| Knob | Lawless profile vs Alpha default |
| --- | --- |
| `attack` | Much higher priority / earlier in rotation; commit when simulator marginal |
| `empire_under_threat` | **Ignored** for attack idling (still defend via other rules if added later) |
| Target preference | **Human (Confederation) settlements/stacks first** when scoring |
| `failed_attack_targets` memory | **Disabled** or very short TTL — keeps raiding |
| Scout / founder caps | **Raised** vs `SYSTEM_MAX_SCOUT_TROOPS` / `SYSTEM_MAX_FOUNDER_TROOPS` |
| Economy / `make-permanent` | **Deprioritized** relative to attack and expansion tempo |
| Expansion prepends | Still run, but **after** attack opportunities when profile says so (implementation: prepend order + utility weights) |

Hard gates unchanged: `RequirementService`, outpost count limit, transport persisted-stock rules, no explicit gather command.

## Lore boundary

“No laws nor rules” is **flavor only** — no diplomacy slice, no mechanical law-breaking (same commands as any empire).

No forbidden behaviors at launch (cities, research, outposts, transport all allowed).

## Out of scope (later)

- Additional named system players in the same faction.
- Playable lawless faction signup.
- Unique buildings or technologies (use Confederation gates unless a future slice says otherwise).

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Faction | `core/faction/constant/code.ts`, `playable.ts`, `translations.ts` |
| Boot | `ensureSystemPlayer` generalization, `core/player/constant/system-*.ts` |
| Troops | `core/troop/...`, `troop_faction`, PNGs under web public assets |
| AI | `core/player/system/planner.ts` + profile module |
| Admin | observability lists N system players |
| Spec cross-links | Update `004`, `016`, `024` quickstart faction table |
