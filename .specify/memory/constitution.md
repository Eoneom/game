# Eoneom Constitution

## Core Principles

### I. Ubiquitous domain language

Use the vocabulary defined in `CONTEXT.md` in specs, code, APIs, and player-facing copy.
Names such as **Faction**, **Player**, **Troop**, and **Role** are normative; avoid the listed
synonyms (for example user, army, guild). A **Player** belongs to exactly one **Faction** for
life; **System-controlled** players are still Players, not a separate type. Specs and plans MUST
call out domain terms explicitly when introducing new concepts.

### II. Monorepo boundaries

The repository is a **Yarn 4** workspace monorepo. Application code lives in `apps/server`
(`@eoneom/server`), `apps/web` (`@eoneom/web`), and shared contracts in `packages/api-client`.
Cross-package type and error-code changes MUST flow through `@eoneom/api-client` and respect
existing root scripts (`yarn server:*`, `yarn web:*`, `yarn client:build`). Node **≥ 22.12**
(required by pg-boss; CI uses Node 24). Do not add alternate package managers or break Corepack
pinning in root `package.json`.

### III. Server hexagonal architecture (ports and adapters)

`apps/server` follows inward-pointing dependencies documented in `.cursor/rules/server-hexagonal-architecture.mdc`
and `README.md` Architecture:

- **Domain** in `core/` — entities, domain services, errors, values; no I/O or framework imports.
- **Use cases** in `app/command`, `app/query`, `app/saga`; orchestration only via port types.
- **Driving adapters** in `web/` — validate, invoke command/query, map `@eoneom/api-client`; no SQL or repos.
- **Driven adapters** in `adapter/` — Postgres (Kysely), pg-boss jobs, logging, locks.
- **Composition** in `index.ts` and `adapter/factory.ts`.

New outbound capabilities require a port in `app/port`, an adapter implementation, and Factory
wiring. Handlers MUST NOT embed persistence or domain policy.

### IV. Typed API errors and French UI copy

API responses expose machine-readable `error_code` values, never ad-hoc strings. When adding or
changing errors, complete the checklist in `.cursor/rules/api-error-translations.mdc`: domain enum
in `apps/server/src/core/<context>/error.ts`, export via `packages/api-client`, French entry in
`apps/web/src/helpers/error-translations.ts`, UI via `translateError`, and `yarn client:build`
when api-client exports change. French strings stay on the web client; the wire format stays
codes only.

### V. Bounded, reviewable change

This codebase is **brownfield**: Spec Kit defines the *next* change, not a retroactive spec of
the entire game. Each feature spec MUST state compatibility boundaries (existing HTTP/WS
behavior, data migrations, job semantics). Prefer incremental slices that pass CI over
large undocumented rewrites. Database migrations MUST remain reversible where the team already
expects rollback (follow existing migration patterns under `apps/server`).

## Repository stack and runtime

| Area | Location / tool |
| ---- | ---------------- |
| HTTP API | `apps/server`, port 3000 (`HTTP_PORT`), router in `web/router.ts` |
| Web client | `apps/web`, dev port 3001, expects API on 3000 |
| Shared client types | `packages/api-client` |
| Local Postgres | `containers/docker-compose.yml`, `DATABASE_URL` |
| Background work | pg-boss (`adapter/job-queue/`), domain events via `AppEventBus` → WebSocket |
| Real-time | `web/ws.ts`, client `apps/web/src/helpers/websocket.ts` |

Specs that touch timing, gathering, upgrades, research, or movement MUST respect existing
pg-boss job names and event names in `README.md` unless the spec explicitly migrates them.

## Development workflow and quality gates

- Install: `corepack enable`, `yarn install` from repository root.
- Before merge, changes MUST keep CI green (`.github/workflows/ci.yml`): build `@eoneom/api-client`,
  then server (`build`, `test:coverage`) and web (`build`, `test:ci:coverage`).
- Use workspace or root scripts documented in `README.md`; do not bypass the monorepo graph.
- Cursor rules under `.cursor/rules/` amplify this constitution for server layout and errors;
  agents SHOULD load them when editing matching paths.
- Spec Kit skills live under `.cursor/skills/speckit-*`; use `/speckit-specify` → `/speckit-plan`
  → `/speckit-tasks` → `/speckit-implement` → `/speckit-converge` for the next bounded feature.

## Governance

This constitution guides Spec Kit planning and analysis. It does not replace `CONTEXT.md`,
`README.md`, or Cursor rules — it summarizes enforceable guardrails derived from them.

- **Amendments**: Propose edits via `/speckit-constitution` or a PR updating
  `.specify/memory/constitution.md`; bump the version below and note rationale in the PR.
- **Compliance**: Reviewers check domain language, monorepo boundaries, hexagonal layering, and
  error-code checklist when relevant files change.
- **Precedence**: On conflict, repository source files (`CONTEXT.md`, `README.md`, `.cursor/rules`)
  win until the constitution is deliberately amended to match a new team decision.

**Version**: 1.0.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-17
