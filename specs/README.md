# Spec slices (brownfield index)

Feature specs live under `specs/<slice>-<name>/spec.md`. Status reflects **implemented behavior on `main`**, not planned work.

| Slice | Topic | Status | Spec |
| --- | --- | --- | --- |
| 001 | Health API | Implemented | [spec](./001-health-api/spec.md) |
| 002 | Human player (session & signup) | Implemented | [spec](./002-player-session-auth/spec.md) |
| 004 | Faction domain | Implemented | [spec](./004-faction-domain/spec.md) |
| 005 | World grid & visibility | Implemented | [spec](./005-world-grid-visibility/spec.md) |
| 006 | City lifecycle & gathering | Implemented | [spec](./006-city-lifecycle-gathering/spec.md) |
| 007 | Buildings & upgrade queue | Implemented | [spec](./007-buildings-upgrade-queue/spec.md) |
| 008 | Technology research (incl. queue) | Implemented | [spec](./008-technology-research/spec.md) |
| 009 | Troops (stationary) | Implemented | [spec](./009-troops-stationary/spec.md) |
| 010 | Troop movement & combat (peaceful) | Implemented | [spec](./010-troop-movement-combat/spec.md) |
| 011 | Outposts | Implemented | [spec](./011-outposts/spec.md) |
| 012 | Communication & reports | Implemented | [spec](./012-communication-reports/spec.md) |
| 013 | Location activity | Implemented | [spec](./013-location-activity/spec.md) |
| 014 | Requirements & pricing | Implemented | [spec](./014-requirements-pricing/spec.md) |
| 015 | Resources model | Implemented | [spec](./015-resources-model/spec.md) |
| 016 | System-controlled players | Implemented | [spec](./016-system-controlled-players/spec.md) |
| 017 | Realtime WebSocket | Implemented | [spec](./017-realtime-websocket/spec.md) |
| 018 | App composition & jobs | Implemented | [spec](./018-app-composition-jobs/spec.md) |
| 019 | Web shell & routing | Implemented | [spec](./019-web-shell-routing/spec.md) |
| 021 | Admin operator tools | Implemented | [spec](./021-admin-operator-tools/spec.md) |
| 022 | Timing & resources | Implemented | [spec](./022-timing-and-resources/spec.md) |
| 024 | Player combat (PvP) | Implemented | [spec](./024-player-combat-pvp/spec.md) |
| 025 | Lawless human system faction | Implemented | [spec](./025-lawless-human-faction/spec.md) |
| 026 | Plasma economy | Implemented | [spec](./026-plasma-economy/spec.md) |
| 027 | Military and economy technologies | Implemented | [spec](./027-military-economy-technologies/spec.md) |
| 028 | Command center and underground shelter | Implemented | [spec](./028-command-center-shelter/spec.md) |
| 029 | City defenses | Implemented | [spec](./029-city-defenses/spec.md) |
| 030 | Intelligence: espionage and detection | Implemented | [spec](./030-intelligence/spec.md) |
| 031 | Empire overview | **Draft — needs refinement, not implementable** | [spec](./031-empire-overview/spec.md) |
| 032 | Messaging: mail and chat | Implemented | [spec](./032-messaging/spec.md) |
| 033 | Alliances | Implemented | [spec](./033-alliances/spec.md) |
| 034 | Rankings | Implemented | [spec](./034-rankings/spec.md) |
| 035 | Faction exchange and water | Implemented | [spec](./035-faction-exchange/spec.md) |
| 036 | Playable faction: La Symbiose | Implemented | [spec](./036-faction-symbiosis/spec.md) |
| 037 | Playable faction: L'Ordre du Bastion | Planned | [spec](./037-faction-bastion-order/spec.md) |
| 038 | Security pass before public launch | Planned | [spec](./038-security-pass/spec.md) |
| 039 | Confederation identity: defenses and logistics bonus | Planned | [spec](./039-confederation-identity/spec.md) |

**Merged slices** (stubs point to canonical spec): **003** → [002](./003-player-registration-signup/spec.md); **020** → [021](./020-system-player-observability/spec.md); **023** → [008](./023-technology-research-queue/spec.md).

**Admin routes** (slice **021**): observability at `/admin`; combat simulator at `/admin/combat-simulator`.
