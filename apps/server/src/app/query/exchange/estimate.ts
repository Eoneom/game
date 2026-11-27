import { GenericQuery } from '#query/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { EXCHANGE_FALLBACK_TYPICAL_DISTANCE } from '#core/exchange/constant/limits'
import { ExchangeService } from '#core/exchange/service'
import { FactionService } from '#core/faction/service'
import { TroopService } from '#core/troop/service'
import { ExchangeImmediateFill } from '#core/exchange/type'
import { TroopCount } from '#core/troop/type'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'
import { isId } from '#shared/identification'
import { Resource } from '#shared/resource'

interface ExchangeEstimateQueryRequest {
  player_id: string
  city_id: string
  side: unknown
  resource: unknown
  lots: unknown
  price: unknown
}

interface ExchangeEstimateQueryResponse {
  /** Escrow debited from the city stock at placement. */
  reserved_resources: Resource
  enough_resources: boolean
  /** Carriers the order would reserve, or `null` when the city's available carriers cannot carry it. */
  reserved_carriers: TroopCount[] | null
  /** Duration of a full delivery to a typical faction city, or `null` without carriers. */
  typical_delivery_duration: number | null
  open_order_count: number
  /** The city's `trading_post` level. */
  open_order_limit: number
  /** Transport load of the reserved payload: Σ amount × `resource_transport_weight` (slice 046). */
  carrier_load: number
  /** Capacity of the city's available (unreserved) carriers, with the faction logistics bonus (slice 046). */
  available_carrier_capacity: number
  /**
   * Dry run of the matching against other players' crossing open orders (price-time, execution at the resting
   * price), slice 046. Approximate: the resting side's carriers are not checked, so the real fill can be smaller.
   */
  immediate_fill: ExchangeImmediateFill
}

/**
 * Order form preview (slice 035): what `POST /exchange/order` would reserve and how long a delivery to a typical
 * faction city takes (median distance to the other human players' cities of the faction). Slice 046 adds the
 * carrier load against the available capacity and an immediate-fill dry run; no lock is taken and nothing is written.
 */
export class ExchangeEstimateQuery extends GenericQuery<ExchangeEstimateQueryRequest, ExchangeEstimateQueryResponse> {
  constructor() {
    super({ name: 'exchange:order:estimate' })
  }

  protected async get(request: ExchangeEstimateQueryRequest): Promise<ExchangeEstimateQueryResponse> {
    const {
      player_id, city_id
    } = request
    if (!isId(city_id)) {
      throw new Error(CityError.NOT_FOUND)
    }
    const city = await this.repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }
    const input = ExchangeService.assertOrderInput(request)
    const reserved_resources = ExchangeService.escrow(input)

    const [
      player,
      cell,
      stock,
      troops,
      cell_reservations,
      open_order_count,
      open_order_limit
    ] = await Promise.all([
      this.repository.player.get(player_id),
      this.repository.cell.getById(city.cell_id),
      this.repository.resource_stock.getByCellId({ cell_id: city.cell_id }),
      this.repository.troop.listInCell({
        cell_id: city.cell_id,
        player_id
      }),
      this.repository.exchange.listReservedInCell({
        cell_id: city.cell_id,
        player_id
      }),
      this.repository.exchange.countOpenByCity(city.id),
      this.repository.building.getLevel({
        city_id: city.id,
        code: BuildingCode.TRADING_POST
      }),
    ])
    // Read-only selection of the crossing orders (no `FOR UPDATE`, no market lock): a preview, not a placement.
    const matchable = await this.repository.exchange.listMatchable({
      faction_code: player.faction_code,
      resource: input.resource,
      side: ExchangeService.oppositeSide(input.side),
      limit_price: input.price,
      exclude_player_id: player_id,
    })

    // Faction logistics bonus (slice 039): fewer carriers reserved, faster deliveries.
    const logistics = FactionService.getLogisticsModifier(player.faction_code)
    const available_troops = ExchangeService.availableTroops({
      troops,
      reservations: cell_reservations
    })
    const reserved_carriers = ExchangeService.allocateCarriers({
      stacks: available_troops,
      resources: reserved_resources,
      carrier_capacity_multiplier: logistics.transport_capacity,
    })

    let typical_delivery_duration: number | null = null
    if (reserved_carriers && reserved_carriers.length > 0) {
      const destinations = await this.repository.exchange.listFactionCityCoordinates({
        faction_code: player.faction_code,
        exclude_player_id: player_id
      })
      typical_delivery_duration = TroopService.getMovementDuration({
        distance: typicalDistance({
          origin: cell.coordinates,
          destinations
        }),
        troop_codes: reserved_carriers.map(carrier => carrier.code),
        non_combat_speed_multiplier: logistics.non_combat_speed,
      })
    }

    return {
      reserved_resources,
      enough_resources: stock.plastic >= reserved_resources.plastic
        && stock.mushroom >= reserved_resources.mushroom
        && stock.plasma >= reserved_resources.plasma
        && stock.water >= reserved_resources.water,
      reserved_carriers,
      typical_delivery_duration,
      open_order_count,
      open_order_limit,
      carrier_load: TroopService.getTransportLoad({ resources: reserved_resources }),
      available_carrier_capacity: TroopService.getTotalTransportCapacity({
        troops: ExchangeService.carrierStacks(available_troops),
        carrier_capacity_multiplier: logistics.transport_capacity,
      }),
      immediate_fill: ExchangeService.simulateImmediateFill({
        side: input.side,
        limit_price: input.price,
        lots: input.lots,
        resting: matchable,
      }),
    }
  }
}

/** Median distance to the destinations (lower median), or the fallback when there are none. */
function typicalDistance({
  origin,
  destinations
}: {
  origin: Coordinates
  destinations: Coordinates[]
}): number {
  if (destinations.length === 0) {
    return EXCHANGE_FALLBACK_TYPICAL_DISTANCE
  }
  const distances = destinations
    .map(destination => WorldService.getDistance({
      origin,
      destination
    }))
    .sort((a, b) => a - b)
  return distances[Math.floor((distances.length - 1) / 2)]
}
