# Eoneom

A post-collapse strategy game of cities, troops, and world cells.

## Language

**Faction**:
A closed affiliation. Some Factions are Playable. A Player belongs to exactly one Faction, assigned at creation and never changed.
_Avoid_: alliance, guild, clan, race, team

**Playable**:
A Faction a commander may choose at signup.
_Avoid_: selectable, choosable

**Player**:
A named commander who belongs to exactly one Faction.
_Avoid_: user, account, character

**System-controlled**:
A Player that cannot log in and is driven by the server controller. Assigned at creation and never changed.
_Avoid_: bot, NPC, AI, treating it as a separate type from Player

**Troop**:
A stack of a single unit type owned by a Player, stationed on a cell or a movement. Each unit type belongs to exactly one Faction.
_Avoid_: army

**Defense**:
A stack of a single fixed structure type owned by a Player, built in a city. It never moves and only fights when its city is attacked.
_Avoid_: building, troop, tower

**Letter**:
A private message with a subject, sent by one Player to another.
_Avoid_: mail item, email, DM

**Alliance**:
A named group of Players of the same Faction who coordinate. A Player belongs to at most one Alliance.
_Avoid_: guild, clan, team, faction

**Reinforcement**:
Combat troops a Player stations in an allied Player's city.
_Avoid_: support, garrison (the garrison is the host's own troops)

**Chat channel**:
A real-time conversation shared by a set of Players (global, faction, alliance).
_Avoid_: room, lobby

**Role**:
A job a unit type performs. Several unit types, each belonging to one Faction, can share a Role.
_Avoid_: class, archetype, template, kind, job
