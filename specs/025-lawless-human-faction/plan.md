# 025 — Implementation plan (draft)

## Phase 1 — Domain & boot

1. Add `FactionCode.THE_ASHEN_COVENANT` = `the_ashen_covenant` (or chosen wire code).
2. Add to `non_playable_faction_codes`.
3. French name in `apps/web/src/modules/faction/translations.ts`.
4. Generalize system boot: register `[Alpha, Harrow]` configs (name, faction, city prefix, spawn strategy).
5. Random spawn: pick explored-valid city cell with distance ≥ D from Alpha capital; fallback retry loop.

## Phase 2 — Troop roster (wild PvP quad)

1. Define four `TroopCode`s + `troop_characteristics` (wild stats).
2. Map in `troop_faction`; `TroopService.codesForFaction`.
3. Horror PNGs (four combat); wire web translations ATK/DEF/VIE labels.
4. Admin combat simulator faction picker: third faction.

## Phase 3 — AI profile

1. `SystemAiProfile` enum or `player.system_ai_profile` column.
2. Extract Alpha constants to `profile-singularity`; add `profile-ashen-covenant` with aggression table from spec.
3. Planner reads profile from snapshot; tests per profile.

## Phase 4 — Docs & admin

1. Update `004`, `016`, `024` quickstart faction rows.
2. Index row in `specs/README.md`.
3. Verify second observability card + force tick.
