# Slice 046 — Bourse: quick trade first

**Status**: Implemented on `main` (slice 046): `GET /exchange/summary` (best bid / ask among other players' open orders and last trade of every pair), `own_lots` on book levels, `carrier_load` / `available_carrier_capacity` / `immediate_fill` (lock-free dry run) on the estimate, `trading_posts` on `GET /exchange/order/mine`; api-client types. Web: the « Bourse » page rebuilt as « Échange rapide » (two columns, URL `?resource=&side=`, « Prix du marché », « Max », live summary, validation in the server order), « Mes ordres » (progress, relative expiry, folded history) and a collapsible « Marché » remembered per browser (depth with own lots and click-to-prefill, last trades, price line with its time span, « Comment ça marche ? »). No migration. See [Implementation notes](#implementation-notes).

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

## Implementation notes

- **Summary** (`app/query/exchange/summary.ts`): `exchange.bestLevels` is one grouped query — levels grouped by (`resource`, `side`, `price`) over the faction's open orders of other players, then `DISTINCT ON (resource, side)` ordered by `case when side = 'buy' then -price else price end`, so each book side keeps its best level with the summed remaining lots (checked against Postgres). `exchange.lastTrade` reuses `listTrades` with `limit 1` (one read per pair, in parallel). Pairs are always the three `ExchangeResource` values in order; a level of an unknown resource is dropped. `own_lots` is `0` in the summary.
- **Book**: `getBook` takes `viewer_player_id` and adds `sum(case when player_id = viewer then lots - filled_lots else 0 end)` per level; totals are unchanged.
- **Estimate**: `carrier_load` = `TroopService.getTransportLoad(reserved_resources)`; `available_carrier_capacity` = capacity of `ExchangeService.carrierStacks(availableTroops)` with the faction logistics multiplier (carrier-role units only, reservations of every open order on the cell subtracted). `immediate_fill` reads the crossing orders with the new `exchange.listMatchable` (same query builder as `listMatchableForUpdate`, without `FOR UPDATE`; no market lock, nothing written) and runs the pure `ExchangeService.simulateImmediateFill` (price-time priority via `sortByPriority`, `fillTerms` at the resting price). Carriers of either side are not checked, as the spec says.
- **Mine**: `trading_posts` reads `building.getLevel(TRADING_POST)` per owned city (cities were already loaded) and counts open orders per city from the open orders already read, so no extra count query; captured cities are absent because only owned cities are listed. Sorted by name.
- **Test world**: `ExchangeWorld` aggregates `getBook`, `bestLevels` and `lastTrade` in memory like the SQL (it used to stub the book empty), and `addCity` takes a `name`. The SQL shapes are pinned by `adapter/database/repository/exchange.spec.ts` (dummy driver, like the 044 map reads).
- **Web layout**: `page.tsx` renders a `text-page` title and three `surface-panel` sections (no `LayoutPage`, no details panel). The quick-trade form is `grid-cols-1 xl:grid-cols-2`. Inline controls (side toggle, city select, number inputs) sit in fixed-width wrappers because `.field-input` is full width.
- **URL**: `routes/exchange.tsx` validates `resource` and `side` with `pickSearchValue` and navigates with `replace`; both values are written on every change (defaults: plastic, sell). The price is held by the page (not the card) so a book level can fill it; the quantity is local to the card.
- **Price field**: starts **empty** (the spec gives no default; 035 used 1, which could sell for 1 water by mistake), so the first visit shows the price rule message until « Prix du marché » or a typed price fills it. Resource and side changes keep both fields (« resets nothing else »).
- **Estimate hook**: `useExchangeEstimate` debounces the input 300 ms (same pattern as 045's `useMovementEstimate`), keeps the previous answer as placeholder (the summary is dimmed and `aria-busy` while it is stale) and returns `input` (the order answered) and `isCurrent`. Validation and « Placer l'ordre » only trust a current answer. The free carrier capacity is remembered per city from the last non-placeholder answer, so « Max » stays usable while the quantity or price field is being edited.
- **Validation** (`quick-trade/validation.ts`): the table order; the order limit uses the current estimate, else the city's `trading_posts` entry (available before any estimate); « Estimation indisponible » comes after the order limit since stock and carriers are only known from the estimate. The message line is `aria-live="polite"` (not an alert, it changes while typing). « Max » with a result of 0 sets 1 lot, so the stock / carrier message explains why nothing more fits.
- **Copy choices**: carriers read « 1 Transporteur léger » (`count name`, as in 035; no French plural table for unit names); the immediate fill reads « ≈ N lots exécutés tout de suite pour ≈ W eau pure » with « , le reste attend dans le carnet » only when part of the order rests, for both sides; relative expiry is « 6 j 4 h » / « 2 j » from a day, else the 043 compact duration (« 4 h 05 », « 12 min »), and « bientôt » past 7 days (the hourly job has not run yet), refreshed every minute; the history disclosure reads « Historique (50 derniers) ».
- **Market**: `market/index.tsx` reads `eoneom:exchange:market-open` once (`'true'` → open; any `localStorage` error → closed) and writes on toggle inside `try/catch`. Its book and trades queries only run while it is open. Levels are buttons named « Acheter à 14 eau pure / lot — 8 lots[, dont 4 à vous] »; a click navigates to the opposite side, fills the price, keeps the quantity and scrolls the quick-trade card into view. Bars are proportional to the largest level of both sides. Bids and asks stack below `2xl` (the book has half the card width at `xl`). The price line moved to its own block with « Min / Dernier / Max » and `formatTradeSpan`.
- **Own orders**: all pairs, newest first; rows of the selected pair get `bg-chrome-2` and `aria-current`; the progress bar is a `progressbar` with « 3 / 10 lots »; expiry has the absolute date as `title`. « Annuler » calls the mutation directly.
- **Realtime**: `exchange:book-updated` and `exchange:filled` also invalidate `exchangeKeys.summary`; placing or cancelling refreshes it through `exchangeKeys.all` (`useRefreshAfterOrder`).
- **Moved / removed**: `order-form.tsx` removed (`formatReservedResources` now in `translations.ts`, its test in `translations.test.ts`); `book.tsx`, `trades.tsx` and `trades.test.ts` moved under `market/`. `fieldClass` dropped from `styles.ts` (inputs use `.field-input`).
- **Tests**: server — `core/exchange/service.spec.ts` (dry run), `app/query/exchange/query.spec.ts` (book `own_lots`, summary, estimate fields and no lock / no writes, `trading_posts`), `adapter/database/repository/exchange.spec.ts` (SQL); web — `quick-trade/{validation,max-lots}.test.ts`, `page.test.tsx` (form, URL, city selector, empty state, summary, Max, pending and reset, market collapse / storage / click-to-prefill / own lots), `my-orders.test.tsx`, `translations.test.ts`, `market/trades.test.ts`.

## Follow-ups

- **Visual pass**: not checked in a browser at 1920 × 1080 (running the app needs a signed-in player); layout verified through classes, tests and the build only.
- **City dashboard card** ([`042`](../042-city-dashboard/spec.md)): could show the selected pair's best bid / ask from `GET /exchange/summary` and link to `/exchange?resource=`; it still reads only own orders.
- **Estimate freshness**: a book update does not invalidate the estimate query (5 s `staleTime`), so the immediate-fill preview can lag a WebSocket book update by a few seconds.
- **Price axis**: the price line still has no axis or time scale (out of scope).

## Evidence index

| Area | Paths |
| --- | --- |
| Server domain | `apps/server/src/core/exchange/service.ts` (`simulateImmediateFill`), `core/exchange/type.ts` (`own_lots`, `ExchangeBestLevel`, `ExchangeImmediateFill`, `ExchangeLastTrade`); test `core/exchange/service.spec.ts` |
| Server persistence | `apps/server/src/adapter/database/repository/exchange.ts` (`listMatchable`, `getBook` `own_lots`, `bestLevels`, `lastTrade`), `app/port/repository/exchange.ts`; new test `adapter/database/repository/exchange.spec.ts` |
| Server queries and HTTP | `apps/server/src/app/query/exchange/{summary,book,estimate,mine}.ts`, `web/handler/exchange/{book,order}.ts`, `web/router.ts` (`GET /exchange/summary`); test `app/query/exchange/query.spec.ts`, test world `app/test-support/exchange-world.ts` |
| API client | `packages/api-client/src/endpoints/exchange/{summary,book,order,index}.ts`, `endpoints/index.ts` |
| Web page | `apps/web/src/modules/exchange/page.tsx` (+ `page.test.tsx`), `routes/exchange.tsx` |
| Web quick trade | `apps/web/src/modules/exchange/quick-trade/{index,resource-selector,side-toggle,quantity-field,price-field,summary}.tsx`, `quick-trade/{validation,max-lots}.ts` (+ tests) |
| Web orders and market | `apps/web/src/modules/exchange/my-orders.tsx` (+ `my-orders.test.tsx`), `market/{index,book,trades,help}.tsx`, `market/trades.test.ts` |
| Web shared | `apps/web/src/modules/exchange/{hooks,ws-listener,styles,translations}.ts` (+ `translations.test.ts`); removed `order-form.tsx`, `book.tsx`, `trades.tsx` |
| Specs | `specs/035-faction-exchange/spec.md`, `specs/017-realtime-websocket/spec.md`, `specs/README.md` |
