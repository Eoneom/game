# Slice 033 — Alliances

**Status**: Implemented on `main` (slice 033): alliance domain (`core/alliance/`), roles and permission matrix, invitations (7 days) and applications, 24 h leave cooldown (`player.alliance_left_at`), `/alliance` HTTP API and `alliance:*` events, `alliance` chat channel, `reinforce` movement with owner-only recall and automatic return, reinforcements in city defense (per-owner Arsenal modifiers, `reinforcement` report perspective), `reinforcement` report type, `GET /troop/reinforcement` and `/troop/reinforcement/abroad`, web Alliance page, chat tab, « Renforcer », stationed / abroad reinforcements, `[TAG]` labels, migration `00015_alliances`.

## Summary

An **Alliance** groups several human players of the **same faction**. It has:

- a name, a tag and a description;
- **roles**: chef, officier, membre;
- entry by **invitation** or **application**;
- **no member cap**;
- an **alliance chat channel** ([`032`](../032-messaging/spec.md)) and a member list with positions.

It also adds a military action, **`reinforce`**: a member stations combat troops in an **allied city**, where they defend with the host's garrison. Only their owner can recall them.

Players of the same faction already cannot attack each other ([`024`](../024-player-combat-pvp/spec.md)), so an alliance is about **coordination**, not protection. Shared vision is out of scope. Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`002`](../002-player-session-auth/spec.md), [`004`](../004-faction-domain/spec.md), [`010`](../010-troop-movement-combat/spec.md), [`012`](../012-communication-reports/spec.md), [`017`](../017-realtime-websocket/spec.md), [`024`](../024-player-combat-pvp/spec.md), [`027`](../027-military-economy-technologies/spec.md) (per-owner modifiers), [`028`](../028-command-center-shelter/spec.md) (movement cap), [`032`](../032-messaging/spec.md) (chat).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Scope** | Same faction only; human players only; one alliance per player; **no member cap**. |
| **Creation** | **Free** for any human player without an alliance. |
| **Cooldown** | **24 h** after voluntarily leaving before joining or creating another alliance. |
| **Reinforcement targets** | **Allied cities** only (not outposts, not own cities). |
| **Recall** | **Owner only**. The host cannot send reinforcements away. |
| **Shared vision** | Out of scope. |

## Vocabulary

Update `CONTEXT.md`: keep "alliance" in **Faction**'s _Avoid_ list (an alliance is not a faction), and add:

> **Alliance**: A named group of Players of the same Faction who coordinate. A Player belongs to at most one Alliance.
> _Avoid_: guild, clan, team, faction
>
> **Reinforcement**: Combat troops a Player stations in an allied Player's city.
> _Avoid_: support, garrison (the garrison is the host's own troops)

## Alliance

### Identity

| Field | Rule |
| --- | --- |
| `name` | 3–30 characters, unique (case-insensitive). `alliance:name-invalid`, `alliance:name-taken` |
| `tag` | 3–5 characters `[A-Z0-9]`, stored uppercase, unique. `alliance:tag-invalid`, `alliance:tag-taken` |
| `description` | 0–1000 characters |
| `faction_code` | The creator's faction, fixed |

The tag is shown before player names (`[TAG] Name`) on map markers, reports, chat and alliance lists.

### Roles and permissions

| Action | Chef | Officier | Membre |
| --- | --- | --- | --- |
| View alliance, members, positions; alliance chat | yes | yes | yes |
| Leave | after transferring leadership (or dissolve if alone) | yes | yes |
| Invite a player; accept or refuse applications | yes | yes | no |
| Kick a member | yes (anyone) | members only | no |
| Promote / demote officers | yes | no | no |
| Edit description | yes | no | no |
| Transfer leadership | yes | no | no |
| Dissolve | yes | no | no |

Exactly one chef at all times. Forbidden actions fail with `alliance:forbidden`.

### Joining

| Path | Rule |
| --- | --- |
| Invitation | An officer or the chef invites a player by name. The invitation expires after **7 days**. The player accepts or refuses. |
| Application | A player applies to an alliance of their faction, with an optional message (≤ 500 characters). An officer or the chef accepts or refuses. |
| Checks at accept time | Same faction (`alliance:faction-mismatch`), human (`alliance:system-player`), not already in an alliance (`alliance:already-member`), cooldown over (`alliance:cooldown`). |

Joining cancels the player's other pending invitations and applications.

### Leaving

| Event | Effect |
| --- | --- |
| Leave (voluntary) | Starts the 24 h cooldown (`player.alliance_left_at`). |
| Kicked | No cooldown. |
| Dissolve | All members leave, no cooldown. Pending invitations and applications are deleted. |

On any departure, **reinforcements** between the departing player and the remaining members are sent home automatically (see below).

## Reinforcement

### The `reinforce` movement

Extend `MovementAction` with `REINFORCE = 'reinforce'`.

| Rule | Error |
| --- | --- |
| Destination is a **city** owned by a member of the player's alliance (not the player's own) | `alliance:invalid-reinforce-target` |
| Only `combat`-role troops, at least one | `alliance:combat-troops-only` |
| Movement cap ([`028`](../028-command-center-shelter/spec.md)) | `troop:movement:limit-reached` |

On arrival (`sagaFinishReinforce`): if the city is still owned by an alliance member, the troops are stationed on the city cell with their **owner's** `player_id`, and the host receives `reinforcement:arrived` plus a `reinforcement` report. Otherwise the troops return home automatically, without the cap check.

### Stationed reinforcements

- Stationed troops can only be **recalled** by their owner: a `base` movement from the host cell to one of the owner's own cities or outposts. It counts toward the movement cap. No other action can start from a foreign cell.
- The host cannot recall, move, use or dismiss them.
- No upkeep.
- **Automatic return** (not blocked by the cap) when owner and host stop being in the same alliance (leave, kick, dissolve). The return goes to the owner's closest city.

### Combat

When an allied city is attacked ([`024`](../024-player-combat-pvp/spec.md)):

| Topic | Rule |
| --- | --- |
| Defender stacks | Host's troops **and** every reinforcement stack on the cell, plus the host's defenses ([`029`](../029-city-defenses/spec.md)). |
| Strategy | The host's garrison default applies to all defender stacks. |
| Modifiers | Arsenal modifiers ([`027`](../027-military-economy-technologies/spec.md)) are snapshotted **per stack owner**: `BattleStack` gains `player_id`, and modifiers are keyed by owner. Fortification stays the host's. |
| Casualties | Same order rules; losses are recorded per stack and owner. |
| Loot | Taken from the host's stock only. |
| Attacker win | Reinforcements on the cell are destroyed with the garrison (they have no survivors by definition, since combat units must all be dead). |
| Reports | Each reinforcement owner receives a `battle` report with perspective **`reinforcement`**, their own losses, and the outcome. `battle:finished` is emitted to them too. |

### Data integrity

Several players can now hold troops of the same code on the same cell. Every troop query by cell and code must also filter by `player_id` (e.g. `troop.getInCell` used by recruitment). Audit all callers of `listInCell` / `getInCell` / cell-scoped troop updates in this slice.

## Alliance chat

The `alliance` channel ([`032`](../032-messaging/spec.md)) is open to current members only (stored as `alliance:<alliance_id>`). Leaving removes access immediately; history remains for the alliance. Messages are deleted with the alliance on dissolve.

## HTTP

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/alliance` | Create `{ name, tag, description? }` |
| `GET` | `/alliance/mine` | Own alliance with members (name, role, cities with coordinates), or `null` |
| `GET` | `/alliance?q=` | Search alliances of the caller's faction (name or tag prefix) |
| `GET` | `/alliance/:alliance_id` | Public view: name, tag, description, member count, chef |
| `PUT` | `/alliance/description` | Edit (chef) |
| `POST` | `/alliance/invitation` | Invite `{ player_name }` |
| `PUT` | `/alliance/invitation/:id/accept` / `refuse` | Invited player answers |
| `GET` | `/alliance/invitation` | Caller's pending invitations |
| `POST` | `/alliance/:alliance_id/application` | Apply `{ message? }` |
| `GET` | `/alliance/application` | Pending applications (officer/chef) or own applications |
| `PUT` | `/alliance/application/:id/accept` / `refuse` | Officer / chef answers |
| `DELETE` | `/alliance/application/:id` | Applicant withdraws |
| `PUT` | `/alliance/member/:player_id/role` | Promote / demote `{ role }` (chef) |
| `PUT` | `/alliance/leader` | Transfer `{ player_id }` (chef) |
| `DELETE` | `/alliance/member/:player_id` | Kick |
| `POST` | `/alliance/leave` | Leave |
| `DELETE` | `/alliance` | Dissolve (chef) |
| `GET` | `/troop/reinforcement?city_id=` | Reinforcements stationed in one of the caller's cities (owner, troops) |
| `GET` | `/troop/reinforcement/abroad` | Caller's troops stationed in allied cities |

Errors also include `alliance:not-found`, `alliance:not-member`, `alliance:invitation-not-found`, `alliance:application-not-found`.

## Events (WebSocket)

| Event | Recipients |
| --- | --- |
| `alliance:updated` | All members (membership, roles, description changes) |
| `alliance:invitation-received` | Invited player |
| `alliance:application-received` | Chef and officers |
| `alliance:joined` / `alliance:left` | The player concerned |
| `reinforcement:arrived` / `reinforcement:recalled` | Host |

## System players

System players never join or create alliances and cannot receive reinforcements. Their attack scoring includes reinforcement stacks when simulating against a city.

## Web UI

| Surface | Change |
| --- | --- |
| Navigation | New **Alliance** entry. |
| Without alliance | Create form; search alliances of the faction with "Postuler"; pending invitations (accept / refuse); own applications (withdraw); cooldown notice. |
| With alliance | Header (name, tag, description); member list with role and cities (coordinates, link to the map); invite form; applications to handle; role actions per member; leave / transfer / dissolve. |
| Chat panel | **Alliance** tab when the player is a member. |
| Movement create | "Renforcer" when the destination is an allied city and only combat troops are selected. Since [`045`](../045-movements-revamp/spec.md): the only action the send wizard offers on an allied city (step 2), with combat-only troop rows; the owner recall and automatic returns are listed under « Retours » (`movement.is_return`). |
| City troops page | "Renforts stationnés" section (owner, troops) — read only for the host. |
| Troops abroad | List of own reinforcements with "Rappeler". |
| Names | `[TAG]` prefix on map markers, reports and chat. |
| World map ([`044`](../044-world-map-revamp/spec.md)) | `GET /world/markers` computes the `ally` relation (same `alliance_id` as the viewer, from `alliance.listTagsByPlayerIds`; it beats `system` and `faction`): green markers, green minimap dots, and « Renforcer » in the cell menu of an allied city (allied outposts get no action). Member city links (`?x=&y=`) centre and select the cell, also while the map is open. |
| Battle report | `reinforcement` perspective. |

## Persistence

Migration (next free number):

| Table / column | Content |
| --- | --- |
| `alliance` | `id`, `name`, `name_normalized` (unique), `tag` (unique), `description`, `faction_code`, `created_at` |
| `alliance_member` | `alliance_id`, `player_id` (unique), `role`, `joined_at` |
| `alliance_invitation` | `id`, `alliance_id`, `player_id`, `invited_by`, `created_at`, `expires_at` |
| `alliance_application` | `id`, `alliance_id`, `player_id`, `message`, `created_at` |
| `player.alliance_left_at` | Nullable timestamp for the cooldown |

Report metadata: the `battle` perspective enum gains `reinforcement`; new `ReportType` `reinforcement` (arrival notice to the host).

## Testing

| Area | Cases |
| --- | --- |
| Alliance lifecycle | Create (unique name/tag), invite / apply / accept / refuse, faction mismatch, already member, cooldown after leave but not after kick or dissolve, invitation expiry, permissions matrix, single chef, dissolve cleanup. |
| Reinforce | Valid target only; combat troops only; arrival stations troops; destination no longer allied → return; recall by owner counts toward cap; host cannot recall; leaving triggers automatic return. |
| Combat | Reinforcements join defender stacks; per-owner Arsenal modifiers; host strategy and fortification; loot from host only; per-owner reports and events. |
| Data integrity | Recruitment and cell-scoped queries ignore other players' stacks of the same code. |
| Chat | Alliance channel members only; access removed on leave. |

## Out of scope

- Shared vision.
- Alliance rankings (slice `034`).
- Alliance diplomacy, wars, shared resources, alliance technologies.
- Reinforcing outposts.
- Inactive chef handover.

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`010`](../010-troop-movement-combat/spec.md) | `reinforce` action, recall rules. |
| [`024`](../024-player-combat-pvp/spec.md) | Reinforcements in defender stacks, per-owner modifiers, `reinforcement` perspective. |
| [`012`](../012-communication-reports/spec.md) | `reinforcement` report type. |
| [`017`](../017-realtime-websocket/spec.md) | Alliance and reinforcement events. |
| [`032`](../032-messaging/spec.md) | Alliance channel enabled. |
| `CONTEXT.md` | **Alliance**, **Reinforcement**. |

## Implementation notes

- **Names and tags**: `[TAG] Name` comes from `AllianceService.displayName`. Chat authors carry `alliance_tag` (history and live messages); map city and outpost markers carry `alliance_tag` and the web prefixes the marker label (markers show the city name, not the player's). Reports resolve names at read time: `battle_players` (`attacker_name`, `defender_name`) on battle reports and `reinforcement.owner_name` on `reinforcement` reports, so a renamed or departed player shows the current tag. Alliance lists show `[TAG] Name` for alliances.
- **`GET /alliance/mine`** answers `{ alliance, cooldown_until, viewer_player_id }` instead of a bare `null`: `alliance` is `null` without an alliance, `cooldown_until` is the end of the running leave cooldown (the web cooldown notice), `viewer_player_id` lets the page tell the caller's row apart. Members are listed by join date with `{ player_id, name, role, joined_at, cities: [{ id, name, coordinates }] }`, plus `viewer_role`.
- **Search** (`GET /alliance?q=`): name or tag prefix, case-insensitive (`%`, `_`, `\\` escaped), caller's faction only, sorted by name, at most 20, with `member_count`; an empty `q` lists the faction's alliances. **Public view** (`GET /alliance/:alliance_id`) is open to any authenticated player.
- **Identity**: name trimmed, uniqueness on `name_normalized` (lower-cased); tag uppercased; description kept as typed (blank → empty), over 1000 characters is `alliance:description-invalid` (new code). Name and tag uniqueness are checked before insert (`alliance:name-taken` / `alliance:tag-taken`); the unique indexes back them up.
- **Invitations**: inviting checks the target's faction, humanity and membership at once (same errors as at accept time) as well as at accept; an unknown name is `player:not-found`. Inviting a player who already has a pending invitation from the alliance returns it (no second event). The cooldown is only checked at accept time, so a player may receive invitations during it. Expired invitations stay in the table and are filtered out (`expires_at > now`); answering one is `alliance:invitation-not-found`, as is answering someone else's.
- **Applications**: checks faction (`alliance:faction-mismatch`), humanity and membership when applying, and again at accept time (with the cooldown). Applying twice to the same alliance returns the pending application. Message trimmed, blank → `null`, over 500 characters is `alliance:message-invalid` (new code). `GET /alliance/application` answers `{ received, sent }`: `received` (officers and chef only, empty otherwise) and the caller's own pending `sent` applications.
- **Roles**: `PUT /alliance/member/:player_id/role` accepts `officier` or `membre` only (`alliance:role-invalid`, new code); changing one's own role, kicking oneself or targeting a non-member is `alliance:forbidden` / `alliance:not-member`. **Transfer**: the old chef becomes `officier`, so there is exactly one chef. **Leaving**: the chef always gets `alliance:forbidden` (they transfer leadership first, or dissolve when alone).
- **Times**: the 7-day expiry and the 24 h cooldown are real time, not scaled by `GAME_TIME_SCALE` (like the 032 rate limits).
- **Events**: `alliance:joined` is also sent to the creator; `alliance:updated` goes to every current member after joins, departures, role and description changes; `alliance:left` carries `reason` (`leave` | `kick` | `dissolve`). All are emitted after the command transaction commits.
- **Dissolve**: reinforcements between members go home, the alliance chat messages are deleted (`chat_message.deleteByChannel('alliance:<id>')`), then the alliance row is deleted and members, invitations and applications cascade.
- **Chat**: `chatChannelKey` returns `null` for `alliance` without an alliance; `canAccessChannel` takes the player's current `alliance_id` (post, history and abuse reports look it up on every call, so leaving removes access at once). The `chat:message` payload carries `member_ids` (current members) for the alliance channel and `ws.ts` filters on it.
- **`reinforce` creation**: checks run in the spec order — target (`resolveReinforceTarget`: a city whose owner shares the player's alliance; outposts, own cities, empty cells, non-members and players without alliance are `alliance:invalid-reinforce-target`), then combat troops only (`TroopService.assertReinforcementArmy`), then the cap.
- **Foreign origin**: a cell holding another player's **city** is foreign (outposts cannot be reinforced, so troops on another player's outpost keep the previous rules). From it only a `base` to one of the player's own cities or outposts is accepted (`troop:movement:foreign-origin`, new code); it counts toward the cap and sends `reinforcement:recalled` to the host. The temporary-outpost cleanup in `createTroopMovement` now also requires the outpost to be the player's own (leaving a foreign temporary outpost empty no longer deletes it).
- **Arrival** (`finishTroopReinforceMovement`): the target is resolved again; the movement troops are merged into the owner's own stacks on the host cell (`listInCell` with the owner's `player_id`), the host gets a `reinforcement` report (`troops` = troops stationed) with a `report_reinforcement` row holding `owner_player_id` (table not listed in the spec's persistence section; stored like `report_spy`), and the saga emits `reinforcement:arrived`. The owner gets no report, only `troop:movement-finished`. A failed target check sends the troops back to the movement origin through `createReturnBaseTrip` (no cap check), finished at once by the saga when already due.
- **Automatic return** (`app/command/troop/reinforcement/return-home.ts`): on leave and kick, reinforcements between the departing player and the remaining members go home in both directions; on dissolve, every reinforcement between members. One `base` movement per owner and host city, from the host city to the owner's closest city (Manhattan distance), or closest outpost when they hold no city; an owner with neither keeps the troops stationed. The owner's `tactical_propulsion` applies, the cap is not checked, and each return emits `reinforcement:recalled` to the host. A `reinforce` movement still under way is handled at arrival (the target check fails, the troops come back).
- **Combat snapshot**: for a city target, reinforcement stacks are the stationed troops of the host's **current alliance members** on the cell (one stack per owner and code, with `player_id`); other foreign troops on the cell (for example troops `base`d into a foreign city before this slice) are not counted. Host and attacker stacks carry no `player_id`, and `defender_owner_modifiers` (keyed by owner) is only written when reinforcements exist, so battles without reinforcements, stored battles and existing tests are unchanged. `stackModifiers` picks the owner's modifiers, else `defender_modifiers`; Fortification and plasma always come from the host. Exposure and the casualty order treat the pooled defender stacks as one army.
- **Outcomes**: `applyBattleOutcomes` still rewrites every troop row on the cell (as before); survivors are re-created per owner from `stack.player_id`. On an attacker win only attacker troops are re-created, so the reinforcements die with the garrison. Loot reads the cell stock (the host's). `createBattleReports` finds the reinforcement owners in the final defender stacks and the loss lines, writes one `reinforcement` perspective row each (`troops` = their loss lines), and strips those lines from the defender row; `advanceCombatRound` emits `battle:finished` to each owner. A `reinforcement` report shows the owner's Arsenal with the host's Fortification as `defender_modifiers`.
- **System players**: never members (create, invite, apply and accept reject them with `alliance:system-player`), so they can neither reinforce nor be reinforced. Attack scoring already reads every non-attacker stationed stack on the target cell (`defenderCombatStacksOnCell` in `system/combat-policy.ts`), so reinforcements are part of the simulation without change.
- **Web**: « Alliance » nav entry → `/alliance` (`modules/alliance/`: create, search with « Postuler » and an optional message, invitations, own applications, cooldown notice; header, members with roles and city links, invite form, applications, promote / demote / « Nommer chef » / exclude, leave, dissolve). Member city links open the map of the current city with `?x=&y=` (new optional search params on `/city/$cityId/world/map`: centered and selected). The chat panel shows the « Alliance » tab to members only and falls back to « Global » after leaving. « Renforcer » (`modules/movement/reinforce.ts`) is offered when the selection is combat-only and the destination is a city of another member. The city troop page shows « Renforts stationnés » (read only) and « Vos renforts à l'étranger » with « Rappeler », which sends a `base` movement to the current city. Battle reports show both sides' names and the `reinforcement` perspective; `reinforcement` reports show the owner and the troops.
- **Rankings** ([`034`](../034-rankings/spec.md)): alliances with at least 3 members are ranked by the average of their members; the alliance page shows its ranks per category (from `GET /ranking/me`), and the rankings link each alliance to a new public view `/alliance/$allianceId` on the web.

### Data integrity audit

Several players can hold the same troop code on one cell. Every cell-scoped troop query was checked:

| Call site | Query | Decision |
| --- | --- | --- |
| `app/command/troop/start-recruit.ts` | `troop.getInCell` | **Fixed**: `getInCell` now requires `player_id` (it read cell + code only and could pick an ally's stack). |
| `app/command/troop/movement/create.ts` | `listInCell(origin, player)` | Own troops: correct. Temporary-outpost deletion now also requires ownership (**fixed**). |
| `app/command/troop/movement/finish/base.ts` | `listInCell(destination, player)` | Merge into own stacks: correct. |
| `app/command/troop/movement/finish/reinforce.ts` (new) | `listInCell(host cell, owner)` | Own stacks only, never the host's. |
| `app/query/troop/list.ts` | `listInCell(cell, player)` | City / outpost troop lists stay own troops; reinforcements have their own endpoint. |
| `app/command/city/settle.ts` | `listInCell(outpost cell, player)` | Own founder: correct. |
| `app/service.ts` (`loadOutpostProductionInputs`) | `listInCell(cell, outpost owner)` | Gathering counts the owner's cultivators / salvagers only: correct. |
| `app/query/admin/system-player-stats.ts` | `listInCell` ×2 | Own troops: correct. |
| `app/command/troop/movement/attack-target.ts` | `listAllInCell` | Field targets only (cities and outposts resolve first); reinforcements only exist on city cells: unchanged. |
| `app/saga/finish/attack.ts` | `listAllInCell` | **Deliberately** includes the allied reinforcements (city target). |
| `app/command/combat/apply-battle-outcomes.ts` | `listAllInCell` | Rewrites the whole cell; survivors go back to their owner via `stack.player_id`. |
| `app/command/troop/movement/finish/spy.ts` | `listAllInCell` filtered on the target owner | Spy reports show the host's troops only (see follow-ups). |
| `app/command/player/system/combat-policy.ts` | `listAllInCell`, non-attacker | Includes reinforcements in attack scoring (spec). |
| `app/query/player/system/empire-intel.ts` | `listAllInCell`, non-own | AI intel counts every foreign stack, reinforcements included: correct. |
| `adapter/database/repository/movement.ts` (`listIncomingAttacks`) | troop subquery on `player_id` | Reinforcement owners also see attacks aimed at the allied cities they defend (with their own `detection` level). |
| `query/troop/get.ts`, `command/troop/progress-recruit.ts` | `getById` + owner check | Unchanged. `command/troop/cancel.ts`, `query/location/activity.ts` read the troop of a city's recruitment queue (the city owner's). |
| New: `troop.listReinforcementsInCell`, `troop.listStationedAbroad` | `player_id != host` / `troop.player_id = player` joined on a city of another owner | Reinforcement lists and automatic returns. |

## Follow-ups

- **Spy reports** ([`030`](../030-intelligence/spec.md)) do not reveal reinforcements stationed in a spied city.
- **`base` into a foreign city** is still accepted (pre-existing): such troops are not reinforcements, do not fight and are wiped by any battle on the cell; consider rejecting `base` to another player's city now that `reinforce` exists.
- **Recall rebase edge**: a recall whose destination outpost disappeared and hits the outpost limit rebases back to the host cell, even if the owner is no longer allied.
- **Owner notice**: the reinforcement owner gets no report on arrival or automatic return (only movement events); an owner without any city or outpost keeps troops stationed after a departure.
- **Historical names**: report names use the current tag; inactive chef handover stays out of scope.

## Evidence index

| Area | Paths |
| --- | --- |
| Domain | `apps/server/src/core/alliance/` (`entity.ts`, `type.ts`, `error.ts`, `constant/role.ts`, `constant/limits.ts`, `service.ts` + `service.spec.ts`: identity rules, permission matrix, kick / leave rules, join checks, cooldown, invitation expiry), `apps/server/src/core/player/entity.ts` (`alliance_left_at`), `core/troop/service.ts` (`assertReinforcementArmy`), `core/troop/constant/movement-action.ts`, `core/troop/error.ts`, `core/communication/chat/channel.ts`, `core/communication/service.ts`, `core/communication/value/report-type.ts`, `core/events.ts` |
| Commands | `apps/server/src/app/command/alliance/` (`create.ts`, `update-description.ts`, `invite.ts`, `answer-invitation.ts`, `apply.ts`, `answer-application.ts`, `roles.ts`, `depart.ts`, `shared.ts`; `lifecycle.spec.ts`: unique name / tag, invite / apply / accept / refuse / withdraw, faction mismatch, already member, cooldown after leave but not after kick or dissolve, expiry, permissions, single chef, dissolve cleanup, return on leave) |
| Queries | `apps/server/src/app/query/alliance/` (`mine.ts`, `search.ts`, `get.ts`, `invitations.ts`, `applications.ts`, `display-names.ts`, `shared.ts`), `apps/server/src/app/query/troop/reinforcement/` (`list.ts`, `abroad.ts` + `list.spec.ts`), `app/query/communication/report/get.ts`, `app/query/world/get-cells.ts` |
| Reinforcement | `apps/server/src/app/command/troop/movement/create.ts` (+ `create-reinforce.spec.ts`: valid target only, combat troops only, cap, recall by owner, foreign origin, host cannot move them), `reinforce-target.ts`, `finish/reinforce.ts` (+ spec: stationing with the owner id, host report, return when no longer allied), `apps/server/src/app/saga/finish/reinforce.ts` (+ spec), `saga/finish/movement.ts`, `apps/server/src/app/command/troop/reinforcement/return-home.ts` (+ spec: both directions, closest city, dissolve, no cap check) |
| Combat | `apps/server/src/core/combat/type/battle-stack.ts`, `core/combat/combat-service.ts` (+ `reinforcement.spec.ts`: pooled stacks, per-owner Arsenal, losses per owner, unchanged without reinforcements), `core/combat/value/report-perspective.ts`, `apps/server/src/app/saga/finish/attack.ts` (+ `attack-reinforcements.spec.ts`: members only, host strategy and fortification, per-owner modifiers), `app/command/combat/apply-battle-outcomes.ts`, `advance-round.ts`, `app/command/communication/report/create-battle.ts` (+ `apply-battle-outcomes-reinforcements.spec.ts`: survivors per owner, attacker win destroys reinforcements, host loot, per-owner reports and `battle:finished`) |
| Data integrity | `apps/server/src/app/port/repository/troop.ts`, `adapter/database/repository/troop.ts` (`getInCell` with `player_id`, `listReinforcementsInCell`, `listStationedAbroad`), `app/command/troop/start-recruit.ts` (+ spec: own stack only), `create-reinforce.spec.ts` (host only reads own troops) |
| Chat | `apps/server/src/app/command/communication/chat/post.ts` (+ spec: alliance key, member fan-out, non-member rejected), `app/query/communication/chat/history.ts` (+ spec: access removed on leave, tags), `app/command/communication/abuse-report/create.ts`, `adapter/database/repository/chat-message.ts` (`deleteByChannel`) |
| Persistence | `apps/server/src/adapter/database/migrations/00015_alliances.ts` (`alliance`, `alliance_member`, `alliance_invitation`, `alliance_application`, `player.alliance_left_at`, `report_reinforcement`), `adapter/database/types.ts`, `adapter/database/repository/alliance.ts`, `player.ts` (`setAllianceLeftAt`), `report.ts` (`createReinforcementReport`, reinforcement battle rows), `index.ts`, `apps/server/src/app/port/repository/{alliance,player,report,chat-message,generic}.ts`. Migration applied locally; repository SQL checked against Postgres in a rolled-back transaction |
| HTTP | `apps/server/src/web/handler/alliance/` (`create.ts`, `get.ts`, `invitation.ts`, `application.ts`, `member.ts`, `mapper.ts`), `web/handler/troop/reinforcement/list.ts`, `web/handler/communication/report/get.ts`, `web/router.ts` |
| Realtime | `apps/server/src/app/event-bus.ts`, `apps/server/src/web/ws.ts` (+ `ws.spec.ts`: alliance chat to members only, `alliance:updated`, `reinforcement:arrived`) |
| API | `packages/api-client/src/endpoints/alliance/`, `endpoints/troop/reinforcement/list.ts`, `endpoints/troop/index.ts`, `endpoints/communication/chat/shared.ts`, `endpoints/communication/report/get.ts`, `endpoints/world/get-cells.ts`, `types/report-battle.ts`, `events.ts`, `index.ts` (`AllianceRole`, `AllianceError`, limits) |
| Web | `apps/web/src/modules/alliance/` (`page.tsx`, `no-alliance.tsx`, `my-alliance.tsx`, `reinforcements.tsx`, `hooks.ts`, `ws-listener.ts`, `translations.ts` + test), `apps/web/src/routes/alliance/index.tsx` (moved from `routes/alliance.tsx` in slice 034), `ui/nav/menu/index.tsx`, `modules/communication/chat/panel.tsx` (+ test), `chat/storage.ts`, `modules/movement/reinforce.ts` (+ test), `movement/create/index.tsx`, `movement/translations.ts`, `modules/map/details/index.tsx`, `map/markers.tsx`, `map/page.tsx`, `routes/city/$cityId/world/map.tsx`, `modules/troop/page.tsx`, `modules/communication/report/details.tsx`, `report/translations.ts` (+ test), `modules/auth/hooks.ts`, `helpers/error-translations.ts`, `tsconfig.json` / `vite.config.ts` (`#alliance` alias) |
