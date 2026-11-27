import { vi } from 'vitest'
import { Factory } from '#adapter/factory'
import type { AppEventBus } from '#app/event-bus'
import type { JobQueue } from '#app/port/job-queue'
import type {
  ExchangeRepository,
  ExchangeTradeRecord
} from '#app/port/repository/exchange'
import type { Repository } from '#app/port/repository/generic'
import type { TradeReportEntry } from '#app/port/repository/report'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { ExchangeOrderEntity } from '#core/exchange/entity'
import { ExchangeService } from '#core/exchange/service'
import { CarrierReservation } from '#core/exchange/type'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { Coordinates } from '#core/world/value/coordinates'
import { id } from '#shared/identification'
import { Resource } from '#shared/resource'

const sameCoordinates = (a: Coordinates, b: Coordinates) => a.x === b.x && a.y === b.y

/**
 * In-memory game state behind the repository ports used by the faction exchange (slice 035): players, cities,
 * stocks, troops, orders, reservations, trades, movements and trade reports. `listMatchableForUpdate` filters like
 * the SQL but returns rows in insertion order, so callers must sort by priority themselves.
 */
export class ExchangeWorld {
  readonly players = new Map<string, PlayerEntity>()
  readonly cities = new Map<string, CityEntity>()
  readonly cells = new Map<string, CellEntity>()
  readonly stocks = new Map<string, ResourceStockEntity>()
  readonly trading_post_levels = new Map<string, number>()
  troops: TroopEntity[] = []
  readonly orders = new Map<string, ExchangeOrderEntity>()
  readonly reservations = new Map<string, CarrierReservation[]>()
  readonly trades: ExchangeTradeRecord[] = []
  readonly movements = new Map<string, MovementEntity>()
  readonly trade_reports: TradeReportEntry[] = []
  readonly scheduled: { player_id: string, movement_id: string, execute_at: number }[] = []
  readonly emit = vi.fn()
  readonly scheduleExchangeOrderExpire = vi.fn().mockResolvedValue('job')

  addPlayer({
    faction_code = FactionCode.THE_CONFEDERATION,
    system_controlled = false,
    name = `player-${this.players.size + 1}`,
  }: {
    faction_code?: FactionCode
    system_controlled?: boolean
    name?: string
  } = {}): PlayerEntity {
    const player = PlayerEntity.create({
      id: id(),
      name,
      faction_code,
      system_controlled
    })
    this.players.set(player.id, player)
    return player
  }

  addCity({
    player,
    x = this.cities.size * 3,
    y = 0,
    trading_post = 1,
    stock = {},
    carriers = 0,
    carrier_code = TroopCode.LIGHT_TRANSPORTER,
  }: {
    player: PlayerEntity
    x?: number
    y?: number
    trading_post?: number
    stock?: Partial<Resource>
    carriers?: number
    carrier_code?: TroopCode
  }): CityEntity {
    const cell = CellEntity.create({
      id: id(),
      coordinates: {
        x,
        y
      },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
        water: 1
      },
      solar_coefficient: 1,
    })
    this.cells.set(cell.id, cell)
    const city = CityEntity.create({
      id: id(),
      player_id: player.id,
      name: `city-${this.cities.size + 1}`,
      cell_id: cell.id
    })
    this.cities.set(city.id, city)
    this.trading_post_levels.set(city.id, trading_post)
    this.stocks.set(cell.id, ResourceStockEntity.create({
      id: id(),
      cell_id: cell.id,
      plastic: stock.plastic ?? 0,
      mushroom: stock.mushroom ?? 0,
      plasma: stock.plasma ?? 0,
      water: stock.water ?? 0,
      last_plastic_gather: 0,
      last_mushroom_gather: 0,
      last_plasma_gather: 0,
      last_water_gather: 0,
    }))
    this.troops.push(TroopEntity.create({
      id: id(),
      code: carrier_code,
      player_id: player.id,
      cell_id: cell.id,
      count: carriers,
      movement_id: null
    }))
    return city
  }

  /** A resting order placed directly in the book (escrow and reservations applied). */
  addOrder({
    player,
    city,
    side,
    resource,
    lots,
    price,
    created_at,
    carriers = 1,
    carrier_code = TroopCode.LIGHT_TRANSPORTER,
  }: {
    player: PlayerEntity
    city: CityEntity
    side: ExchangeSide
    resource: ExchangeOrderEntity['resource']
    lots: number
    price: number
    created_at: number
    carriers?: number
    carrier_code?: TroopCode
  }): ExchangeOrderEntity {
    const order = ExchangeOrderEntity.place({
      player_id: player.id,
      faction_code: player.faction_code,
      city_id: city.id,
      side,
      resource,
      lots,
      price,
      created_at,
    })
    this.orders.set(order.id, order)
    this.reservations.set(order.id, carriers > 0
      ? [
        {
          troop_code: carrier_code,
          count: carriers
        }
      ]
      : [])
    return order
  }

  cellOf(city: CityEntity): CellEntity {
    return this.cells.get(city.cell_id) as CellEntity
  }

  stockOf(city: CityEntity): ResourceStockEntity {
    return this.stocks.get(city.cell_id) as ResourceStockEntity
  }

  stackCount(city: CityEntity, code: TroopCode = TroopCode.LIGHT_TRANSPORTER): number {
    return this.troops.find(troop => troop.cell_id === city.cell_id && troop.player_id === city.player_id && troop.code === code)?.count ?? 0
  }

  reservedCount(order_id: string): number {
    return (this.reservations.get(order_id) ?? []).reduce((total, reservation) => total + reservation.count, 0)
  }

  order(order_id: string): ExchangeOrderEntity {
    return this.orders.get(order_id) as ExchangeOrderEntity
  }

  movementTroops(movement_id: string): TroopEntity[] {
    return this.troops.filter(troop => troop.movement_id === movement_id)
  }

  install(): void {
    vi.spyOn(Factory, 'getRepository').mockReturnValue(this.repository())
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      scheduleTroopMovementFinish: vi.fn(async (job: { player_id: string, movement_id: string, execute_at: number }) => {
        this.scheduled.push(job)
        return 'job'
      }),
      scheduleExchangeOrderExpire: this.scheduleExchangeOrderExpire,
    } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit: this.emit } as unknown as AppEventBus)
  }

  private exchangeRepository(): ExchangeRepository {
    const openOrders = () => [ ...this.orders.values() ].filter(order => order.status === ExchangeOrderStatus.OPEN)
    const reservedInCell = ({
      cell_id,
      player_id
    }: { cell_id: string, player_id: string }): CarrierReservation[] => {
      const all = openOrders()
        .filter(order => order.player_id === player_id && this.cities.get(order.city_id)?.cell_id === cell_id)
        .flatMap(order => this.reservations.get(order.id) ?? [])
      return [ ...ExchangeService.reservedByCode(all).entries() ].map(([
        troop_code,
        count
      ]) => ({
        troop_code,
        count
      }))
    }
    return {
      createOrder: async order => {
        this.orders.set(order.id, order)
      },
      updateOrder: async order => {
        this.orders.set(order.id, order)
      },
      findOrder: async order_id => this.orders.get(order_id) ?? null,
      findOrderForUpdate: async order_id => this.orders.get(order_id) ?? null,
      countOpenByCity: async city_id => openOrders().filter(order => order.city_id === city_id).length,
      listOpenByCityForUpdate: async city_id => openOrders().filter(order => order.city_id === city_id),
      listOpenByPlayer: async player_id => openOrders().filter(order => order.player_id === player_id),
      listClosedByPlayer: async ({
        player_id, limit
      }) => [ ...this.orders.values() ]
        .filter(order => order.player_id === player_id && order.status !== ExchangeOrderStatus.OPEN)
        .slice(0, limit),
      listOpenCreatedBefore: async before => openOrders().filter(order => order.created_at < before),
      listMatchableForUpdate: async ({
        faction_code, resource, side, limit_price, exclude_player_id
      }) => openOrders().filter(order => order.faction_code === faction_code
        && order.resource === resource
        && order.side === side
        && order.player_id !== exclude_player_id
        && (side === ExchangeSide.SELL ? order.price <= limit_price : order.price >= limit_price)),
      getBook: async () => ({
        bids: [],
        asks: []
      }),
      listTrades: async () => [],
      createTrade: async trade => {
        this.trades.push(trade)
      },
      findTradeParties: async trade_id => {
        const trade = this.trades.find(candidate => candidate.id === trade_id)
        if (!trade) {
          return null
        }
        const buy = this.order(trade.buy_order_id)
        const sell = this.order(trade.sell_order_id)
        return {
          ...trade,
          buyer_player_id: buy.player_id,
          buyer_city_id: buy.city_id,
          seller_player_id: sell.player_id,
          seller_city_id: sell.city_id,
        }
      },
      listReservations: async order_id => [ ...(this.reservations.get(order_id) ?? []) ],
      saveReservations: async ({
        order_id, reservations
      }) => {
        this.reservations.set(order_id, reservations.filter(reservation => reservation.count > 0))
      },
      listReservedInCell: async query => reservedInCell(query),
      listFactionCityCoordinates: async ({
        faction_code, exclude_player_id
      }) => [ ...this.cities.values() ]
        .filter(city => {
          const owner = this.players.get(city.player_id)
          return owner?.faction_code === faction_code && !owner.system_controlled && owner.id !== exclude_player_id
        })
        .map(city => this.cellOf(city).coordinates),
    }
  }

  repository(): Repository {
    return {
      player: { get: async (player_id: string) => this.players.get(player_id) as PlayerEntity },
      city: {
        get: async (city_id: string) => {
          const city = this.cities.get(city_id)
          if (!city) {
            throw new Error(CityError.NOT_FOUND)
          }
          return city
        },
        list: async ({ player_id }: { player_id: string }) => [ ...this.cities.values() ].filter(city => city.player_id === player_id),
        searchByCell: async ({ cell_id }: { cell_id: string }) => [ ...this.cities.values() ].find(city => city.cell_id === cell_id) ?? null,
        updateOne: async (city: CityEntity) => {
          this.cities.set(city.id, city)
        },
      },
      cell: {
        getById: async (cell_id: string) => this.cells.get(cell_id) as CellEntity,
        getCell: async ({ coordinates }: { coordinates: Coordinates }) => [ ...this.cells.values() ].find(cell => sameCoordinates(cell.coordinates, coordinates)),
      },
      building: {
        getLevel: async ({
          city_id, code
        }: { city_id: string, code: BuildingCode }) => code === BuildingCode.TRADING_POST ? this.trading_post_levels.get(city_id) ?? 0 : 0,
      },
      resource_stock: {
        getByCellId: async ({ cell_id }: { cell_id: string }) => this.stocks.get(cell_id) as ResourceStockEntity,
        updateOne: async (stock: ResourceStockEntity) => {
          this.stocks.set(stock.cell_id, stock)
        },
      },
      troop: {
        listInCell: async ({
          cell_id, player_id
        }: { cell_id: string, player_id: string }) => this.troops.filter(troop => troop.cell_id === cell_id && troop.player_id === player_id),
        listByMovement: async ({ movement_id }: { movement_id: string }) => this.troops.filter(troop => troop.movement_id === movement_id),
        create: async (troop: TroopEntity) => {
          this.troops.push(troop)
          return troop.id
        },
        updateOne: async (troop: TroopEntity) => {
          this.troops = this.troops.map(candidate => candidate.id === troop.id ? troop : candidate)
        },
      },
      movement: {
        create: async (movement: MovementEntity) => {
          this.movements.set(movement.id, movement)
          return movement.id
        },
        getById: async (movement_id: string) => {
          const movement = this.movements.get(movement_id)
          if (!movement) {
            throw new Error(TroopError.MOVEMENT_NOT_FOUND)
          }
          return movement
        },
        delete: async (movement_id: string) => {
          this.movements.delete(movement_id)
        },
      },
      report: {
        createTradeReports: async (entries: TradeReportEntry[]) => {
          this.trade_reports.push(...entries)
        },
      },
      exchange: this.exchangeRepository(),
    } as unknown as Repository
  }
}
