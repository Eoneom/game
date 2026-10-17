# Implementation Plan — 024 Player combat (PvP)

**Branch**: `main` (incremental commits) | **Date**: 2026-10-17 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `/specs/024-player-combat-pvp/spec.md` (design locked; not implemented on `main`).

## Summary

Introduce **cross-faction PvP** by extending troop **movements** with `MovementAction.ATTACK`, four **faction-exclusive combat `TroopCode`s** with extended **troop characteristics** (attack, defense, life, `combat_troop_class`, `combat_role`), a persisted **battle** aggregate resolved over **five scheduled combat rounds** (pg-boss), **outcome sagas** (loot, destroy, occupy, retreat), **`battle` communication reports** with `round_summaries`, **`battle:finished` WebSocket** events, **web** troop art/translations and attack UI, and **system player** attack/recruit policy for Alpha.

Technical approach: brownfield **hexagonal** slice — schema migrations and domain constants first, then movement create/finish routing into `core/combat/`, new job queues beside `troop.movement.finish`, report metadata table, api-client contract extensions, web modules, finally system AI tick actions. See [`research.md`](./research.md) for current movement/report/job wiring and gaps.

## Technical Context

**Language/Version**: TypeScript on **Node ≥ 22.12** (pg-boss; CI Node 24).

**Primary Dependencies**: Yarn 4 workspaces — `@eoneom/server`, `@eoneom/web`, `@eoneom/api-client`; Express HTTP; pg-boss; Kysely/Postgres; React web client.

**Storage**: Postgres via Kysely (`apps/server/src/adapter/database/`); new tables `battle`, `battle_round`, `report_battle` (or JSONB on `report` — see [`data-model.md`](./data-model.md)); optional `city.default_combat_strategy` / `outpost.default_combat_strategy` columns.

**Testing**: Node test runner + coverage in CI (`yarn server:test:coverage`, `yarn web:test:ci:coverage`); extend existing movement/saga/report/system-player spec paths cited in spec.

**Target Platform**: Linux server (API :3000), web dev :3001.

**Project Type**: Monorepo game backend + SPA.

**Performance Goals**: Combat round jobs paced by `COMBAT_ROUND_INTERVAL_MS` (proposed 30_000 per [`022`](../022-timing-and-resources/spec.md)); no hot-path full-table scans; battle finish in one transaction per round advance where possible.

**Constraints**: Constitution — domain language (Player, Faction, Troop, Movement, Battle), hexagonal layers, French UI errors only on web, typed `error_code` via api-client; no external game names in specs.

**Scale/Scope**: One battle per attack movement arrival; max 5 rounds × 2 sides; two report rows per finished battle; human + system-controlled players.

## Constitution Check

*GATE: Pass before implementation. Re-check after Phase 1 migrations and api-client exports.*

| Principle | Compliance plan |
| --- | --- |
| **I. Domain language** | Use **Battle**, **CombatStrategy**, **Movement** `attack`, **Troop** combat codes; system-controlled **Player** Alpha fights under same rules. |
| **II. Monorepo** | All wire enums/types through `packages/api-client`; run `yarn client:build` when exports change. |
| **III. Hexagonal** | Pure combat resolution in `core/combat/` (`CombatService`, strategy tables, pool/casualty algorithms); orchestration in `app/command` + `app/saga`; persistence in `adapter/database`; HTTP in `web/handler`. New ports: `BattleRepository`, job schedule methods on `JobQueue` port. |
| **IV. API errors** | New codes in `core/combat/error.ts`, `core/troop/error.ts` (faction gating, attack validation), export + `error-translations.ts` (e.g. same-faction attack, missing `combat_strategy`, no combat troops). |
| **V. Bounded change** | Incremental phases below; reversible migration `00006_*` following `adapter/database/migrations/` pattern; peaceful movement sagas unchanged. |

**Post-implementation spec sync** (separate doc PRs or same epic): update evidence in [`009`](../009-troops-stationary/spec.md) (combat stats, recruit gates), [`010`](../010-troop-movement-combat/spec.md) (`attack` saga + jobs), [`012`](../012-communication-reports/spec.md) (`battle` type + metadata), [`016`](../016-system-controlled-players/spec.md) (attack tick + combat recruit).

## Project Structure

### Documentation (this feature)

```text
specs/024-player-combat-pvp/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 — brownfield inventory
├── data-model.md        # Phase 1 — entities & migrations
├── quickstart.md        # Phase 1 — manual verification
├── contracts/           # Phase 1 — HTTP/WS sketches
└── tasks.md             # Phase 2 — /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
apps/server/src/
├── core/
│   ├── combat/                    # NEW — BattleEntity, CombatStrategy, CombatService, errors, constants
│   ├── troop/constant/
│   │   ├── code.ts                # + legionnaire, interceptor, war_machine, disruptor
│   │   ├── characteristic.ts      # + attack/defense/life, combat_role, combat_troop_class
│   │   ├── faction.ts             # map new codes → FactionCode
│   │   ├── movement-action.ts     # + ATTACK = 'attack'
│   │   └── combat-role.ts         # NEW enum (combat|carrier|civilian|scout) per spec
│   ├── communication/value/report-type.ts  # + BATTLE
│   ├── events.ts                  # + BattleFinished
│   ├── requirement/constant/troop.ts       # combat TroopRequirement rows
│   └── pricing/constant/troop.ts           # combat troop_costs
├── app/
│   ├── command/
│   │   ├── troop/movement/create.ts        # faction check, attack validation, combat_strategy
│   │   ├── combat/                         # NEW — startBattle, advanceRound, finishBattle, applyOutcomes
│   │   └── communication/report/create-battle.ts
│   ├── saga/finish/
│   │   ├── movement.ts                     # route ATTACK → sagaFinishAttack
│   │   └── attack.ts                       # NEW — snapshot + schedule round 1
│   ├── query/communication/report/get.ts   # join report_battle metadata
│   └── scheduling/intervals.ts             # COMBAT_ROUND_INTERVAL_MS
├── adapter/
│   ├── database/
│   │   ├── migrations/00006_player_combat_pvp.ts
│   │   └── repository/battle.ts, report-battle.ts
│   └── job-queue/
│       ├── combat/advance-round.ts           # NEW queue combat.round.advance
│       └── register-workers.ts
└── web/handler/troop/movement/create.ts      # validate combat_strategy body field

packages/api-client/src/
├── endpoints/troop/movement/create.ts        # + combat_strategy?: CombatStrategy
├── endpoints/communication/report/get.ts     # + battle?: ReportBattleMetadata
├── index.ts                                  # export CombatStrategy, CombatError, new TroopCode

apps/web/src/
├── modules/troop/translations.ts, image.ts   # four combat troops + alt text
├── modules/movement/                         # attack action labels, strategy picker
├── modules/communication/report/details.tsx  # battle branch + round table
├── modules/communication/ws-listener.ts    # battle:finished invalidation
└── public/troops/{legionnaire,interceptor,war_machine,disruptor}.png

apps/server/src/app/command/player/system/
├── actions.ts                                # attack tick action
└── troops.ts                                 # war_machine / disruptor recruit policy
```

**Structure Decision**: Single monorepo; all new combat domain under `core/combat/`; reuse movement finish job as battle **trigger** only; round resolution on dedicated pg-boss queue(s) per [`018`](../018-app-composition-jobs/spec.md).

## Phased implementation approach

Recommended order (each phase should keep CI green):

### Phase 1 — Data & domain constants

- Migration `00006_player_combat_pvp.ts`: `battle`, `battle_round` (or JSON state column), `report_battle`; optional garrison strategy on `city` / `outpost`.
- Extend `TroopCode`, `troop_characteristics`, `troop_faction`, `TroopRequirement`, `troop_costs`; add `CombatRole` + backfill existing codes per spec.
- Add `CombatStrategy` enum + multiplier tables in `core/combat/constant/strategy.ts`.
- api-client re-exports; `yarn client:build`.

### Phase 2 — Movement `attack` (create + estimate + finish routing)

- `MovementAction.ATTACK`; `createTroopMovement` validates cross-faction target, ≥1 combat troop, scouts excluded, `combat_strategy` required.
- `TroopMovementEstimateQuery` supports attack ETA (slowest speed including new codes).
- `sagaFinishAttack` on movement arrival: resolve defender owner, snapshot stacks, create `BattleEntity`, schedule round 1 job; **do not** emit battle reports yet.
- New `TroopError` / `CombatError` codes + French translations.
- Contracts: [`contracts/troop-movement-attack.md`](./contracts/troop-movement-attack.md).

### Phase 3 — Battle jobs & resolution engine

- Queue `combat.round.advance` (name TBD, document in README + [`018`](../018-app-composition-jobs/spec.md) on merge).
- `CombatService`: pools, exposure, target priority, whole-unit casualties, early end after rounds 1–4.
- Persist per-round summaries on battle state; chain jobs with `COMBAT_ROUND_INTERVAL_MS`.
- Unit tests on pure `CombatService` with fixture armies.

### Phase 4 — Outcomes & troop/world mutations

- `sagaFinishBattle` / `applyBattleOutcomes`: loot (carriers), occupy (combat survivors), destroy temp outpost/stacks, city/outpost ownership transfer, attacker retreat on defender win/draw.
- Clear `movement_id` on surviving stacks; respect [`015`](../015-resources-model/spec.md) loot cap rules.

### Phase 5 — Reports & realtime

- `ReportType.BATTLE`; `ReportFactory.generateBattleReport` + `report_battle` insert (attacker + defender rows).
- Extend `CommunicationGetReportQuery` + handler mapping; list endpoint includes `type: battle` (metadata optional on list).
- `AppEvent.BattleFinished` → `battle:finished` WS payload `{ player_id }` per participant.
- Web: report detail UI, ws listener; contracts [`contracts/communication-report-battle.md`](./contracts/communication-report-battle.md), [`contracts/websocket-events.md`](./contracts/websocket-events.md).

### Phase 6 — Web UI (attack flow)

- Movement create form: action `attack`, strategy select, troop picker filtered by `combat_role` rules.
- Enemy troop display for singularity codes on map/reports.
- PNG assets + `TroopTranslations`.

### Phase 7 — System AI

- Recruit `war_machine` / `disruptor` when below garrison thresholds ([`016`](../016-system-controlled-players/spec.md)).
- New tick category or action: cross-faction `attack` with `opening_strike` / `balanced` heuristic from spec.
- Observability payload includes attack commits (extends [`020`](../020-system-player-observability/spec.md) if needed).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| New `battle` aggregate + round jobs | Spec requires 5-round paced resolution and report `round_summaries` | Instant resolve at movement finish cannot satisfy round pacing or inbox timing |
| `report_battle` side table | Rich metadata exceeds flat `report` columns | Stuffing JSON in troop columns breaks [`012`](../012-communication-reports/spec.md) list queries |

## References

- Phase 0: [`research.md`](./research.md)
- Phase 1 design: [`data-model.md`](./data-model.md), [`quickstart.md`](./quickstart.md), [`contracts/`](./contracts/)
- Normative behavior: [`spec.md`](./spec.md)
