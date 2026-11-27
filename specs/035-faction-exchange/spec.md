# Slice 035 — Faction exchange and water

**Status**: Partially implemented on `main`: water and buildings; exchange pending. Part 1 (water resource, Purificateur d'eau, Comptoir d'échange building, migration `00017_water`) is in; the order book, convoys, `trade` reports and the Bourse page are part 2.

## Summary

Add a **currency**, **water** (*eau pure*), and a per-faction **order book** (*bourse de faction*) where players buy and sell plastic, mushroom and plasma for water.

- **Water** is a fourth resource, produced slowly by a new building, the **Purificateur d'eau**. It is rare and vital after the collapse, and heavy to carry.
- **Order book**: limit orders (buy / sell), matched automatically by **price then time**, with **partial fills**. Players of the **same faction** only. No fees, no price bounds.
- **Delivery by carriers only**: on each fill, the seller's carriers take the goods to the buyer's city, and the buyer's carriers take the water to the seller's city. Resources **and** carriers are reserved when an order is placed. Convoys travel for real but **cannot be intercepted**, and they do **not** count toward the movement cap.
- **Comptoir d'échange**: building required to place orders; its level sets how many orders a city can have open.

This slice is large (new resource + market). The plan may split it into two deliveries: water first, then the exchange. Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`015`](../015-resources-model/spec.md) (resources), [`006`](../006-city-lifecycle-gathering/spec.md) (gathering), [`007`](../007-buildings-upgrade-queue/spec.md), [`010`](../010-troop-movement-combat/spec.md) (movements, transport weight), [`012`](../012-communication-reports/spec.md), [`017`](../017-realtime-websocket/spec.md), [`024`](../024-player-combat-pvp/spec.md) / [`026`](../026-plasma-economy/spec.md) (loot), [`028`](../028-command-center-shelter/spec.md) (movement cap, shelter), [`034`](../034-rankings/spec.md) (values).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Currency** | **Water** (`water`, FR *eau pure*), a new resource. |
| **Source** | A **producing building** (Purificateur d'eau); no system market maker. |
| **Market** | **Order book** per faction, pairs `plastic/water`, `mushroom/water`, `plasma/water`; price-time priority; partial fills. |
| **Delivery** | **Each side ships its part** with its own carriers; resources and carriers reserved at order placement. |
| **Interception** | None: real travel time only. |
| **Price bounds** | None (anti-abuse belongs to the security pass `038`). |
| **Movement cap** | Exchange convoys **do not count**. |
| **Fees** | None. |

## Water (resource)

### Model

| Topic | Rule |
| --- | --- |
| Type | `Resource` gains `water` everywhere: server `shared/resource.ts`, `packages/api-client`, resource stock (`water`, `last_water_gather`), movement payloads, reports. |
| Storage | **Unlimited**, like plasma. Cities only; outposts do not produce or store water. |
| Transport weight | `resource_transport_weight.water = 2` (heavy). |
| Loot | **25 %** of the unsheltered stock, like plasma ([`026`](../026-plasma-economy/spec.md)). Order: plastic → mushroom → plasma → water. |
| Shelter | Underground shelter ([`028`](../028-command-center-shelter/spec.md)) also shelters water: `base` 100, `multiplier` 1.6. |
| Prices | No building, technology, troop or defense costs water in this slice; it is a currency. |
| Rankings | Not counted in invested value ([`034`](../034-rankings/spec.md)); a water stock is not an investment. |
| Starting stock | 0. |

### Purificateur d'eau (`water_purifier`)

| Topic | Value |
| --- | --- |
| FR name | **Purificateur d'eau** |
| Earnings | `base` 0.05 water/s, `multiplier` 1.15 per level (× `GAME_TIME_SCALE`). Cell coefficient fixed at 1 until the map rework (lakes may get a bonus then). |
| Energy consumption | `base` 40, `multiplier` 1.25 |
| Requirements | `architecture` 3 |
| Cost | Plastic 2500 / 1.7, mushroom 2000 / 1.7, duration 200 s / 1.7 |

Production technologies of [`027`](../027-military-economy-technologies/spec.md) do not apply to water.

## Comptoir d'échange (`trading_post`)

| Topic | Value |
| --- | --- |
| FR name | **Comptoir d'échange** |
| Effect | Required (level ≥ 1) in the city that places an order. **Open orders per city = level.** |
| Energy | None |
| Requirements | `architecture` 2 |
| Cost | Plastic 1500 / 1.8, mushroom 1500 / 1.8, duration 150 s / 1.8 |

## Order book

### Markets and units

One book per **faction** and per pair:

| Pair | Quantity unit (lot) | Price |
| --- | --- | --- |
| `plastic/water` | 100 plastic | integer water per lot |
| `mushroom/water` | 100 mushroom | integer water per lot |
| `plasma/water` | 1 plasma | integer water per lot |

Quantities are whole lots; prices are integers ≥ 1.

### Placing an order

`POST /exchange/order` `{ city_id, side: 'buy' | 'sell', resource, lots, price }`

| Check | Error |
| --- | --- |
| Human player, city owned, `trading_post` ≥ 1 in that city | `exchange:trading-post-required` |
| Open orders of the city < `trading_post` level | `exchange:order-limit-reached` |
| `lots ≥ 1`, `price ≥ 1` | `exchange:order-invalid` |
| Enough stock to reserve | `city:not-enough-resources` |
| Enough **available** carriers in the city to carry the reserved payload | `exchange:not-enough-carriers` |

**Reservation (escrow)** at placement:

| Side | Resource reserved | Carriers reserved |
| --- | --- | --- |
| Sell | `lots × lot_size` of the resource, debited from the city stock | enough for that payload (weight × quantity ÷ `transport_capacity`) |
| Buy | `lots × price` water, debited from the city stock | enough to carry that water |

Reserved carriers stay on the city cell but are **unavailable**: `available = stack count − reserved`. Every movement creation and recruitment-related check uses `available`. The player does not pick carriers: the allocation takes the city's carrier stacks with the largest `transport_capacity` first.

Then the order is **matched** immediately (below); any rest stays in the book.

### Matching

- **Price-time priority**: a buy order matches the lowest sell prices first (oldest first at equal price); a sell order matches the highest buy prices first.
- A match happens when `buy.price ≥ sell.price`. The **execution price** is the **resting** order's price.
- **Partial fills**: `filled_lots = min(remaining buy, remaining sell)`.
- A player's own orders never match each other (skip them).
- Matching runs inside one transaction per incoming order, with a per-market lock (existing lock adapter) so concurrent orders cannot double-fill.

### On each fill

1. **Seller convoy**: `filled_lots × lot_size` of the resource leaves the seller's order city to the buyer's order city, carried by part of the seller's reserved carriers (just enough for that payload).
2. **Buyer convoy**: `filled_lots × execution_price` water leaves the buyer's order city to the seller's order city, carried by part of the buyer's reserved carriers.
3. If the buy order's limit price was higher than the execution price, the difference `filled_lots × (limit − execution)` water is **released** back to the buyer's stock.
4. Both players receive a `trade` report and the WS event `exchange:filled`.

Unused carriers stay reserved for the rest of the order. When an order is filled, cancelled or expired, all remaining reservations are released.

### Convoys (`exchange` movement)

- New `MovementAction.EXCHANGE`, created only by the system on fill. It never counts toward the movement cap and is never blocked by it.
- Duration from the slowest carrier, like any movement.
- **Arrival**: the cargo is deposited in the destination city **even above warehouse capacity** (the buyer paid for it). Gathering of a resource above capacity produces nothing until the stock falls below capacity (`gatherResourceStock` must clamp to ≥ 0). The carriers then return home with an automatic `base` movement.
- **Destination city no longer owned by the recipient**: deliver to the recipient's closest city. If the recipient has no city, the convoy returns and the cargo goes back to the sender.
- **Origin city captured while carriers are reserved there**: the city's open orders are cancelled; reservations are released to the new owner's stock along with the city (stock and troops of a captured city follow 024 rules).

### Cancel and expiry

- `DELETE /exchange/order/:order_id`: cancels the unfilled rest; reserved resources return to the order city's stock and carriers are released. Convoys already sent continue.
- Orders **expire after 7 days** (hourly job `exchange.order.expire`), with the same release.

## HTTP

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/exchange/order` | Place an order |
| `DELETE` | `/exchange/order/:order_id` | Cancel |
| `GET` | `/exchange/order/mine` | Own open orders (filled lots, reservations) and last 50 closed orders |
| `GET` | `/exchange/book?resource=` | Faction book for a pair: top 10 price levels per side (price, total lots), anonymous |
| `GET` | `/exchange/trades?resource=` | Last 50 trades of the faction for a pair (price, lots, time), anonymous |

## Events

| Event | Recipients |
| --- | --- |
| `exchange:filled` | Both parties (order id, lots, price) |
| `exchange:book-updated` | Connected players of the faction, throttled to once per 2 s per pair |

## Reports

`ReportType` **`trade`**: side, resource, lots, execution price, counterparty name, origin and destination cities, convoy arrival time. Convoy arrival writes no extra report (the `trade` report already gives the arrival time).

## System players

System players never trade, build trading posts or water purifiers in this slice. Their loot logic includes water automatically.

## Web UI

| Surface | Change |
| --- | --- |
| Header resources | Water stock and earnings, new water icon. |
| Buildings | Purificateur d'eau and Comptoir d'échange. |
| **Bourse** page | Pair selector; order book depth (bids / asks); last trades with a simple price line; order form (side, lots, price, city) showing the reservation it will make (resources + carriers) and the estimated delivery time to a typical city; own open orders with cancel; history. |
| Movements | Exchange convoys listed (read only). |
| Reports | `trade` report details. |
| Troops | Reserved carriers shown as "réservés pour la bourse". |

## Persistence

Migration (next free number):

| Table / column | Content |
| --- | --- |
| `resource_stock.water`, `resource_stock.last_water_gather` | Integer, default 0 / timestamp |
| `movement.water` (or the movement resources JSON) | Water cargo |
| `building` backfill | `water_purifier`, `trading_post` at level 0 for every city |
| `exchange_order` | `id`, `player_id`, `faction_code`, `city_id`, `side`, `resource`, `lots`, `filled_lots`, `price`, `status` (`open`, `filled`, `cancelled`, `expired`), `created_at`, `closed_at`; index `(faction_code, resource, side, status, price, created_at)` |
| `exchange_carrier_reservation` | `order_id`, `troop_id`, `count` |
| `exchange_trade` | `id`, `faction_code`, `resource`, `buy_order_id`, `sell_order_id`, `lots`, `price`, `executed_at` |

## Testing

| Area | Cases |
| --- | --- |
| Water | Purifier production, unlimited storage, transport weight, loot 25 %, shelter, API shape. |
| Orders | Trading post required; per-city limit; reservation of resources and carriers; `not-enough-carriers`; reserved carriers unavailable for movements. |
| Matching | Price-time priority; execution at resting price; partial fills across several orders; own orders skipped; buyer refund of price improvement; concurrency lock. |
| Convoys | Both convoys created per fill; not counted in cap; delivery above warehouse capacity; gather clamps at capacity; destination city lost; return trips. |
| Lifecycle | Cancel releases; expiry after 7 days; city capture cancels its orders. |
| Faction isolation | Orders never match across factions; book and trades scoped to faction. |

## Out of scope

- Intercepting convoys.
- Fees, price bounds, anti-feeding rules (security pass `038`).
- Trading between factions; system market maker.
- Water costs on game content; cell-dependent water production (map rework).
- Market orders (only limit orders).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`015`](../015-resources-model/spec.md) | Water resource. |
| [`006`](../006-city-lifecycle-gathering/spec.md) / [`007`](../007-buildings-upgrade-queue/spec.md) | Water gathering, new buildings, gather clamp above capacity. |
| [`010`](../010-troop-movement-combat/spec.md) | `exchange` action, water weight, reserved carriers. |
| [`024`](../024-player-combat-pvp/spec.md) / [`026`](../026-plasma-economy/spec.md) / [`028`](../028-command-center-shelter/spec.md) | Water in loot and shelter. |
| [`012`](../012-communication-reports/spec.md) / [`017`](../017-realtime-websocket/spec.md) | `trade` report, exchange events. |
| `CONTEXT.md` | **Water** (currency), **Order**. |

## Implementation notes — part 1 (water)

Part 1 delivers the **water** resource, the **Purificateur d'eau** and the **Comptoir d'échange** building (no orders yet). The order book, convoys, `trade` reports and the Bourse page are part 2.

- **`Resource.water`** is required everywhere (server `shared/resource.ts`, api-client `Resource`), so every literal carries it. `PricingService` returns `water: 0` in every cost and refund (it is a `Resource`); `purchaseResourceStock` already checks and debits water, so a future water price needs no engine change. The API cost DTOs (`upgrade_cost`, `research_cost`, troop `cost`) and the web `Cost` component are **unchanged**: nothing costs water.
- **Storage**: cities store unlimited water (no warehouse). `WarehouseCapacity` gains an optional `water` cap: absent = unlimited (cities), `0` for outposts (`OutpostService.getWarehousesCapacity`). Outposts neither produce nor store water: their `resource_stock.water` stays 0, their earnings carry `water: 0`, and `depositUpToCapacity` leaves the water in the cargo. A `transport` to an outpost brings its water back with the carriers; the movement estimate flags `destination_capacity_exceeded`. The outpost API (`GET /outpost/:id`, `/outpost`) exposes no water, and the web hides water for outposts (header, transport form).
- **Gathering**: same loop as plasma, with its own `last_water_gather` (`timestamptz`, default `now()`, like `last_plasma_gather`). Earnings are `BuildingService.getEarningsBySecond(WATER_PURIFIER)` × the city's production energy ratio: the purifier counts as a **production** consumer of energy, like the central inductor. Cell coefficient fixed at 1 (`resource_coefficient.water = 1` is set in code, not stored); `TechnologyService.getProductionMultipliers` returns `water: 1`, so Économie technologies never apply.
- **Gather clamp**: `getCappedEarnings` returns `max(0, capacity − stock)` when the stock would overflow, so a stock already above capacity gains nothing and never shrinks. The last gather time still advances (time spent above capacity is not banked).
- **Transport**: `resource_transport_weight.water = 2`; `movement.water` column. Request bodies of `POST /troop/movement` and `/troop/movement/estimate` that omit `water` (older clients) count it as 0 (`getResourcesFromBody` in `web/helpers.ts`), so the command layer always sees a full `Resource`.
- **Loot and shelter**: `combat_loot_ratio.water = 0.25`, looted last (plastic → mushroom → plasma → water); `underground_shelter_capacity.water` = base 100, ×1.6. As for the other resources, loot capacity counts **units**, not transport weight (unchanged rule). Reports store water in `report.water` / `report.remaining_water`; battle `sheltered` reads default `water` to 0 for rows written before this slice. Spy reports (tier ≥ 4) include the target's water; older spy reports show 0.
- **Rankings**: unchanged. Values come from costs (`plastic + mushroom + 5 × plasma`), never from stock, and no cost has water, so water is excluded by construction.
- **System players**: `sortBuildingsForSystemUpgrade` filters out `water_purifier` and `trading_post` (`SYSTEM_EXCLUDED_BUILDING_CODES`), so the AI never considers them. Their transport cargo is always `water: 0` (`resourcesForTransportToDestination`, `clampResourcesToTransportCapacity`); affordability checks (`canAfford`, `maxAffordableRecruitCount`, defense budget) include water, which costs nothing. Their cities can still hold water they loot from human cities.
- **Buildings**: both start at level 0 in new cities (`BuildingService.init`) and count toward the city's building level cap. `water_purifier` returns production metadata (current / next production and consumption, energy warning); api-client `isProductionBuilding` includes it. `trading_post` has no metadata; its details show the translated effect ("Donne accès à la bourse de faction…"). The trading post consumes no energy.
- **Migration** `00017_water`: `resource_stock.water` (integer, default 0), `resource_stock.last_water_gather` (timestamptz, default `now()`), `movement.water` and `report.water` / `report.remaining_water` (integer, default 0), level-0 `building` rows for both codes in every city. `down` drops the columns and keeps the building rows, like `00011`.
- **Web**: new `IconWater` (`ui/icon/water.tsx`); water in the header (cities), city page (stock and hourly production, no technology bonus), transport form (cities), battle loot / transport cargo / sheltered amounts and spy stock in reports (« eau pure »), shelter details. Building art is a placeholder: `water_purifier` → recycling plant, `trading_post` → plastic warehouse (`modules/building/image.ts`).
- **Hooks for part 2**: `Resource` and `resource_transport_weight` are shared with the api-client; cargo deposit is `ResourceStockEntity.depositUpToCapacity` (an exchange delivery should add to the stock directly, ignoring capacity, which the clamp now tolerates); movement creation and the cap are in `app/command/troop/movement/create.ts` / `AppService.assertMovementCapacity`; return trips in `createReturnBaseTrip` (`app/command/troop/movement/shared.ts`); trading post level via `repository.building.getLevel({ code: BuildingCode.TRADING_POST })`.

## Follow-ups — part 1

- **Artwork** for `water_purifier` and `trading_post` (remove the placeholders in `modules/building/image.ts` when `/buildings/<code>.png` lands).
- **Water carried to an outpost by a `base` movement** (a rebase, or loot returning to an attack launched from an outpost) is dropped like plastic overflow on a `base` arrival, since outposts store none.
- **Admin observability** (system player stats, ongoing movements) does not display water.
- **Balance**: purifier output and costs need a playtest once the exchange exists.

## Evidence index — part 1 (water)

| Area | Paths |
| --- | --- |
| Resource type | `apps/server/src/shared/resource.ts`, `packages/api-client/src/endpoints/shared/resource.ts` |
| Stock and gathering | `apps/server/src/core/resources/service.ts` (gather clamp, outpost water cap), `core/resources/resource-stock/entity.ts`, `adapter/database/repository/resource-stock.ts`, `app/service.ts` (city earnings, energy), `core/outpost/service.ts`; tests `core/resources/service.spec.ts`, `service.deposit.spec.ts`, `app/command/city/gather.spec.ts`, `app/service.spec.ts` |
| Buildings | `core/building/constant/{code,earnings,energy,order,shelter-capacity}.ts`, `core/building/{helper,service}.ts`, `core/pricing/constant/building.ts`, `core/requirement/constant/building.ts`, `app/query/building/get.ts`; tests `core/building/service.spec.ts`, `core/pricing/service.spec.ts`, `core/requirement/service.spec.ts`, `app/query/building/get.spec.ts` |
| Transport | `core/troop/constant/transport-weight.ts`, `core/troop/service.ts`, `core/troop/movement/entity.ts`, `adapter/database/repository/movement.ts`, `app/query/troop/movement/estimate.ts`, `web/helpers.ts`, `web/handler/troop/movement/{create,estimate,get,list}.ts`; tests `core/troop/service.spec.ts`, `app/command/troop/movement/create.spec.ts`, `finish/transport.spec.ts`, `finish/base.spec.ts`, `app/query/troop/movement/estimate.spec.ts` |
| Loot and reports | `core/combat/constant/loot.ts`, `app/command/combat/apply-battle-outcomes.ts`, `app/command/communication/report/create-battle.ts`, `adapter/database/repository/report.ts`, `app/command/troop/movement/finish/spy.ts`; tests `apply-battle-outcomes.spec.ts`, `create-battle.spec.ts`, `finish/spy.spec.ts`, `web/handler/communication/report/get.spec.ts` |
| System players | `app/command/player/system/{storage,transport,actions,troops,defenses}.ts`; test `storage.spec.ts` (`never ranks the water purifier nor the trading post`) |
| API shape | `packages/api-client/src/endpoints/{city,building}/get.ts`, `types/report-battle.ts`; `web/handler/city/get.ts` (+ `get.spec.ts`) |
| Migration | `apps/server/src/adapter/database/migrations/00017_water.ts`, `adapter/database/types.ts` |
| Web | `apps/web/src/ui/icon/water.tsx`, `ui/header/resources/index.tsx` (+ test), `modules/city/page.tsx`, `modules/movement/create/{index,resources/index}.tsx`, `modules/communication/report/{details,spy-details}.tsx`, `modules/building/{translations,image}.ts`, `modules/building/details/metadata/shelter/index.tsx` |

## Evidence index — part 2 (when implemented)

| Area | Expected paths |
| --- | --- |
| Exchange domain | `core/exchange/` (order, matching, lots, reservations) |
| Commands / queries | `app/command/exchange/`, `app/query/exchange/` |
| Convoys | `app/saga/finish/exchange.ts` |
| Jobs | `adapter/job-queue/exchange/expire.ts` |
| HTTP | `web/handler/exchange/` |
| Web | `modules/exchange/`, header resources, building modules |
