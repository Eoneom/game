# Slice 046 — Bourse: quick trade first

**Status**: Planned.

## Summary

The « Bourse » page of [`035`](../035-faction-exchange/spec.md) (`/exchange`) shows everything at once: pair tabs and an explanation, the order book and last trades side by side, own orders, and the order form squeezed into the right details panel. Placing a simple order means reading the book, guessing a price, and decoding a reservation summary.

This slice reorders the page around one task, **trade now** (decision « Bourse » of [`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md)):

1. **« Échange rapide »** at the top: resource, « Vendre | Acheter », quantity in lots with its resource equivalent, price with the current best bid / ask and a « Prix du marché » helper, total in water, carriers needed, delivery estimate, city, validation, « Placer l'ordre ».
2. **« Mes ordres »** below: open orders with fill progress and « Annuler », closed history folded.
3. **« Marché »**, a collapsible section: depth, last trades and a price line.

The market rules of 035 do not change. The server gains a few read fields so the form can show matchable prices, an immediate-fill preview, the carrier shortfall and the cities that can trade.

**Depends on**: [`035`](../035-faction-exchange/spec.md) (order book, escrow, estimate), [`039`](../039-confederation-identity/spec.md) (carrier sizing and delivery speed bonus), [`028`](../028-command-center-shelter/spec.md) (convoys outside the cap), [`040`](../040-readability-typography-theme/spec.md) (type scale, plain panels), [`041`](../041-app-shell-navigation/spec.md) (header resources).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Layout** | Single main column (no right details panel): « Échange rapide » card first, « Mes ordres » second, « Marché » last and **collapsed by default**. |
| **Form fields** | Resource selector, « Vendre \| Acheter », lots with resource equivalent, price with best bid / ask and « Prix du marché », total in water, carriers needed, delivery estimate, city selector (only with several trading-post cities), validation messages, « Placer l'ordre ». |
| **Order type** | Unchanged: limit orders only, integer lots and prices ≥ 1, price-time matching, execution at the resting price (035). « Prix du marché » only **fills the price field**; it is not a market order. |
| **Market price** | Best **opposite** price among **other players'** open orders (own orders never match the caller, 035): selling → best bid, buying → best ask. |
| **Previews** | Escrow, carriers, delivery time and an immediate-fill estimate come from `POST /exchange/order/estimate` (extended). |
| **API** | Additive only: `GET /exchange/summary` (new), `own_lots` on book levels, extra estimate fields, `trading_posts` on `GET /exchange/order/mine`. |
| **URL** | `/exchange?resource=&side=`; quantity and price are local state. |
| **Target** | 1920 × 1080 desktop (decisions « Target »). |

## Current state (replaced)

| Piece | File | Fate |
| --- | --- | --- |
| Page: header copy, pair tabs, book + trades grid, own orders; form in `LayoutPage details` | `apps/web/src/modules/exchange/page.tsx` | Rewritten (sections below). The 035 explanation moves into a « Comment ça marche ? » disclosure inside « Marché ». |
| Order form (side, city, lots, price, reservation text) | `modules/exchange/order-form.tsx` | Replaced by `quick-trade/` (below). `formatReservedResources` kept (moved to `translations.ts`). |
| Depth tables | `modules/exchange/book.tsx` | Moved into « Marché », levels clickable, own lots marked. |
| Trades + SVG price line | `modules/exchange/trades.tsx` (`priceLinePoints` tested in `trades.test.ts`) | Moved into « Marché », with a time-span caption. |
| Own orders + history | `modules/exchange/my-orders.tsx` | Progress bar column, relative expiry, history folded. |
| Hooks, WS, styles, translations | `hooks.ts`, `ws-listener.ts`, `styles.ts`, `translations.ts` | Extended (summary query, invalidation, new copy). |
| Route | `apps/web/src/routes/exchange.tsx` (`?resource=`) | Adds `side`. |

## Page layout

```
┌ Bourse de faction ─────────────────────────────────────────────┐
│ ┌ Échange rapide ────────────────────────────────────────────┐ │
│ │ [Plastique 12 | 14] [Champignon 9 | 11] [Plasma 40 | —]    │ │
│ │ [ Vendre | Acheter ]                     Ville [Alpha ▾]   │ │
│ │ Quantité [ 3 ] lots  = 300 plastique   [Max]               │ │
│ │ Prix     [ 12 ] eau pure / lot  [Prix du marché]           │ │
│ │   Meilleur achat 12 (40 lots) · Meilleure vente 14 (8 lots)│ │
│ │ ─────────────────────────────────────────────────────────  │ │
│ │ Total  36 eau pure · Transporteurs 2 Transporteurs légers  │ │
│ │ Livraison ≈ 25 min · Exécution immédiate ≈ 3 lots          │ │
│ │ (validation message)                    [ Placer l'ordre ] │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌ Mes ordres ────────────────────────────────────────────────┐ │
│ │ open orders table · ▸ Historique (n)                       │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ▸ Marché — Plastique / eau pure                                 │
└─────────────────────────────────────────────────────────────────┘
```

At 1920 px the quick-trade card is two columns: **inputs** on the left (resource, side, city, quantity, price), **live summary** on the right (total, carriers, delivery, immediate fill, reservation, validation, button). The page content is capped at the shell's content width (041).

## « Échange rapide »

### Fields

| Field | Behaviour |
| --- | --- |
| **Ressource** | Three segmented buttons with `IconPlastic` / `IconMushroom` / `IconPlasma` and the label. Under each: « 12 \| 14 » (best bid \| best ask from `GET /exchange/summary`, « — » when a side is empty). Selecting one updates `?resource=` and resets nothing else. Default `plastic` (as today). |
| **Sens** | « Vendre \| Acheter » toggle (Vendre on the left, as in the decisions). Kept in `?side=sell\|buy`. Default `sell`. Selling is drawn in `danger` tone, buying in `terminal` tone, as the current tables do. |
| **Ville** | Shown only when **two or more** cities have a Comptoir d'échange (`trading_posts` of `GET /exchange/order/mine`). Options « Alpha — 1 / 3 ordres ». Default: the current route city when it has a trading post, else the first listed. Hidden with one trading-post city (its name appears as a caption « Depuis Alpha »). |
| **Quantité** | Integer input in **lots**, with − / + steppers and « Max ». Next to it the equivalent: « = 300 plastique » (`exchange_lot_size`: 100 plastic, 100 mushroom, 1 plasma per lot) — reuses `formatLots`. |
| **Prix** | Integer input « eau pure / lot » with − / + steppers. Under it: « Meilleur achat 12 (40 lots) · Meilleure vente 14 (8 lots) » from the summary. Button **« Prix du marché »**: sets the price to the best opposite price (sell → best bid, buy → best ask). Disabled when that side is empty, with « Aucun ordre en face : votre ordre attendra dans le carnet. ». |

**« Max »** quantity:

| Side | Max lots |
| --- | --- |
| Sell | `min(floor(stock_resource / lot_size), floor(available_carrier_capacity / (lot_size × weight)))` |
| Buy | `min(floor(stock_water / price), floor(available_carrier_capacity / (price × weight_water)))` (needs a valid price; disabled otherwise) |

`stock_*` from `useGetCity(selectedCityId)` (plastic, mushroom, plasma, water); `available_carrier_capacity` from the estimate (below); `weight` from `resource_transport_weight` (water = 2). « Max » is disabled until the estimate has answered once for the city.

### Live summary

From `POST /exchange/order/estimate` (debounced 300 ms, react-query as today in `useExchangeEstimate`) and the summary:

| Line | Sell | Buy |
| --- | --- | --- |
| **Total** | « Vous recevrez au moins 36 eau pure » (`lots × price`; a match at a higher bid pays more) | « Vous paierez au plus 36 eau pure » (`lots × price`, reserved now; a cheaper match refunds the difference, 035) |
| **Réservé** | « 300 plastique réservés » (`reserved_resources`) | « 36 eau pure réservés » |
| **Transporteurs** | « 2 Transporteurs légers » (`reserved_carriers`) | same |
| **Livraison** | « Livraison ≈ 25 min vers une ville typique de la faction » (`typical_delivery_duration`, `formatDeliveryDuration`) | same |
| **Exécution immédiate** | « ≈ 3 lots exécutés tout de suite pour ≈ 38 eau pure, le reste attend dans le carnet » or « Votre ordre attendra dans le carnet » (`immediate_fill`) | « ≈ 3 lots pour ≈ 33 eau pure » / « attendra » |
| **Ordres ouverts** | « Ordres ouverts dans cette ville : 1 / 3 » | same |

Carriers include the Confederation × 1.10 capacity, and the delivery time its × 1.05 non-combat speed (039) — already in the estimate query.

### Validation messages

Shown in one line above « Placer l'ordre », first failing rule only, in this order (mirrors the server order of 035):

| Condition | Copy | Source |
| --- | --- | --- |
| No city with a trading post | The whole card is replaced by « Construisez un Comptoir d'échange pour accéder à la bourse de faction. » + link « Voir les bâtiments » (current city's building page). | `trading_posts = []` |
| Lots not an integer ≥ 1 | « La quantité doit être un nombre entier de lots (au moins 1). » | client |
| Price not an integer ≥ 1 | « Le prix doit être un nombre entier d'eau pure par lot (au moins 1). » | client |
| Order limit reached | « Ce comptoir a déjà 3 ordres ouverts sur 3 : annulez-en un ou améliorez le comptoir. » | `open_order_count ≥ open_order_limit` |
| Not enough stock | Sell: « Stock insuffisant : 240 plastique disponibles, 300 nécessaires. » Buy: « Eau pure insuffisante : 20 disponibles, 36 nécessaires. » | `enough_resources = false` + city stock |
| Not enough carriers | « Transporteurs insuffisants : capacité 120 disponible, 300 nécessaire. Recrutez des transporteurs ou libérez-en. » | `reserved_carriers = null`, `carrier_load`, `available_carrier_capacity` |
| Estimate failed | « Estimation indisponible, réessayez. » | query error |

« Placer l'ordre » is disabled while any rule fails or the estimate is loading, and while the mutation is pending (« Envoi… »). Server errors after submit go through `translateError` (all `exchange:*` codes already translated, 035).

**After success**: existing toast (« Ordre placé dans la bourse » / « Ordre passé : N lots exécutés immédiatement »), quantity reset to 1, price and side kept, queries refreshed (`useRefreshAfterOrder` + the summary).

## « Mes ordres »

**Open orders** (all pairs, newest first):

| Column | Content |
| --- | --- |
| « Ordre » | « Vente · Plastique » (tone by side). |
| « Ville » | City name (« — » when captured). |
| « Progression » | Bar + « 3 / 10 lots » (`filled_lots / lots`). |
| « Prix » | « 12 eau pure / lot ». |
| « Réservé » | Remaining escrow and carriers (existing `Reservation` cell). |
| « Expire dans » | Relative « 6 j 4 h » (tooltip: absolute date from `expires_at`). |
| — | « Annuler » (ghost button, no confirmation: escrow and carriers come back, 035). |

Empty: « Aucun ordre ouvert. ». Orders of the selected pair are not filtered out; their row is subtly highlighted.

**« Historique »**: a disclosure « Historique (50 derniers) », **collapsed by default**, with today's closed-orders table (« Ordre », « Ville », « Exécuté », « Prix limite », « Statut », « Clos le »). Empty: « Aucun ordre clos. ».

## « Marché » (collapsible)

Header button « Marché — Plastique / eau pure » with a chevron; collapsed by default; open state remembered per viewer in `localStorage` (`eoneom:exchange:market-open`, wrapped in `try/catch`, closed when unavailable). Follows the selected resource.

| Block | Content |
| --- | --- |
| **Profondeur** | « Achats » (bids, highest first) and « Ventes » (asks, lowest first), top 10 levels each (`GET /exchange/book`): price, lots and a horizontal bar proportional to lots. Levels holding the caller's own orders show « dont 4 à vous » (`own_lots`). **Clicking a level prefills the form**: an ask → side « Acheter » at that price; a bid → side « Vendre » at that price (closes the 035 follow-up « no click-to-prefill »). |
| **Derniers échanges** | The last 10 trades (price, lots, date), « Voir les 50 » expands to the full list (`GET /exchange/trades`). |
| **Courbe des prix** | The existing SVG line (`priceLinePoints`) with « Min / Dernier / Max » and a caption of the span « 50 derniers échanges, du 25/11 14:02 au 27/11 09:41 ». No axes (kept simple). |
| **Comment ça marche ?** | The 035 explanation text (limit orders against water, faction only, price-time priority, execution at the resting price, no fees, 7-day expiry, convoys cannot be intercepted and do not count toward the movement cap). |

## API changes

All additive.

### `GET /exchange/summary` (new)

Best matchable prices and last trade for every pair of the caller's faction, in one call (resource selector, form hints, and the city dashboard exchange card).

```ts
// packages/api-client/src/endpoints/exchange/summary.ts
export interface ExchangeSummaryPair {
  resource: ExchangeResource
  /** Highest buy price among other players' open orders, with the lots at that price; null when none. */
  best_bid: ExchangeBookLevel | null
  /** Lowest sell price among other players' open orders; null when none. */
  best_ask: ExchangeBookLevel | null
  last_trade: { price: number, executed_at: number } | null
}
export interface ExchangeSummaryDataResponse {
  pairs: ExchangeSummaryPair[] // always the 3 pairs, in ExchangeResource order
}
```

Server: `app/query/exchange/summary.ts`, handler next to `book` in `web/handler/exchange/book.ts`, route `GET /exchange/summary` in `web/router.ts`, repository `exchange.bestLevels({ faction_code, exclude_player_id })` (one grouped query) and `exchange.lastTrade({ faction_code, resource })`. Own orders are **excluded** because matching skips them (035).

### `GET /exchange/book` — `own_lots`

`ExchangeBookLevel` gains `own_lots: number` (caller's own unfilled lots at that price, `0` otherwise). Totals still include them. The summary reuses `ExchangeBookLevel` with `own_lots = 0`.

### `POST /exchange/order/estimate` — extra fields

```ts
export interface ExchangeEstimateOrderDataResponse {
  // … existing fields (035)
  /** Transport load of the reserved payload: Σ amount × resource_transport_weight. */
  carrier_load: number
  /** Capacity of the city's available (unreserved) carriers, with the faction logistics bonus. */
  available_carrier_capacity: number
  /**
   * Dry run of the matching against other players' crossing open orders (price-time, execution at the resting
   * price). Approximate: does not check the resting side's carriers, so the real fill can be smaller.
   */
  immediate_fill: { lots: number, water: number }
}
```

Server: `app/query/exchange/estimate.ts` (reuse `exchange.listMatchableForUpdate` without `FOR UPDATE`, or a read variant `listMatchable`, and `ExchangeService.sortByPriority`; no lock taken).

### `GET /exchange/order/mine` — `trading_posts`

```ts
export interface ExchangeMineDataResponse {
  open: ExchangeOrder[]
  closed: ExchangeOrder[]
  /** Caller's cities with trading_post ≥ 1, by name. */
  trading_posts: { city_id: string, city_name: string, level: number, open_order_count: number }[]
}
```

Server: `app/query/exchange/mine.ts` (cities already loaded there; add `building.getLevel` per city or a batched `building.listLevels({ code: TRADING_POST, city_ids })`, and `exchange.countOpenByCity`).

### Events

No new event. The web `exchange:book-updated` listener also invalidates the summary query; `exchange:filled` also invalidates it.

## Web components

| New / changed | Path |
| --- | --- |
| Page | `modules/exchange/page.tsx` (three sections, no details panel) |
| Quick trade | `modules/exchange/quick-trade/index.tsx` (layout), `quick-trade/resource-selector.tsx`, `quick-trade/side-toggle.tsx`, `quick-trade/quantity-field.tsx`, `quick-trade/price-field.tsx`, `quick-trade/summary.tsx`, `quick-trade/validation.ts` (pure: first failing rule + copy, unit-tested), `quick-trade/max-lots.ts` (pure, unit-tested) |
| Own orders | `modules/exchange/my-orders.tsx` (progress, relative expiry, folded history) |
| Market | `modules/exchange/market/index.tsx` (collapsible), `market/book.tsx` (from `book.tsx`, clickable levels), `market/trades.tsx` (from `trades.tsx`), `market/help.tsx` |
| Hooks | `hooks.ts`: `useExchangeSummary`, `exchangeKeys.summary`; `useMyExchangeOrders` typed with `trading_posts` |
| WS | `ws-listener.ts`: invalidate `exchangeKeys.summary` |
| Translations | `translations.ts`: `formatReservedResources` (moved), side labels « Vendre » / « Acheter » for the toggle, validation copy, `formatRelativeExpiry` |
| Route | `routes/exchange.tsx`: `validateSearch` adds `side: 'buy' \| 'sell'` |
| Removed | `modules/exchange/order-form.tsx`, `book.tsx`, `trades.tsx` (moved under `market/`, tests follow) |

## Testing

| Area | Cases |
| --- | --- |
| Server — summary | Best bid / ask per pair exclude the caller's orders; lots summed at the best level; empty sides `null`; last trade newest; faction isolation; unknown faction pairs never mixed. |
| Server — book | `own_lots` counts only the caller's unfilled lots; totals unchanged. |
| Server — estimate | `carrier_load` (water weight 2), `available_carrier_capacity` with Confederation × 1.10 and minus reservations; `immediate_fill` follows price-time and execution at resting price, skips own orders, `0 / 0` when nothing crosses; no lock taken, no rows changed. |
| Server — mine | `trading_posts` lists only cities with level ≥ 1, with open order counts; captured cities absent. |
| Web — validation | `validation.ts`: rule order; copy with numbers; no-trading-post state. |
| Web — max lots | `max-lots.ts`: sell bounded by stock and by carriers; buy bounded by water and carriers; plasma lot size 1; disabled without price (buy). |
| Web — form | « Prix du marché » picks best bid when selling, best ask when buying, disabled on an empty side; resource and side in the URL; city selector hidden with one trading-post city; « Placer l'ordre » disabled while invalid or pending; quantity reset after success. |
| Web — market | Collapsed by default; open state survives reload and a throwing `localStorage`; clicking an ask sets « Acheter » + price, a bid « Vendre » + price; « dont N à vous » shown; existing `trades.test.ts` (`priceLinePoints`) kept. |
| Web — own orders | Progress text, relative expiry, history collapsed, cancel calls the mutation. |

## Out of scope

- Market orders, stop orders, order editing (cancel and re-place).
- Fees, price bounds, anti-feeding (security pass `038`).
- Charts with axes, candles or time scales.
- Showing incoming exchange convoys to the buyer (see slice 045 out of scope).
- Trading from outposts; trading between factions.

## Assumptions (confirm on review)

1. **Default side is « Vendre »** (left of the toggle, as written in the decisions); today's form defaults to « Achat ».
2. **No right details panel**: the page uses the full workspace; the quick-trade card is two columns at 1920 px.
3. **« Marché » collapsed by default** with the open state remembered per browser.
4. **Market price excludes own orders** (they cannot match the caller); the book still shows them, marked « dont N à vous ».
5. **Immediate-fill preview is approximate** (no resting-side carrier check) and labelled with « ≈ ».
6. **City selector lists only trading-post cities**; a player with none sees the empty state instead of the form.
7. **Clicking a book level prefills side and price** (the opposite side of the clicked level); quantity unchanged.
8. **Open orders are not filtered by pair** (all pairs, current pair highlighted).
9. **Cancel has no confirmation** (unchanged from 035).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`035`](../035-faction-exchange/spec.md) | HTTP table: `GET /exchange/summary`; `own_lots`; estimate fields; `trading_posts`; Web UI row « Bourse page » → quick-trade layout; close the « no click-to-prefill » follow-up. |
| [`017`](../017-realtime-websocket/spec.md) | `exchange:book-updated` / `exchange:filled` also refresh the summary (client only). |

## Evidence index

| Area | Paths |
| --- | --- |
| Current web page | `apps/web/src/modules/exchange/{page,book,order-form,my-orders,trades}.tsx`, `hooks.ts`, `styles.ts`, `translations.ts` (+ `translations.test.ts`), `trades.test.ts`, `ws-listener.ts`, `apps/web/src/routes/exchange.tsx`, `ui/layout/page.tsx`, `ui/icon/{plastic,mushroom,plasma,water}.tsx`, `modules/city/hooks.ts` (`useListCities`, `useGetCity`) |
| Server exchange | `apps/server/src/app/query/exchange/{book,trades,mine,estimate,shared}.ts`, `app/command/exchange/place.ts` (matching), `core/exchange/{service,entity,type}.ts`, `core/exchange/constant/{lot,limits}.ts`, `adapter/database/repository/exchange.ts`, `web/handler/exchange/{order,book}.ts`, `web/router.ts`, `core/faction/constant/logistics-modifier.ts`, `core/troop/constant/transport-weight.ts` |
| API client | `packages/api-client/src/endpoints/exchange/{index,order,book,shared}.ts`, `endpoints/city/list.ts`, `index.ts` (`exchange_lot_size`, `resource_transport_weight`) |
