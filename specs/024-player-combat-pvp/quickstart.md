# Quickstart — 024 Player combat (PvP) (manual verification)

**Date**: 2026-10-17  
**Prerequisite**: Slice **024 implemented** on `main` (this document describes post-impl checks).

## Dev environment

From repository root (see `README.md`):

1. `corepack enable && yarn install`
2. Start Postgres: `docker compose -f containers/docker-compose.yml up -d`
3. `yarn server:dev` (API :3000, migrations on boot)
4. `yarn web:dev` (:3001)

Optional: set `GAME_TIME_SCALE` > 1 only if team accepts faster combat round pacing (round interval still uses `COMBAT_ROUND_INTERVAL_MS` scaled per [`022`](../022-timing-and-resources/spec.md)).

## Test accounts

| Player | Faction | How |
| --- | --- | --- |
| Human confederation | `the_confederation` | Sign up via web `/signup` (playable faction) |
| System singularity | `the_technological_singularity` | **Alpha** — auto-created on server boot (`ensureSystemPlayer`); cannot log in |

To fight Alpha as a human: locate **Core I** (or singularity stacks) on the map, ensure cross-faction cells are reachable, recruit combat troops on a confederation city.

### Accelerating combat (local)

- Lower `COMBAT_ROUND_INTERVAL_MS` in dev-only env if exposed, **or** run integration tests that call `advanceCombatRound` commands directly (preferred for CI).
- For manual UI test, wait ~30s × rounds between movement arrival and battle report (default interval per spec).

## Preconditions checklist

- [ ] Confederation city with `cloning_factory` ≥ 4 and `replication_catalyst` ≥ 1 (for `legionnaire`) per [`014`](../014-requirements-pricing/spec.md).
- [ ] At least one **combat** troop (`legionnaire` or `interceptor`) recruited on origin cell.
- [ ] Optional **carrier** (`light_transporter`) in attack army to verify loot on win.
- [ ] Enemy target: enemy troops on cell, enemy **city**, or enemy **outpost** (different `faction_code`).
- [ ] Same-faction attack must fail with typed error + French toast.

## Happy path — field stack attack

1. **Recruit** `legionnaire` on city A (`PUT /troop/recruit` or web troop UI).
2. Note origin coordinates (city cell) and an adjacent/enemy cell with singularity or another player’s troops.
3. **Create attack movement**:
   - `POST /troop/movement` with `action: "attack"`, `combat_strategy: "balanced"`, `troops: [{ code: "legionnaire", count: N }]`, `origin`, `destination`.
4. **List movements** — `GET /troop/movement` shows in-flight attack.
5. Wait for arrival (`troop.movement.finish` job).
6. Observe **battle progression** (logs or DB `battle.status`, `current_round`).
7. After battle finishes:
   - **Reports**: `GET /communication/report` — new `type: "battle"` for attacker; defender (or Alpha) gets second row.
   - **Detail**: `GET /communication/report/:id` includes `battle.round_summaries`, strategies, winner.
   - **WS**: client receives `battle:finished` → unread badge updates without relying only on `troop:movement-finished`.
8. Verify **outcome** on map: destroyed enemy stack or occupied cell per winner; on **defender win** or **draw**, attacker survivors back on **origin** cell.

## City assault

1. Target enemy **city** cell (different faction).
2. Attack with combat + carrier if testing loot.
3. On **attacker win**: city ownership transfers; garrison casualties in report; warehouse loot in attacker report `resources`.
4. On **draw** after 5 rounds: city stays defender; attacker retreated; no loot.

## Outpost assault

1. Target temporary enemy outpost with garrison.
2. **Attacker win**: temp outpost destroyed, cell held by survivors.
3. Permanent outpost: ownership transfer on win (no building deletion).

## Strategy & garrison default

1. Set `default_combat_strategy` on defender city/outpost (API TBD — city/outpost update handler).
2. Attack with `opening_strike`; confirm defender report shows defender strategy from garrison default.

## System player (Alpha)

1. Let system tick run until Alpha recruits `war_machine` / `disruptor` (watch admin observability if enabled [`020`](../020-system-player-observability/spec.md)).
2. When Alpha launches attack against human cell, human receives **defender** battle report with singularity troop names (**Machine de guerre**, **Perturbateur**) in UI.

## Regression checks

```bash
yarn client:build
yarn server:build
yarn web:build
yarn server:test:coverage   # movement + combat specs
```

Peaceful `explore` / `base` / `transport` still finish with existing report types and `troop:movement-finished` only (no premature `battle` report).

## Failure cases to spot-check

| Case | Expected |
| --- | --- |
| Attack same faction | `combat:same-faction-attack` (or `troop:*`) — French error |
| Attack without combat troop | validation error |
| Scout in attack army | rejected at create |
| Attack without `combat_strategy` | validation error |
| Movement estimate `attack` | ETA uses slowest unit speed including combat codes |
