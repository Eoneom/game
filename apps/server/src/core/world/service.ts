import { WORLD_SIZE } from '#core/world/constant/size'
import { CellEntity } from '#core/world/cell/entity'
import { PerlinService } from '#core/world/perlin'
import { Coordinates } from '#core/world/value/coordinates'
import { normalizeCoordinate } from '#core/world/helper'

export class WorldService {
  static generate () {
    const mushroom_perlin_service = new PerlinService()
    const plastic_perlin_service = new PerlinService()
    const solar_perlin_service = new PerlinService()
    const world: CellEntity[] = []

    for (let x = 1; x <= WORLD_SIZE; x++) {
      for (let y = 1; y <= WORLD_SIZE; y++) {
        const coordinates = {
          x,
          y 
        }

        const mushroom_coefficient = this.getCoefficient({
          perlin: mushroom_perlin_service,
          x,
          y
        })

        const plastic_coefficient = this.getCoefficient({
          perlin: plastic_perlin_service,
          x,
          y
        })

        const solar_coefficient = this.getSolarCoefficient({
          perlin: solar_perlin_service,
          coordinates
        })

        world.push(CellEntity.generate({
          coordinates,
          coefficient: {
            plastic: plastic_coefficient,
            mushroom: mushroom_coefficient,
            plasma: 1
          },
          solar_coefficient
        }))
      }
    }

    return world
  }

  static getSolarCoefficient({
    perlin,
    coordinates
  }: {
    perlin: PerlinService
    coordinates: Coordinates
  }): number {
    return this.getCoefficient({
      perlin,
      x: coordinates.x,
      y: coordinates.y
    })
  }

  static getRandomCoordinates(): Coordinates {
    return {
      x: normalizeCoordinate(Math.random()),
      y: normalizeCoordinate(Math.random())
    }
  }

  static getDistance({
    origin,
    destination
  }: {
    origin: Coordinates
    destination: Coordinates
  }): number {
    const distance = Math.abs(origin.x - destination.x) + Math.abs(origin.y - destination.y)
    return distance * 10000
  }

  private static getCoefficient({
    perlin,
    x,
    y
  }: {
    perlin: PerlinService
    x: number
    y: number
  }) {
    const intensity = perlin.get(this.getPerlinCoordinate(x), this.getPerlinCoordinate(y))
    const fixed_interval_intensity = this.fixInterval(intensity)
    return this.roundCoefficient(fixed_interval_intensity)
  }

  private static roundCoefficient(coefficient: number): number {
    return Math.round(coefficient * 1000) / 1000
  }

  private static getPerlinCoordinate(coordinate: number): number {
    const ratio = 4 / 64
    return coordinate * ratio
  }

  private static fixInterval(intensity: number): number {
    return (((intensity + 1) * 1.5) + 1) / 2
  }
}
