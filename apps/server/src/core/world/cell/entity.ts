import { BaseEntity } from '#core/type/base/entity'
import { CellType } from '#core/world/value/cell-type'
import { Coordinates } from '#core/world/value/coordinates'
import { id } from '#shared/identification'
import { Resource } from '#shared/resource'

type CellEntityProps = BaseEntity & {
  coordinates: Coordinates
  type: CellType
  resource_coefficient: Resource
  solar_coefficient: number
  city_id?: string
}

export class CellEntity extends BaseEntity {
  readonly coordinates: Coordinates
  readonly type: CellType
  readonly resource_coefficient: Resource
  readonly solar_coefficient: number
  readonly city_id?: string

  private constructor({
    id,
    coordinates,
    type,
    resource_coefficient,
    solar_coefficient,
    city_id,
  }: CellEntityProps) {
    super({ id })

    this.coordinates = coordinates
    this.type = type
    this.resource_coefficient = resource_coefficient
    this.solar_coefficient = solar_coefficient
    this.city_id = city_id
  }

  static create(props: CellEntityProps): CellEntity {
    return new CellEntity(props)
  }

  static generate({
    coordinates,
    coefficient,
    solar_coefficient,
  }: {
    coordinates: Coordinates
    coefficient: Resource
    solar_coefficient: number
  }): CellEntity {
    const type = this.getType({ coefficient })
    return CellEntity.create({
      id: id(),
      coordinates: coordinates,
      type,
      resource_coefficient: coefficient,
      solar_coefficient,
    })
  }

  assign({ city_id }: {city_id: string }): CellEntity {
    return CellEntity.create({
      ...this,
      city_id
    })
  }

  isAssigned(): boolean {
    return Boolean(this.city_id)
  }

  private static getType({ coefficient }: { coefficient: Resource }): CellType {
    const threshold = 0.075

    if (coefficient.plastic > coefficient.mushroom && coefficient.plastic - coefficient.mushroom > threshold) {
      return CellType.RUINS
    } else if (coefficient.mushroom > coefficient.plastic && coefficient.mushroom - coefficient.plastic > threshold) {
      return CellType.FOREST
    }

    return CellType.LAKE
  }
}
