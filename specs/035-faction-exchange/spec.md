# Slice 035 — Faction exchange and water

**Status**: Planned.

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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Water | `shared/resource.ts`, `core/resources/`, `core/building/constant/earnings.ts`, `core/troop/constant/transport-weight.ts`, `packages/api-client/src/endpoints/shared/resource.ts` |
| Exchange domain | `core/exchange/` (order, matching, lots, reservations) |
| Commands / queries | `app/command/exchange/`, `app/query/exchange/` |
| Convoys | `app/saga/finish/exchange.ts` |
| Jobs | `adapter/job-queue/exchange/expire.ts` |
| HTTP | `web/handler/exchange/` |
| Web | `modules/exchange/`, header resources, building modules |
