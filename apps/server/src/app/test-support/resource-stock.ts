import { CityEntity } from '#core/city/entity'
import { CellEntity } from '#core/world/cell/entity'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { CellType } from '#core/world/value/cell-type'

export function testCityCell({
  city_id,
  cell_id = 'test-cell-id'
}: {
  city_id: string
  cell_id?: string
}): CellEntity {
  return CellEntity.create({
    id: cell_id,
    coordinates: {
      x: 1,
      y: 1,
      sector: 1
    },
    type: CellType.LAKE,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 1
    },
    solar_coefficient: 1,
    city_id
  })
}

export function testResourceStock({
  cell_id,
  plastic,
  mushroom,
  plasma = 0,
  last_plastic_gather = 0,
  last_mushroom_gather = 0,
  last_plasma_gather = 0,
  id = 'test-stock-id'
}: {
  cell_id: string
  plastic: number
  mushroom: number
  plasma?: number
  last_plastic_gather?: number
  last_mushroom_gather?: number
  last_plasma_gather?: number
  id?: string
}): ResourceStockEntity {
  return ResourceStockEntity.create({
    id,
    cell_id,
    plastic,
    mushroom,
    plasma,
    last_plastic_gather,
    last_mushroom_gather,
    last_plasma_gather
  })
}

export function testCityWithStock({
  player_id,
  plastic,
  mushroom,
  plasma = 0
}: {
  player_id: string
  plastic: number
  mushroom: number
  plasma?: number
}): {
  city: CityEntity
  city_cell: CellEntity
  stock: ResourceStockEntity
} {
  const city = CityEntity.initCity({
    name: 'c',
    player_id
  })
  const city_cell = testCityCell({ city_id: city.id })
  const stock = testResourceStock({
    cell_id: city_cell.id,
    plastic,
    mushroom,
    plasma
  })
  return {
    city,
    city_cell,
    stock
  }
}
