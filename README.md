# Eoneom game

Proof-of-concept web strategy game. This repository is a **Yarn 4** monorepo: the HTTP API lives in `apps/server` (`@eoneom/server`), the React client in `apps/web` (`@eoneom/web`), and the shared TypeScript client in `packages/api-client`.

## Prerequisites

- **Node.js** ≥ 22.12 (pg-boss requirement; LTS recommended)
- **Yarn 4** — the repo pins Yarn via Corepack (see root `package.json` `packageManager` field)
- **Docker** — for local Postgres (optional if you already run Postgres on `localhost:5432`)

Enable Corepack once so the correct Yarn version is used:

```bash
corepack enable
```

## Install dependencies

From the **repository root**:

```bash
yarn install
```

## Run Postgres locally

The server connects to Postgres via `DATABASE_URL` (default `postgres://eoneom:eoneom@localhost:5432/eoneom`).

From the repository root:

```bash
docker compose -f containers/docker-compose.yml up -d
yarn workspace @eoneom/server db:migrate
```

Data is stored under `containers/postgres-data`. To stop:

```bash
docker compose -f containers/docker-compose.yml down
```

(Legacy Docker Compose v1 users can run the same file with `docker-compose` instead of `docker compose`.)

## Launch the API server (from root scripts)

Root `package.json` exposes convenience scripts that delegate to the `@eoneom/server` workspace.

1. Build (TypeScript compile and dist layout):

   ```bash
   yarn server:build
   ```

2. Start (runs compiled output with pretty logs):

   ```bash
   yarn server:start
   ```

The API listens on **port 3000**. Endpoints are wired in `apps/server/src/web/router.ts`.

### Environment variables

Copy [`apps/server/.env.example`](apps/server/.env.example) to `apps/server/.env` and edit there. The server loads that file on startup (before other modules read configuration).

| Variable | Description |
| -------- | ----------- |
| `GAME_TIME_SCALE` | Optional **speed multiplier** (`1` = default). For example `2` makes the game **twice as fast**: wait times (recruitment, building upgrades, technology research, troop movement) are shortened, and **production earnings** (`BuildingService` rates used for gathering and warehouse timers) are multiplied by the same factor. Invalid, empty, or non-positive values fall back to `1`. |
| `DATABASE_URL` | Postgres connection string (default `postgres://eoneom:eoneom@localhost:5432/eoneom`). |
| `HTTP_PORT` | API listen port (default `3000`). |

Example from the repository root without a `.env` file:

```bash
GAME_TIME_SCALE=2 yarn server:start
```

### Tests

```bash
yarn server:test
```

### Workspace equivalents

The same commands can be run explicitly against the workspace:

```bash
yarn workspace @eoneom/server build
yarn workspace @eoneom/server start
yarn workspace @eoneom/server test
```

Additional scripts (lint, watch build, coverage) are defined only on `apps/server/package.json` — use `yarn workspace @eoneom/server <script>` for those.

## Launch the web app (from root scripts)

Root `package.json` exposes convenience scripts that delegate to the `@eoneom/web` workspace.

Start the development server (hot-reload, no automatic browser open):

```bash
yarn web:start
```

The React app listens on **port 3001** and expects the API on **port 3000**.

Build a production bundle:

```bash
yarn web:build
```

### Tests

```bash
yarn web:test
```

### Workspace equivalents

```bash
yarn workspace @eoneom/web start
yarn workspace @eoneom/web build
yarn workspace @eoneom/web test:ci
```

Additional scripts (coverage, eject) are defined only on `apps/web/package.json` — use `yarn workspace @eoneom/web <script>` for those.

## Other root scripts

| Script              | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `yarn client:build` | Build `@eoneom/api-client` (shared package)    |

Typical full-stack local setup: Postgres running and migrated, `yarn server:start` in one terminal, `yarn web:start` in another (API on 3000, UI on 3001).

## Interact with the server

With the server running, send HTTP commands and queries to port **3000**. See `apps/server/src/web/router.ts` for available routes.

## Architecture

### Adapter

Implements the application’s outbound ports: database, logging, locking, and the job queue.

#### Database

Postgres (Kysely) under `apps/server/src/adapter/database/`:

- Infra: `client.ts`, `types.ts`, `migrate.ts`, `migrations/`
- Domain repositories under `repository/` (`auth.ts`, `city.ts`, …) extend the generic Kysely repository
- Wired through `Factory.getRepository()` → `PostgresRepository`

#### Job queue

[pg-boss](https://github.com/timgit/pg-boss) under `apps/server/src/adapter/job-queue/`, using the same `DATABASE_URL` and a dedicated Postgres schema `pgboss` (created on `boss.start()`, not via Kysely migrations).

- Wired through `Factory.getJobQueue()`; started in `apps/server/src/index.ts` after the repository connects
- Workers are registered from `apps/server/src/app/job/register.ts`

**Building upgrades** and **technology research** finish via delayed jobs:

1. `upgradeBuilding` / `researchTechnology` debit resources and enqueue a delayed job (`building.upgrade.finish` with `singletonKey` = `city_id`, or `technology.research.finish` with `singletonKey` = `player_id`; `startAfter` = finish time)
2. The worker runs `finishBuildingUpgrade` (level bump, `building:upgrade-finished`) or `finishTechnologyResearch` (level bump, `technology:research-finished`)
3. Cancel cancels the pending job (buildings also refund resources; technology does not)
4. In-progress state lives in the queue (no timer columns on the building/technology rows). List/get still expose `upgrade_at` / `research_at` (and started-at) for the UI by reading the pending job

**City resource gathering** runs on a self-rescheduling `city.resources.gather` job (`singletonKey` = `global`, every 5 seconds). On each tick the worker gathers resources for all cities, then schedules the next run. The loop is ensured on server boot. City GET still applies a display-only virtual gather without writing the DB; the UI refreshes via `city:resources-gathered` WebSocket events.

### App

Features split into commands and queries.

#### Command

Commands brings modification to the API.

#### Port

Interfaces for repositories, logger, and lock implementations.

#### Query

Reads via application services or repositories.

#### Saga

Coordinates multiple commands when a use case spans several commands.

#### Service

Higher-level use cases for player-facing behavior.

### Core

Domain logic and mostly pure functions. Each module is organized as:

- `constant`, `value`, `entity`, `error`, `service`, `type` as needed for that bounded context

### Shared

Small helpers and types that avoid heavy port indirection.

### Event bus

`apps/server/src/app/event-bus.ts` exposes `AppEventBus`, a typed `EventEmitter` singleton (accessed via `Factory.getEventBus()`). Commands and sagas emit domain events after persisting their side-effects; the Web layer subscribes to those events to push real-time updates to connected clients.

Current events (`apps/server/src/core/events.ts`):

| Event | Emitted by | Payload |
| ----- | ---------- | ------- |
| `city:resources-gathered` | `gather` command (via 5s `city.resources.gather` job) | `city_id`, `player_id` |
| `building:upgrade-finished` | `finish-upgrade` command (via pg-boss worker) | `city_id`, `player_id` |
| `technology:research-finished` | `finish-research` command (via pg-boss worker) | `player_id` |
| `troop:movement-finished` | `finish/movement` saga | `player_id` |
| `outpost:created` | `finish/movement` saga | `player_id` |
| `outpost:deleted` | `troop/movement/create` command | `player_id`, `outpost_id` |

### Web

`http` boots Express, middleware, and the router. **Handlers** map routes to command/query behavior.

`ws.ts` opens a WebSocket server on the same port. After a player authenticates via the token query parameter, their connection is stored in memory. The server subscribes to all `AppEventBus` events and forwards the relevant payload to the matching player's socket. The React client (`apps/web/src/helpers/websocket.ts`) connects on login and invalidates React Query caches through per-module WS listeners (e.g. `registerBuildingWsListeners`) when messages arrive.
