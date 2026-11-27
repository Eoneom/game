# Slice 047 — Original artwork for every placeholder

**Status**: Planned.

## Summary

Slices 027 to 039 shipped **44 catalogue entries without their own picture**. Each one borrows the image of a related code through a placeholder map in its module's `image.ts`, so a Symbiose « Garde-racine » shows the Confederation « Légionnaire », the « Enceinte », the « Comptoir d'échange » and the « Barbelés » all show the plastic warehouse, and so on. With the grouped card grids of [`043`](../043-catalogue-card-grids/spec.md) the duplicates sit side by side and the cards stop being recognisable.

This slice produces **original art for every placeholder** (decision « Artwork » of [`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md)): 10 technologies, 5 buildings (including the Enceinte), 18 troops (Symbiose and Bastion rosters) and 11 defenses. It removes every placeholder entry and adds a test that fails when two cards share a picture or a file is missing.

No gameplay, server or API change.

**Depends on**: [`024`](../024-player-combat-pvp/spec.md) (troop art convention), [`027`](../027-military-economy-technologies/spec.md), [`028`](../028-command-center-shelter/spec.md), [`029`](../029-city-defenses/spec.md), [`030`](../030-intelligence/spec.md), [`035`](../035-faction-exchange/spec.md), [`036`](../036-faction-symbiosis/spec.md), [`037`](../037-faction-bastion-order/spec.md), [`039`](../039-confederation-identity/spec.md) (the placeholders and their follow-ups). Pairs with [`043`](../043-catalogue-card-grids/spec.md) (72 px card pictures, 128 px in the details panel).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Scope** | Every code that resolves to another code's picture today: **44 assets** (list in [Asset checklist](#asset-checklist)). |
| **Uniqueness** | **No two cards share a picture**, within a catalogue and across the four catalogues (technology, building, troop, defense). Enforced by a test. |
| **Paths** | `apps/web/public/<family>/<code>.png` with the wire code in snake_case: `/technologies/`, `/buildings/`, `/troops/` (existing) and **`/defenses/` (new folder)**. |
| **Format** | PNG, **1024 × 1024**, palette-quantised with `pngquant` (like the Ash Liturgy portraits), target ≤ 800 KB per file. |
| **Style** | Painterly post-collapse sci-fi, consistent with the existing art of each family; faction flavour: **Confédération** clean organo-synthetic, **Symbiose** organic / mycelium, **Bastion** pre-collapse military, **Liturgie des cendres** as existing. |
| **Placeholders** | Each placeholder entry is deleted in the same commit as its image; the placeholder maps disappear when empty. |
| **Delivery** | One commit per batch (family), like `ed4eb81`: Symbiose troops, Bastion troops, defenses, buildings, technologies. |

## Existing art and conventions

### Folders on `main`

| Folder | Files | Notes |
| --- | --- | --- |
| `apps/web/public/buildings/` | `central_inductor`, `cloning_factory`, `mushroom_farm`, `mushroom_warehouse`, `plastic_warehouse`, `recycling_plant`, `research_lab`, `solar_panel` (8) | 1024² except `solar_panel` 1536 × 1024; truecolor RGB, 2.2–3.0 MB each. |
| `apps/web/public/technologies/` | `architecture`, `outpost_expansion`, `outpost_logistics`, `photovoltaic_optimization`, `replication_catalyst` (5) | 1024² except `photovoltaic_optimization` 1536 × 1024; `outpost_expansion` palette PNG (0.77 MB), others truecolor (~2–2.6 MB). |
| `apps/web/public/troops/` | 27 portraits: Confédération (`explorer`, `settler`, `light_transporter`, `farmer`, `recycler`, `legionnaire`, `interceptor`, `shock_trooper`, `assault_behemoth`), Singularité (`seeker`, `assembler`, `hauler`, `harvester`, `reclaimer`, `war_machine`, `disruptor`, `prime_unit`, `striker_drone`), Liturgie des cendres (`ash_emissary`, `pyre_pilgrim`, `bone_cart`, `spore_acolyte`, `scrap_lector`, `penitent_horde`, `wraith_lancer`, `hemorrhage_cultist`, `cinder_titan`) | All 1024²; Ash Liturgy palette PNGs (0.47–0.69 MB), the rest truecolor (1.7–2.3 MB). No two files share content today (md5 checked). |
| `apps/web/public/defenses/` | — | **Created by this slice.** |
| `apps/web/public/ui/` | `tex-*.png` UI textures | Not catalogue art; out of scope. |

### Resolvers

| Catalogue | Resolver | Today |
| --- | --- | --- |
| Technology | `technologyImageSrc` in `apps/web/src/modules/technology/image.ts` | `placeholder_image_src` (10 entries) else `/technologies/<code>.png` |
| Building | `buildingImageSrc` in `apps/web/src/modules/building/image.ts` | `placeholder_image_src` (5 entries) else `/buildings/<code>.png` |
| Troop | `troopImageSrc` in `apps/web/src/modules/troop/image.ts` | `placeholder_image_code` (18 entries, code → code) then `/troops/<code>.png` |
| Defense | `defenseImageSrc` in `apps/web/src/modules/defense/image.ts` | `placeholder_image_src: Record<DefenseCode, string>` — **every** defense is a placeholder; no `/defenses/` path yet |

Users of the resolvers (unchanged by this slice): catalogue lists, items and details (`modules/{technology,building,troop,defense}/{list,details,queue}/…`), battle and spy reports (`modules/communication/report/{details,spy-details}.tsx`), the admin combat simulator (`modules/admin/combat-simulator/page.tsx`). Thumbnails go through `ui/entity-thumb.tsx` (56, 80 or 128 px squares, `object-cover`), so pictures are **cropped to a square**: subjects must sit in the centre.

### How art was produced so far (git history)

| Commit | Content |
| --- | --- |
| `3e2d8b3` « feat: add new building, technology, and troop images » | First batch (6 buildings, 2 technologies, 3 troops) + the `image.ts` resolvers and the list thumbnail. |
| `87c4782` « 024: faction combat troop artwork » | Replaced four duplicated portraits (`legionnaire`, `interceptor`, `war_machine`, `disruptor` were copies of one 1 889 745-byte file) with distinct art; documented in 024 « Combat troop artwork ». |
| `ed4eb81` « feat(web): original Ash Liturgy troop portrait art » | Replaced nine duplicate PNGs with « nine distinct ritual-horror unit portraits (1024², pngquant-optimized) ». |
| `c680280` « Add outpost_expansion technology artwork » | One technology image. |

The images were generated outside the repository (agent sessions; commit author « Cursor Agent ») and committed as binary PNGs, without prompts or source files. This slice keeps that pipeline and records the **brief** of each asset here instead, so the art can be regenerated consistently.

## Art direction

### Common rules

- **Painterly post-collapse sci-fi** (024: « portrait-card PNGs (~1024²), painterly sci-fi »): ruins, salvage, dust, improvised technology. Same rendering and lighting family as the existing files; before producing an item, open the two **style references** of its row and match brushwork, saturation and framing.
- **One clear subject**, centred, readable at **56 px** (smallest `EntityThumb`) and in the **72 px** card pictures of 043 (strong silhouette, value contrast against the background). Keep the important part inside the central 80 % (square crop).
- **Mid-dark backgrounds**, never pure black or pure white (dark rusty-bunker UI, 040), no frame or border (the UI draws the border), **no text, letters, logos, numbers or watermarks**.
- **Original work only**: no real insignia, brands, flags or recognisable characters.
- **Neutral entries** (technologies, buildings, common defenses) use the rusty-bunker palette of the UI: rust, amber, weathered chrome, sodium light.

### Families

| Family | Look | References |
| --- | --- | --- |
| **Technologies** | A scene or object that **shows the effect** (a workshop, a device, a test bench), not a person portrait. Branch tint: Arsenal warm metal and sparks, Économie industrial, Renseignement dusk / night with instrument glow. | `technologies/architecture.png`, `technologies/outpost_logistics.png` |
| **Buildings** | One structure as the subject, built from salvage on a ruined site, seen from slightly above, with a hint of activity (lights, people, smoke). Common to all factions. | `buildings/research_lab.png`, `buildings/plastic_warehouse.png` |
| **Defenses** (common) | One defensive work on the city edge, ruined skyline behind; same treatment as buildings. | `buildings/central_inductor.png`, `buildings/solar_panel.png` |
| **Confédération** (`railgun`, `holo_decoy`) | **Clean organo-synthetic**: smooth sand-white composite shells, grown-looking biopolymer joints, thin teal bioluminescent veins, warm orange accents of the Confederation palette (`explorer.png`: « warm desert/orange tactical palette », 024). Tidy, maintained, less rust than the others. | `troops/explorer.png`, `troops/legionnaire.png` |
| **Symbiose** (9 troops, `mycelium_wall`, `spore_cloud`) | **Organic / mycelium**: bodies and gear fused with fungal growth, filaments, caps, gills, spores in the air; damp ochres, bone white, moss greens, faint bioluminescent cyan-green. Unsettling but alive, not horror (distinct from the Ash Liturgy). | `troops/spore_acolyte.png` (fungal motif), `troops/farmer.png` (portrait framing) |
| **Bastion** (9 troops, `field_artillery`, `barbed_wire`) | **Pre-collapse military**: restored army hardware, olive drab, gunmetal, khaki canvas, sandbags, riveted plates, stencil-like markings without readable text; disciplined poses, heavy and slow. | `troops/shock_trooper.png`, `troops/war_machine.png` |
| **Liturgie des cendres** | **As existing** (ritual-horror, ash and embers, `ed4eb81`); no new asset in this slice. | `troops/ash_emissary.png` |
| **Singularité** | As existing (cold grey metal, cyan optics, 024); no new asset. | `troops/seeker.png` |

### Production steps (per asset)

1. Generate from the brief below + the two style references.
2. Crop / resize to **1024 × 1024**, subject centred.
3. `pngquant --quality=70-90 --strip --skip-if-larger --output <code>.png -- <source>.png`; check ≤ 800 KB and no visible banding at 128 px and full size.
4. Save as `apps/web/public/<family>/<code>.png`.
5. Delete the code's placeholder entry in `image.ts`; tick the checklist row (`[x]`) in this spec.
6. `yarn workspace @eoneom/web test:ci` (the uniqueness test, below).

## Asset checklist

Placeholder column = what the card shows today.

### Technologies (`/technologies/<code>.png`) — 10

| ☐ | Code | Name (FR) | Branch | Placeholder today | Brief |
| --- | --- | --- | --- | --- | --- |
| [ ] | `ballistic_alloys` | Alliages balistiques | Arsenal | `/troops/war_machine.png` | Forge bench in a bunker workshop: salvaged steel re-tempered, glowing armour-piercing slugs cooling in a quench tray, sparks. |
| [ ] | `organic_plating` | Blindage organique | Arsenal | `/troops/legionnaire.png` | Armour plates grown on mycelium in culture vats, a finished chitin-like plate hung on a rack, lab lamps. |
| [ ] | `tactical_propulsion` | Propulsion tactique | Arsenal | `/troops/interceptor.png` | Back-mounted plasma thrusters on a test stand, blue plasma exhaust, scorched floor, engineer silhouette for scale. |
| [ ] | `fortification` | Fortification | Arsenal | `/troops/assault_behemoth.png` | Cut-away of a wall section: rebar-laced scrap concrete, layered armour plates, redundant firing cables running inside. |
| [ ] | `advanced_recycling` | Recyclage avancé | Économie | `/buildings/recycling_plant.png` | Fine sorting line: conveyor of shredded waste, magnetic and optical sorters splitting clean plastic flakes into bins. |
| [ ] | `agronomy` | Agronomie | Économie | `/buildings/mushroom_farm.png` | Humidity-controlled grow trays of mushrooms, misting nozzles, substrate gauges, warm grow lights. |
| [ ] | `storage_compression` | Compression | Économie | `/buildings/plastic_warehouse.png` | Hydraulic press compacting plastic into dense cubes, neat stacks of compressed bales, pressure dial. |
| [ ] | `plasma_containment` | Confinement plasma | Économie | `/buildings/central_inductor.png` | Magnetic containment ring holding a stable plasma core, field emitters, calm violet-blue glow. |
| [ ] | `espionage` | Espionnage | Renseignement | `/troops/explorer.png` | A hidden observer in a ruin at dusk with binoculars and an improvised listening relay (wire antenna, headset). |
| [ ] | `detection` | Détection | Renseignement | `/buildings/research_lab.png` | Perimeter watch post: vibration sensors in the ground, proximity beacons, a scope screen with blips at night. |

### Buildings (`/buildings/<code>.png`) — 5

| ☐ | Code | Name (FR) | Placeholder today | Brief |
| --- | --- | --- | --- | --- |
| [ ] | `command_center` | Centre de commandement | `/buildings/research_lab.png` | Fortified command bunker with radio masts, light leaking from slits over a map table, couriers at the door. |
| [ ] | `underground_shelter` | Abri souterrain | `/buildings/mushroom_warehouse.png` | Reinforced hatch and ramp under ruins leading to sealed vault doors, crates being carried down. |
| [ ] | `city_wall` | Enceinte | `/buildings/plastic_warehouse.png` | City limit: ditch, earth embankment and a wall of welded scrap with a gate and a walkway, stretching off frame. |
| [ ] | `water_purifier` | Purificateur d'eau | `/buildings/recycling_plant.png` | Charcoal filter towers, salvaged membranes, solar stills, a clear water tank — the only clean blue in the scene. |
| [ ] | `trading_post` | Comptoir d'échange | `/buildings/plastic_warehouse.png` | Armoured counter with a grille, ledgers and scales, water canisters, carriers loading goods outside. |

### Troops — La Symbiose (`/troops/<code>.png`) — 9

| ☐ | Code | Name (FR) | Role | Placeholder today | Brief |
| --- | --- | --- | --- | --- | --- |
| [ ] | `drifting_spore` | Spore errante | scout | `explorer` | A drifting spore pod with sensory filaments and eye-like gills, floating over ruins on the wind. |
| [ ] | `seed_bearer` | Porte-germe | founder | `settler` | Hooded colonist carrying a glowing mycelium seed bulb in a harness, roots trailing. |
| [ ] | `mycelial_porter` | Portefaix mycélien | carrier | `light_transporter` | Slow fungal beast of burden, cargo bundles grown into its back, broad padded feet. |
| [ ] | `symbiont_grower` | Cultivateur symbiote | cultivator | `spore_acolyte` | Calm human with mushrooms growing from shoulders and forearms, harvesting from their own skin. |
| [ ] | `decomposer` | Décomposeur | salvager | `recycler` | Squat creature digesting plastic debris, translucent belly with flakes inside, mandibles. |
| [ ] | `root_warden` | Garde-racine | combat (line) | `legionnaire` | Infantry fused with roots anchoring into the ground, bark-like armour, shield of woven roots. |
| [ ] | `spore_swarm` | Essaim de spores | combat (fast) | `interceptor` | A fast hunting cloud of spores shaped like a striking predator, motion streaks. |
| [ ] | `fungal_colossus` | Colosse fongique | combat (siege) | `assault_behemoth` | Towering mycelium mass crushing a scrap wall, caps and fruiting bodies along its spine. |
| [ ] | `toxic_howler` | Hurleur toxique | combat (shock) | `shock_trooper` | Creature with swollen vocal sacs spitting a yellow-green paralytic mist. |

### Troops — L'Ordre du Bastion (`/troops/<code>.png`) — 9

| ☐ | Code | Name (FR) | Role | Placeholder today | Brief |
| --- | --- | --- | --- | --- | --- |
| [ ] | `sentinel` | Vigie | scout | `explorer` | Lookout on a high ruin with old field binoculars and a backpack radio, greatcoat in the wind. |
| [ ] | `field_engineer` | Ingénieur de campagne | founder | `settler` | Surveyor with a theodolite and stakes tracing the foundations of a new bastion. |
| [ ] | `supply_truck` | Camion de ravitaillement | carrier | `light_transporter` | Old armoured military truck patched with plates, canvas cover, jerrycans strapped on. |
| [ ] | `quartermaster` | Intendant | cultivator | `farmer` | Quartermaster with a clipboard among ration crates and bunker mushroom beds. |
| [ ] | `scrapper` | Ferrailleur | salvager | `recycler` | Soldier cutting up a pre-collapse vehicle carcass with a torch, salvage piled behind. |
| [ ] | `grenadier` | Grenadier | combat (line) | `legionnaire` | Heavily armoured line infantry, steel helmet and plate vest, grenade bandolier, immovable stance. |
| [ ] | `dragoon` | Dragon mécanisé | combat (fast) | `interceptor` | Armoured motorcycle with sidecar gun, rider in goggles, dust trail. |
| [ ] | `siege_tank` | Char de siège | combat (siege) | `war_machine` | Pre-collapse tank restored piece by piece, mismatched plates, long gun, treads in rubble. |
| [ ] | `mobile_mortar` | Mortier mobile | combat (shock) | `shock_trooper` | Towed heavy mortar and its crew, one loading, muzzle flash, shell crates. |

### Defenses (`/defenses/<code>.png`) — 11

| ☐ | Code | Name (FR) | Faction | Placeholder today | Brief |
| --- | --- | --- | --- | --- | --- |
| [ ] | `rampart` | Rempart | common | `/buildings/mushroom_warehouse.png` | Salvaged concrete blocks stacked and welded with steel straps into a thick, ugly wall. |
| [ ] | `turret` | Tourelle | common | `/troops/war_machine.png` | Heavy gun on a pivot mount behind a shield plate, ammunition belt fed from below the wall. |
| [ ] | `minefield` | Champ de mines | common | `/troops/reclaimer.png` | Approach strip with half-buried charges, warning stakes and a tripwire glinting at dusk. |
| [ ] | `plasma_battery` | Batterie plasma | common | `/buildings/central_inductor.png` | Cannon cabled to the city's inductor, coils charging with violet plasma glow. |
| [ ] | `shield_generator` | Générateur de bouclier | common | `/buildings/solar_panel.png` | Emitter pylons projecting a faint shimmering dome over rooftops, incoming shots deflected. |
| [ ] | `mycelium_wall` | Mur de mycélium | Symbiose | `/buildings/mushroom_farm.png` | Living wall of intertwined filaments, a cut section visibly regrowing, caps along the top. |
| [ ] | `spore_cloud` | Nuage de spores | Symbiose | `/troops/spore_acolyte.png` | Toxic spore haze rising from fungal vents along the walls, attackers' silhouettes blurred inside. |
| [ ] | `field_artillery` | Artillerie de position | Bastion | `/troops/assault_behemoth.png` | Pre-collapse heavy guns dug in behind sandbags and walls, range stakes, crew at the breech. |
| [ ] | `barbed_wire` | Barbelés | Bastion | `/buildings/plastic_warehouse.png` | Coils of barbed wire on iron stakes in front of a wall, snagged debris, low sun. |
| [ ] | `railgun` | Canon électromagnétique | Confédération | `/troops/striker_drone.png` | Long acceleration rail in a smooth sand-white composite housing, teal bioluminescent conduits to the inductor. |
| [ ] | `holo_decoy` | Leurres holographiques | Confédération | `/troops/seeker.png` | Sleek projectors casting translucent teal soldier silhouettes along a rampart walk. |

**Totals**: 10 + 5 + 9 + 9 + 11 = **44 files**.

## Code changes

| File | Change |
| --- | --- |
| `apps/web/src/modules/technology/image.ts` | Delete each `placeholder_image_src` entry as its file lands; final form `` export const technologyImageSrc = (code: TechnologyCode): string => `/technologies/${code}.png` ``. |
| `apps/web/src/modules/building/image.ts` | Same; final form `` `/buildings/${code}.png` ``. |
| `apps/web/src/modules/troop/image.ts` | Same for `placeholder_image_code`; final form `` `/troops/${code}.png` `` (back to the 024 helper). |
| `apps/web/src/modules/defense/image.ts` | Switch to `Partial<Record<DefenseCode, string>>` + `` `/defenses/${code}.png` `` fallback in the defenses batch; final form `` `/defenses/${code}.png` ``. |
| `apps/web/src/modules/faction/symbiosis.test.ts` | « uses existing artwork as placeholders for the Symbiose roster » → asserts own paths (`/troops/root_warden.png`). |
| `apps/web/src/modules/faction/bastion.test.ts` | « uses existing artwork as placeholders for the Bastion roster and defenses » → asserts `/troops/grenadier.png`, `/troops/siege_tank.png`, `/defenses/field_artillery.png`, `/defenses/barbed_wire.png`. |
| `apps/web/src/modules/defense/defense.test.ts`, `faction/confederation.test.ts`, `technology/branch.test.ts` | Keep the `.png` checks; tighten to the own-path form where they list codes. |
| Doc comments | Remove the « no dedicated artwork yet » comments of the four `image.ts` files. |

No change to components: every caller already goes through the resolvers.

## Uniqueness test

New `apps/web/src/helpers/artwork.test.ts` (vitest, jsdom environment; `node:fs`, `node:path`, `node:crypto` are available):

| Case | Assertion |
| --- | --- |
| Own path | For every code of `TechnologyCode`, `BuildingCode`, `TroopCode`, `DefenseCode` (api-client enums), the resolver returns `/<family>/<code>.png` — i.e. no placeholder left. |
| File exists | `apps/web/public` + src exists on disk for every code. |
| **Same catalogue** | Within each catalogue, no two codes resolve to the same src (`new Set(srcs).size === codes.length`); on failure the message lists the colliding codes, e.g. `troop: root_warden, grenadier → /troops/legionnaire.png`. |
| Across catalogues | No src is used by two catalogues. |
| Same content | No two referenced files have the same md5 (catches copied PNGs, as the duplicates fixed by `87c4782` and `ed4eb81`). |
| Size | Every referenced file is 1024 × 1024 (PNG IHDR bytes 16–23) and ≤ 800 KB for the files added by this slice (existing truecolor files are listed in an explicit allow-list until re-encoded, see assumption 3). |

**Staging while batches land**: until the last batch, the « own path » and « same catalogue » cases skip codes that are still keys of a placeholder map (each `image.ts` exports its map as `pending_artwork` for the test), and a final case asserts the total number of pending codes only goes down (constant `PENDING_ARTWORK_MAX = 44`, lowered in each batch commit). The last batch deletes the maps, the export and the staging branch, so the strict form remains.

## Batches

| # | Batch | Files | Commit message |
| --- | --- | --- | --- |
| 1 | Test + Symbiose troops | 9 | `feat(web): original Symbiose troop portrait art` |
| 2 | Bastion troops | 9 | `feat(web): original Bastion troop portrait art` |
| 3 | Defenses (new `/defenses/` folder) | 11 | `feat(web): original defense art` |
| 4 | Buildings incl. Enceinte | 5 | `feat(web): original building art for command center, shelter, Enceinte, purifier and trading post` |
| 5 | Technologies; placeholder maps removed | 10 | `feat(web): original technology art; drop artwork placeholders` |

Each batch updates the checklist rows of this spec and the « Artwork » follow-up of the originating spec (cross-links below).

## Testing

| Area | Cases |
| --- | --- |
| Uniqueness test | As specified above; fails when a placeholder is reintroduced, a file is missing, two codes share a src, two files share content, or a new file is oversized / not square. |
| Faction tests | Updated Symbiose / Bastion / Confédération assertions on own paths. |
| Manual | Open each catalogue (technologies, buildings, troops, defenses incl. the Enceinte card) and a battle report with defenses: every card shows a distinct picture, readable at thumbnail size, no crop cutting the subject. |

## Out of scope

- Re-drawing art that already has its own file (including the 1536 × 1024 `solar_panel` and `photovoltaic_optimization`).
- Faction-specific variants of common buildings, technologies or defenses (one picture per code).
- Map markers, faction emblems, avatars, UI textures (`public/ui/`), signup faction illustrations.
- WebP / AVIF or responsive `srcset` (could follow if catalogue pages load too slowly).

## Assumptions (confirm on review)

1. **The visual descriptions are inferred** from file names, specs (024 « painterly sci-fi », `ed4eb81` « ritual-horror ») and translations; the agent writing this spec could not view the images. The producer must check the two style references of each row before generating.
2. **1024 × 1024 square** for all new files (the two 1536 × 1024 outliers are not the norm and get cropped by `EntityThumb` anyway).
3. **Existing truecolor files are not re-encoded** in this slice (they stay 1.7–3 MB); the size check applies to new files only, with an allow-list for the old ones. Re-encoding them with `pngquant` is a cheap follow-up worth doing alongside the catalogue grid.
4. **Common defenses and buildings are faction-neutral** art in the UI palette; only faction-exclusive defenses carry faction styling.
5. **Generated art is acceptable**, as for the previous batches (agent sessions), provided it is original and free of real insignia or text.
6. **Batch order** puts the Symbiose and Bastion troops first (most visible duplicates: whole rosters copy the Confederation's).
7. The test lives in `apps/web/src/helpers/` because it spans four modules.

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`043`](../043-catalogue-card-grids/spec.md) | Remove « Placeholders stay until the artwork slice ». |
| [`024`](../024-player-combat-pvp/spec.md) | Artwork convention: add `/defenses/<code>.png`, the uniqueness test. |
| [`027`](../027-military-economy-technologies/spec.md) | Follow-up « Artwork » resolved (7 technologies). |
| [`028`](../028-command-center-shelter/spec.md) | Follow-up « Artwork » resolved (`command_center`, `underground_shelter`). |
| [`029`](../029-city-defenses/spec.md) | Implementation note « Artwork » resolved (defenses, Enceinte, `fortification`). |
| [`030`](../030-intelligence/spec.md) | « Artwork » resolved (`espionage`, `detection`). |
| [`035`](../035-faction-exchange/spec.md) | Follow-up part 1 « Artwork » resolved (`water_purifier`, `trading_post`). |
| [`036`](../036-faction-symbiosis/spec.md) | Follow-up « Artwork » resolved (9 troops, 2 defenses). |
| [`037`](../037-faction-bastion-order/spec.md) | Follow-up « Artwork » resolved (9 troops, 2 defenses). |
| [`039`](../039-confederation-identity/spec.md) | Follow-up « Artwork » resolved (`railgun`, `holo_decoy`). |

## Evidence index

| Area | Paths |
| --- | --- |
| Placeholder maps | `apps/web/src/modules/technology/image.ts`, `apps/web/src/modules/building/image.ts`, `apps/web/src/modules/troop/image.ts`, `apps/web/src/modules/defense/image.ts` |
| Existing art | `apps/web/public/buildings/*.png`, `apps/web/public/technologies/*.png`, `apps/web/public/troops/*.png` |
| Thumbnail | `apps/web/src/ui/entity-thumb.tsx` |
| Tests asserting placeholders | `apps/web/src/modules/faction/symbiosis.test.ts`, `apps/web/src/modules/faction/bastion.test.ts`, `apps/web/src/modules/faction/confederation.test.ts`, `apps/web/src/modules/defense/defense.test.ts`, `apps/web/src/modules/technology/branch.test.ts` |
| Codes and names | `apps/server/src/core/{technology,building,troop,defense}/constant/code.ts`, `core/troop/constant/{faction,role}.ts`, `core/defense/constant/faction.ts`, `apps/web/src/modules/{technology,building,troop,defense}/translations.ts`, `modules/technology/branch.ts` |
| Placeholder follow-ups | `specs/027-military-economy-technologies/spec.md` (Follow-ups), `specs/028-command-center-shelter/spec.md` (Follow-ups), `specs/029-city-defenses/spec.md` (Implementation notes, « Artwork »), `specs/030-intelligence/spec.md` (« Artwork »), `specs/035-faction-exchange/spec.md` (Follow-ups part 1), `specs/036-faction-symbiosis/spec.md`, `specs/037-faction-bastion-order/spec.md`, `specs/039-confederation-identity/spec.md` (Follow-ups) |
| Art history | commits `3e2d8b3`, `87c4782`, `ed4eb81`, `c680280` |
