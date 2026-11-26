# Slice 033 — Alliances

**Status**: Planned.

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
| Movement create | "Renforcer" when the destination is an allied city and only combat troops are selected. |
| City troops page | "Renforts stationnés" section (owner, troops) — read only for the host. |
| Troops abroad | List of own reinforcements with "Rappeler". |
| Names | `[TAG]` prefix on map markers, reports and chat. |
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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Domain | `core/alliance/` (entity, roles, permissions, errors) |
| Commands / queries | `app/command/alliance/`, `app/query/alliance/` |
| Reinforcement | `core/troop/constant/movement-action.ts`, `app/command/troop/movement/create.ts`, `app/saga/finish/reinforce.ts`, `app/query/troop/reinforcement/` |
| Combat | `core/combat/type/battle-stack.ts`, `app/saga/finish/attack.ts`, `app/command/combat/apply-battle-outcomes.ts`, `app/command/communication/report/create-battle.ts` |
| HTTP | `web/handler/alliance/`, `web/handler/troop/reinforcement/` |
| Web | `modules/alliance/`, chat panel, movement create, troop page |
