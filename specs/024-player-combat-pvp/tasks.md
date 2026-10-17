---
description: "Task list for slice 024 — Player combat (PvP)"
---

# Tasks: 024 — Player combat (PvP)

**Input**: Design documents from `/specs/024-player-combat-pvp/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Prerequisites**: Plan phases 1–7 on `main`; peaceful movement sagas unchanged unless explicitly routed for `attack`.

**Tests**: Unit tests for pure combat resolution; integration tests for attack movement create/finish routing (per spec/plan).

**Organization**: Tasks follow **implementation plan phases 1–7** (`plan.md`). Within each phase, order respects dependencies (migrations → core → app → adapter → web → api-client).

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- Include exact file paths in descriptions
- **Constitution**: typed `error_code` in `apps/server/src/core/**/error.ts`, export via `packages/api-client`, French copy in `apps/web/src/helpers/error-translations.ts`, run `yarn client:build` when api-client exports change (`.cursor/rules/api-error-translations.mdc`)

## Path conventions (Eoneom monorepo)

| Area | Root |
| --- | --- |
| Server domain | `apps/server/src/core/` |
| Server use cases | `apps/server/src/app/command/`, `app/saga/`, `app/query/` |
| Server adapters | `apps/server/src/adapter/database/`, `adapter/job-queue/` |
| HTTP | `apps/server/src/web/handler/` |
| api-client | `packages/api-client/src/` |
| Web | `apps/web/src/modules/` |
| Migrations | `apps/server/src/adapter/database/migrations/` |

---

## Phase 1 — Data & domain constants

**Purpose**: Schema, troop/combat enums, strategy tables, pricing/requirements — blocks all later phases.

**Checkpoint (Constitution II)**: After api-client enum exports, run `yarn client:build`.

- [ ] T001 Add migration `apps/server/src/adapter/database/migrations/00006_player_combat_pvp.ts`: `ALTER movement ADD combat_strategy text`; `ALTER city` / `outpost` ADD `default_combat_strategy text`; `CREATE TABLE battle` and `report_battle` per [`data-model.md`](./data-model.md) (reversible `down` migration)
- [ ] T002 Register migration in `apps/server/src/adapter/database/migrations/index.ts` (or brownfield migration registry used by the server)
- [ ] T003 [P] Extend `MovementAction` with `ATTACK = 'attack'` in `apps/server/src/core/troop/constant/movement-action.ts`
- [ ] T004 [P] Add `CombatRole` enum (`combat` \| `carrier` \| `civilian` \| `scout`) in `apps/server/src/core/troop/constant/combat-role.ts`
- [ ] T005 [P] Add `CombatTroopClass` enum in `apps/server/src/core/combat/value/combat-troop-class.ts` (wire: `legionnaire`, `interceptor`, `war_machine`, `disruptor`)
- [ ] T006 [P] Add `CombatStrategy` enum in `apps/server/src/core/combat/value/combat-strategy.ts` (`balanced`, `opening_strike`, `hold_the_line`)
- [ ] T007 Implement multiplier tables (rounds 1–5 × four classes × attack/life %) in `apps/server/src/core/combat/constant/strategy.ts` matching [`spec.md`](./spec.md#combat-strategies)
- [ ] T008 Extend `TroopCode` with `LEGIONNAIRE`, `INTERCEPTOR`, `WAR_MACHINE`, `DISRUPTOR` in `apps/server/src/core/troop/constant/code.ts`
- [ ] T009 Extend `TroopCharacteristic` and `troop_characteristics` map in `apps/server/src/core/troop/constant/characteristic.ts`: `attack_capacity`, `defense_capacity`, `life_capacity` (combat only), `combat_role`, `combat_troop_class`; backfill existing ten codes per spec roster table
- [ ] T010 Map new codes in `apps/server/src/core/troop/constant/faction.ts` and extend `TroopService.codesForFaction` in `apps/server/src/core/troop/service.ts` (confederation vs singularity exclusivity)
- [ ] T011 Add four `TroopRequirement` rows (`cloning_factory` + `replication_catalyst` only) in `apps/server/src/core/requirement/constant/troop.ts` per spec requirement table
- [ ] T012 [P] Add four `troop_costs` rows in `apps/server/src/core/pricing/constant/troop.ts` (plastic/mushroom/duration per code)
- [ ] T013 Scaffold `apps/server/src/core/combat/` (`BattleEntity`, `BattleWinner`, `BattleTargetKind`, `CombatError` enum stub, `EXPOSURE_LIFE_MULT` / constants in `apps/server/src/core/combat/constant/`)
- [ ] T014 [P] Re-export new enums (`CombatStrategy`, `CombatTroopClass`, new `TroopCode` members) from `packages/api-client/src/index.ts` and movement/report endpoint types as needed
- [ ] T015 Run `yarn client:build` from repository root after T014 (Constitution II gate)

**Checkpoint**: Migrations apply on `yarn server:dev`; `yarn server:build` passes.

---

## Phase 2 — Movement `attack` (create + estimate + finish routing)

**Purpose**: Players can launch cross-faction attacks; arrival starts a battle (no battle reports yet).

**Contracts**: [`contracts/troop-movement-attack.md`](./contracts/troop-movement-attack.md)

**Checkpoint (Constitution IV)**: New attack validation errors exported + French translations before merging phase.

### Tests (attack movement)

- [ ] T016 [P] Extend `apps/server/src/app/command/troop/movement/create.spec.ts`: `action: attack` rejects same-faction target (`CombatError.SAME_FACTION_ATTACK`), missing `combat_strategy`, zero combat troops, scouts in payload, non-zero `resources`
- [ ] T017 [P] Add integration-style saga test `apps/server/src/app/saga/finish/attack.spec.ts`: movement finish with `ATTACK` creates `BattleEntity`, schedules round 1 job, does **not** create `battle` reports

### Implementation

- [ ] T018 Add `combat_strategy` to movement persistence (entity + Kysely types) in `apps/server/src/core/troop/movement/entity.ts` and `apps/server/src/adapter/database/repository/troop/movement.ts`
- [ ] T019 Implement faction gating and attack army rules in `apps/server/src/app/command/troop/movement/create.ts` (resolve defender `faction_code`, ≥1 `combat_role = combat`, exclude scouts, require `combat_strategy`, forbid transport resources)
- [ ] T020 Extend `apps/server/src/web/handler/troop/movement/create.ts` to parse/validate `combat_strategy` on create body
- [ ] T021 Extend `TroopMovementEstimateQuery` in `apps/server/src/app/query/troop/movement/estimate.ts` for `action: attack` (slowest selected troop `speed` including new codes); update `apps/server/src/web/handler/troop/movement/estimate.ts` if needed
- [ ] T022 Add `CombatError` codes in `apps/server/src/core/combat/error.ts` and any `TroopError` extensions in `apps/server/src/core/troop/error.ts` per contract table (`SAME_FACTION_ATTACK`, `NO_VALID_TARGET`, `COMBAT_TROOP_REQUIRED`, `SCOUT_NOT_ALLOWED_ON_ATTACK`, `STRATEGY_REQUIRED`)
- [ ] T023 Export new error enums from `packages/api-client/src/index.ts` and add French entries in `apps/web/src/helpers/error-translations.ts`; run `yarn client:build`
- [ ] T024 Extend api-client `packages/api-client/src/endpoints/troop/movement/create.ts` and `estimate.ts` with optional `combat_strategy?: CombatStrategy`
- [ ] T025 Implement `BattleRepository` port in `apps/server/src/app/port/battle-repository.ts` and adapter `apps/server/src/adapter/database/repository/battle.ts` (create battle, load by `movement_id`)
- [ ] T026 Wire `BattleRepository` in `apps/server/src/adapter/factory.ts`
- [ ] T027 Implement `apps/server/src/app/saga/finish/attack.ts`: resolve defender owner, `target_kind` / `target_id`, snapshot cell stacks (exclude `movement_id` non-null), lock attacker `combat_strategy` and defender strategy (`default_combat_strategy` or `balanced`), insert battle, schedule first `combat.round.advance` job
- [ ] T028 Route `MovementAction.ATTACK` in `apps/server/src/app/saga/finish/movement.ts` to `sagaFinishAttack` (peaceful handlers unchanged)
- [ ] T029 Extend `apps/server/src/app/query/troop/movement/get-action.spec.ts` / handler tests if `attack` appears in movement GET responses

**Checkpoint**: `POST /troop/movement` with `attack` persists and finishes into an `in_progress` battle; no `ReportType.BATTLE` rows yet.

---

## Phase 3 — Battle jobs & resolution engine

**Purpose**: Five-round (max) simultaneous combat via pg-boss; pure domain logic unit-tested.

### Tests (combat engine)

- [ ] T030 [P] Add `apps/server/src/core/combat/combat-service.spec.ts`: fixture armies — pool calculation, `EXPOSURE_LIFE_MULT = 0.85` homogeneous combat, target priority, whole-unit casualties, early end when one side has zero combat after round 1–4, round-5 stalemate continuation
- [ ] T031 [P] Add `apps/server/src/core/combat/strategy-service.spec.ts` (or fold into T030): multiplier lookup per round/class for `balanced`, `opening_strike`, `hold_the_line`

### Implementation

- [ ] T032 Add `COMBAT_ROUND_INTERVAL_MS` (proposed `30_000`) in `apps/server/src/app/scheduling/intervals.ts` per [`022-timing-and-resources`](../022-timing-and-resources/spec.md)
- [ ] T033 Extend `JobQueue` port in `apps/server/src/app/port/job-queue.ts` with `scheduleCombatRoundAdvance({ battle_id, round })` (and document queue name in `README.md`)
- [ ] T034 Implement worker `apps/server/src/adapter/job-queue/combat/advance-round.ts` for queue `combat.round.advance` payload `{ battle_id, round }`; register in `apps/server/src/adapter/job-queue/register-workers.ts`
- [ ] T035 Implement `CombatStrategyService` multiplier lookup in `apps/server/src/core/combat/strategy-service.ts`
- [ ] T036 Implement `CombatService` round resolver in `apps/server/src/core/combat/combat-service.ts` (pools, exposure, simultaneous strike, loss budget `max(1, floor(attack_pool / max(1, life_pool)))`, append `round_summaries` shape to battle state)
- [ ] T037 Implement `apps/server/src/app/command/combat/advance-round.ts`: load battle `state_json`, run `CombatService` for round `r`, persist casualties + summary, detect early end, else schedule round `r+1` with interval or invoke finish when `r === 5`
- [ ] T038 Persist `current_round`, `status`, `winner` (nullable until finish), `state_json.round_summaries` via `apps/server/src/adapter/database/repository/battle.ts`

**Checkpoint**: Battle advances through jobs in tests (mock queue or direct command); round summaries stored on battle row.

---

## Phase 4 — Outcomes & troop/world mutations

**Purpose**: Apply loot, occupy, destroy, retreat per outcomes matrix after last round.

- [ ] T039 Implement `apps/server/src/app/command/combat/finish-battle.ts` / `apply-battle-outcomes.ts`: set `winner`, `finished_at`, mutate troops (destroy stacks, retreat survivors to attack origin on defender win or draw with survivors), city/outpost ownership, temp outpost destroy, loot via carriers ([`015-resources-model`](../015-resources-model/spec.md) cap), civilian destroy on occupy default per spec
- [ ] T040 Chain battle completion from `advance-round` when battle ends (early or after round 5) into outcome command in `apps/server/src/app/command/combat/advance-round.ts`
- [ ] T041 Clear `movement_id` on surviving stacks and finalize attack movement state in troop repositories under `apps/server/src/adapter/database/repository/troop/`
- [ ] T042 [P] Add `apps/server/src/app/command/combat/apply-battle-outcomes.spec.ts` covering attacker win field/city/outpost, defender win retreat, draw stalemate (no loot/occupy/destroy), mutual wipe draw
- [ ] T043 Ensure draw vs win paths match [`spec.md`](./spec.md#outcomes-matrix) (attacker retreat on defender win **and** draw with survivors)

**Checkpoint**: Finished battle updates world state; still no inbox reports until Phase 5.

---

## Phase 5 — Reports & realtime

**Purpose**: `battle` reports at battle end; WebSocket `battle:finished`; server query/handler extensions.

**Contracts**: [`contracts/communication-report-battle.md`](./contracts/communication-report-battle.md), [`contracts/websocket-events.md`](./contracts/websocket-events.md)

- [ ] T044 Add `ReportType.BATTLE = 'battle'` in `apps/server/src/core/communication/value/report-type.ts`; export via `packages/api-client`
- [ ] T045 Implement `apps/server/src/adapter/database/repository/report-battle.ts` and join in report get path
- [ ] T046 Implement `apps/server/src/app/command/communication/report/create-battle.ts`: insert attacker + defender `report` rows + `report_battle` metadata (`round_summaries_json`, casualties, outcome flags) in one transaction; invoke from `finish-battle` / `apply-battle-outcomes`
- [ ] T047 Extend `ReportFactory` in `apps/server/src/core/communication/report/factory.ts` with `generateBattleReport` (parallel to peaceful generators)
- [ ] T048 Extend `CommunicationGetReportQuery` in `apps/server/src/app/query/communication/report/get.ts` to attach `ReportBattleMetadata`; map in `apps/server/src/web/handler/communication/report/get.ts`
- [ ] T049 Extend `packages/api-client/src/endpoints/communication/report/get.ts` with optional `battle?: ReportBattleMetadata`; run `yarn client:build`
- [ ] T050 Add `AppEvent.BattleFinished = 'battle:finished'` in `apps/server/src/core/events.ts`; re-export in `packages/api-client/src/events.ts`
- [ ] T051 Emit `BattleFinished` once per `player_id` (attacker, defender) after each report commit in `create-battle.ts`
- [ ] T052 [P] Add server test `apps/server/src/app/command/communication/report/create-battle.spec.ts` (two rows, metadata round count, loot on attacker row only)
- [ ] T053 Register `apps/web/src/modules/communication/ws-listener.ts` (or extend existing listener) to invalidate `reportKeys.unreadCount` and `['reports']` on `AppEvent.BattleFinished` for session player
- [ ] T054 Add `ReportTypeLabels[ReportType.BATTLE] = 'Bataille'` in `apps/web/src/modules/communication/report/translations.ts`

**Checkpoint**: Battle end creates two unread reports; WS refreshes inbox without relying on `troop:movement-finished` alone.

---

## Phase 6 — Web UI (attack flow & battle detail)

**Purpose**: Attack movement UX, troop art/copy, battle report detail view.

- [ ] T055 [P] Add PNG placeholders or final art at `apps/web/public/troops/legionnaire.png`, `interceptor.png`, `war_machine.png`, `disruptor.png`
- [ ] T056 [P] Add `TroopTranslations` entries in `apps/web/src/modules/troop/translations.ts` (FR names from spec; description/effect copy)
- [ ] T057 Set troop image `alt` to translated name in `apps/web/src/modules/troop/list/item.tsx` (and detail components if applicable)
- [ ] T058 Extend movement create UI under `apps/web/src/modules/movement/`: action `attack`, `CombatStrategy` picker, troop selection filtered by `combat_role` rules (no scouts; require combat)
- [ ] T059 Wire create/estimate API calls to send `combat_strategy` when `action === 'attack'` (movement form + api-client hooks)
- [ ] T060 Branch `apps/web/src/modules/communication/report/details.tsx` for `type === 'battle'`: factions, strategies, winner, `round_summaries` table, outcome flags (`loot_applied`, `occupied`, `destroyed_temp_outpost`, `attacker_retreated`), troop lines via `TroopTranslations` + `troopImageSrc` in `apps/web/src/modules/troop/image.ts`
- [ ] T061 [P] Add web test coverage for battle report detail rendering in `apps/web/src/modules/communication/report/details.spec.tsx` (or nearest existing report test file)

**Checkpoint**: `yarn web:build` passes; human can launch attack and read battle report in UI.

---

## Phase 7 — System AI

**Purpose**: Alpha recruits singularity combat troops and launches cross-faction attacks.

- [ ] T062 Extend `apps/server/src/app/command/player/system/troops.ts`: recruit `war_machine` / `disruptor` via normal `recruitTroop` when below garrison thresholds (policy: ~20 `war_machine` then up to ~30% `disruptor` per spec)
- [ ] T063 Add attack tick action in `apps/server/src/app/command/player/system/actions.ts`: requires ≥1 combat stack on origin, valid cross-faction target, `createTroopMovement` with `action: attack` and strategy `opening_strike` when projected pool advantage ≥ 1.2 else `balanced`
- [ ] T064 Register attack action in system tick pipeline `apps/server/src/app/command/player/system/tick.ts` / `actions.ts` ordering alongside existing economy actions
- [ ] T065 Extend `apps/server/src/app/command/player/system/actions.spec.ts` for attack commit (mock `createTroopMovement` with `MovementAction.ATTACK` and strategy)
- [ ] T066 Document new pg-boss queue `combat.round.advance` in root `README.md` job table (Constitution V / bounded change visibility)

### Verification (docs + builds)

- [ ] T067 Run `yarn server:build` and `yarn web:build` from repository root (CI parity for this slice)
- [ ] T068 Run `yarn server:test:coverage` focusing on new `combat-service` and movement/saga specs; fix regressions
- [ ] T069 Execute manual checklist in [`quickstart.md`](./quickstart.md) when environments allow (post-impl smoke)

**Checkpoint**: System player can attack humans; slice 024 evidence paths match [`spec.md`](./spec.md#evidence-index-expected-after-implementation).

---

## Optional / nice-to-have (not required for slice closure)

- [ ] O001 [P] Optional toast « Nouveau rapport de bataille » on `battle:finished` in `apps/web/src/modules/communication/ws-listener.ts`
- [ ] O002 [P] Expose `battle_id` on `GET /troop/movement/:movement_id` response (api-client + handler) for future battle page
- [ ] O003 [P] Web UI to edit `default_combat_strategy` on city/outpost garrison settings (DB column from Phase 1; API + forms)
- [ ] O004 [P] Normalize `battle_round` table instead of `state_json.round_summaries` ([`data-model.md`](./data-model.md) alternative)
- [ ] O005 Post-implementation spec evidence updates in `specs/009-troops-stationary/spec.md`, `specs/010-troop-movement-combat/spec.md`, `specs/012-communication-reports/spec.md`, `specs/016-system-controlled-players/spec.md` (separate doc PR per plan)

---

## Dependencies & execution order

### Phase dependencies

| Phase | Depends on | Blocks |
| --- | --- | --- |
| 1 — Data & constants | — | 2–7 |
| 2 — Movement attack | 1 | 3 (battle start), 6 (UI needs create API) |
| 3 — Battle engine | 1, 2 | 4 |
| 4 — Outcomes | 3 | 5 |
| 5 — Reports & WS | 4 | 6 (battle detail needs metadata) |
| 6 — Web UI | 2, 5 (detail), 1 (troop codes) | — |
| 7 — System AI | 2 (attack movement) | — |

Phases 6 and 7 can proceed in parallel after their prerequisites (6 after 2+5; 7 after 2).

### Within-phase order

- Tests listed before implementation where TDD applies (Phase 2–3).
- Migrations before repositories; core services before app commands; commands before sagas/workers.
- api-client export + `yarn client:build` immediately after wire type changes (Phases 1, 2, 5).

### Parallel opportunities

- Phase 1: T003–T006, T012, T014 in parallel after T001 schema types exist.
- Phase 2: T016–T017 parallel; handler T020 parallel to query T021 after T019.
- Phase 3: T030–T031 parallel; T035–T036 parallel before T037.
- Phase 6: T055–T056 parallel; T061 after T060.

---

## Implementation strategy

### MVP (minimum shippable increment)

1. Complete Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.
2. **STOP and validate**: integration test path movement → battle → outcomes → two reports (T017, T052).
3. Add Phase 6 + 7 for full player-facing and Alpha behavior.

### Suggested commit slicing

- One commit (or PR) per plan phase on `main` with message prefix `024:` (e.g. `024: phase 1 combat schema and troop constants`).
- Run `yarn client:build` in any commit touching `packages/api-client`.

---

## Notes

- Do not emit `battle` reports at movement arrival (`sagaFinishAttack`); only at battle end (Phase 5).
- Defenders are auto-only; no manual intercept sagas in v1.
- French UI strings live in web modules; API returns `error_code` only (Constitution IV).
- Job name `combat.round.advance` must be registered before workers start (follow [`018-app-composition-jobs`](../018-app-composition-jobs/spec.md) patterns).
