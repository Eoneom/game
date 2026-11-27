# UI revamp — decisions (2026-11-27)

Outcome of the review session after slices 026–039. The player finds the web client hard to read on a 27" screen, the catalogues (buildings, technologies, troops, defenses) too long to scan, the map not useful, and the movements and Bourse pages unstructured. These decisions feed spec slices 040–047.

## Target

- **Design for 1920 × 1080** (desktop). No tablet or phone work.

## Typography and theme

- **Body text 16 px (1 rem)**, the web baseline. Secondary text (captions, labels, table meta) **12–14 px**, never below 12 px.
- **Keep the mood, fix contrast**: keep the rusty-bunker palette and the Oxanium font, but no scanlines or textures behind text, plain panels for data, text contrast raised (WCAG AA as the target for body text).

## Shell and navigation

- **Activity strip moves to the left column**: the horizontal "Activité" strip (construction, recherche, recrutement, défense progress chips) is removed from the top and merged into the left menu column, so there is one bar less.
- **Right column stays**: the location list (cities, outposts) stays on the right.
- **Chat** stays a collapsible bottom panel.
- **Header resources: compact + expandable**: the header shows stock only per resource (plastic, mushroom, plasma, water, energy); clicking opens a panel with rates per hour, warehouse capacity / fill, and the production breakdown (cell, technology, faction).

## City home page

- **City dashboard** at `/city/$cityId/base/`: cards for production per hour and warehouse fill, energy, building / research / recruitment / fortification queues, defense capacity, movements and incoming attacks, exchange orders. Each card links to its full page.

## Catalogues (buildings, technologies, troops, defenses)

- **Grouped card grid**: cards with image, level or count, next cost / time preview, and a state badge (upgradeable, missing requirement, in queue), grouped by branch or role.
- **Fixed right details panel** (as today): grid on the left, the selected entry's details and actions always visible on the right.

## Map

All four of:
- **Bigger view + zoom**: the map fills the workspace, zoom from about 7 × 7 up to 41 × 41 cells, minimap, "go to coordinates".
- **Readable markers**: cities and outposts coloured by relation (mine / ally / same faction / enemy / system), `[TAG]` and name on hover, size hint by level.
- **Movements on the map**: own and incoming movements drawn as arrows with ETA; clicking an arrow shows its details.
- **Act from the map**: clicking a cell opens actions in place (attack, spy, transport, reinforce, explore, settle) and the send form is prefilled with that destination.

Plus two information overlays:
- **Terrain bonus overlay**: cells coloured by resource coefficients (plastic / mushroom) to choose where to settle.
- **Targets & threats**: attackable targets near the player (system bases, enemy outposts) highlighted with last spy-report age and estimated strength.

## Movements

- **Split list + send wizard**: list in tabs **Sortants / Entrants / Retours / Convois** as a compact table with countdowns; sending is a 3-step flow: destination → action + troops → summary (duration, capacity, odds) → send.

## Bourse

- **Quick trade first**: one simple form at the top (resource selector, Vendre | Acheter, quantity in lots with the resource equivalent, price with the current best bid/ask, total in water, carriers needed, delivery estimate, "Placer l'ordre"); own orders below with progress and cancel; market depth, last trades and price chart folded in a collapsible "Marché" section.

## Artwork

- **Dedicated real-art slice**: produce original art for every placeholder (technologies 027/029/030, buildings 028/035, defenses 029/036/037/039, troops 036/037, Enceinte) so no two cards share a picture.

## Delivery

- **Specs first, then build**: write spec slices 040–047, the player reviews them, then implementation is orchestrated slice by slice with commits on `main`.
