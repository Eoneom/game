# Slice 018 — Application composition and background jobs

**Status**: As implemented on `main` (brownfield).

## Summary

The server process is composed in `apps/server/src/index.ts`: load env, connect Postgres, migrate, start pg-boss **job queue**, register workers, schedule recurring jobs, generate world (once), ensure system player, launch HTTP+WebSocket. **Factory** is the composition root for repository, logger, lock, event bus, and job queue.

## Startup sequence (`index.ts`)

1. `Factory.getRepository().connect()`
2. `migrateToLatest()` — `adapter/database/migrate`
3. `jobQueue.start()` — creates queues (see below)
4. `registerJobWorkers(jobQueue)` — `adapter/job-queue/register-workers.ts`
5. Schedule: city gather, outpost gather, report cleanup (immediate `execute_at: now()`)
6. `generateWorld()` — ignore `world:already-exists`
7. `ensureSystemPlayer()` — log errors
8. `ensureSystemPlayerTickScheduled({ tick_index: 0 })`
9. `launchServer({ logger, eventBus: Factory.getEventBus() })`
10. SIGTERM/SIGINT → `jobQueue.stop()` and exit

`gameTimeScale !== 1` logs a warning (`shared/game-time-scale`).

## Factory (`adapter/factory.ts`)

| Getter | Implementation |
| --- | --- |
| `getRepository()` | `PostgresRepository` singleton |
| `getJobQueue()` | `createJobQueue` (pg-boss adapter) |
| `getEventBus()` | `AppEventBus` |
| `getLock()` | `LockInMemory` |
| `getLogger` / `getTickLogger` | stdout loggers |
| `runInTransaction` | `withTransaction` |

## Job queues (pg-boss names)

| Queue | Policy | Worker command |
| --- | --- | --- |
| `building.upgrade.finish` | default | `finishBuildingUpgrade` |
| `technology.research.finish` | default | `finishTechnologyResearch` |
| `troop.recruit.progress` | stately | `progressTroopRecruitment` |
| `troop.movement.finish` | default | `sagaFinishOneMovement` |
| `city.resources.gather` | stately | `progressGatherAllCities` |
| `outpost.resources.gather` | stately | `progressGatherAllPermanentOutposts` |
| `communication.report.cleanup-old-read` | stately | `cleanupOldReadReports` |
| `system.player.tick` | stately | `tickSystemPlayers` |

Port interface: `apps/server/src/app/port/job-queue.ts`; adapter: `adapter/job-queue/job-queue.ts`.

## HTTP stack (`web/http.ts`)

Express + CORS + JSON body → `router()` → error middleware → `createServer` + `setupWebSocketServer`. Port from `HTTP_PORT` (default `3000`).

## Out of scope

`containers/` deployment manifests, CI workflows, marketing site.

## Evidence index

| Area | Paths |
| --- | --- |
| Entry | `apps/server/src/index.ts`, `apps/server/src/load-env.ts` |
| Factory | `apps/server/src/adapter/factory.ts` |
| Jobs | `apps/server/src/adapter/job-queue/`, `apps/server/src/app/port/job-queue.ts` |
| Migrations | `apps/server/src/adapter/database/migrate.ts` |
| Web boot | `apps/server/src/web/http.ts` |
