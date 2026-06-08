import {
  REGION_SIZE,
  SECTOR_SIZE
} from '#core/world/constant/size'
import { CellEntity } from '#core/world/cell/entity'
import { PerlinService } from '#core/world/perlin'
import { Coordinates } from '#core/world/value/coordinates'
import {
  normalizeCoordinate,
  normalizeSector
} from '#core/world/helper'

export class WorldService {
  static generate () {
    const mushroom_perlin_service = new PerlinService()
    const plastic_perlin_service = new PerlinService()
    const solar_perlin_service = new PerlinService()
    const world: CellEntity[] = []

    for (let sector_y = 1; sector_y <= REGION_SIZE ; sector_y++) {
      for (let sector_x = 1; sector_x <= REGION_SIZE ; sector_x++) {
        const sector_cells = this.generateSector({
          mushroom_perlin_service,
          plastic_perlin_service,
          solar_perlin_service,
          sector_x,
          sector_y
        })

        world.push(...sector_cells)
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
    const { sector_x, sector_y } = this.getSectorCoordinates({ sector: coordinates.sector })

    return this.getCoefficient({
      perlin,
      x: coordinates.x,
      y: coordinates.y,
      sector_x,
      sector_y
    })
  }

  static getRandomCoordinates(): Coordinates {
    return {
      x: normalizeCoordinate(Math.random()),
      y: normalizeCoordinate(Math.random()),
      sector: normalizeSector(Math.random())
    }
  }

  static getDistance({
    origin,
    destination
  }: {
    origin: Coordinates
    destination: Coordinates
  }): number {
    const global_origin = this.getGlobalCoordinates(origin)
    const global_destination = this.getGlobalCoordinates(destination)

    const global_distance = Math.abs(global_origin.x - global_destination.x) + Math.abs(global_origin.y - global_destination.y)
    return global_distance * 10000
  }

  private static getGlobalCoordinates(local_coordinates: Coordinates): {
    x: number
    y: number
  } {
    return {
      x: (local_coordinates.sector%REGION_SIZE-1)*SECTOR_SIZE+local_coordinates.x,
      y: Math.floor(local_coordinates.sector/REGION_SIZE)*SECTOR_SIZE+local_coordinates.y
    }
  }

  private static getSectorCoordinates({ sector }: { sector: number }): {
    sector_x: number
    sector_y: number
  } {
    return {
      sector_x: (sector - 1) % SECTOR_SIZE + 1,
      sector_y: Math.floor((sector - 1) / SECTOR_SIZE) + 1
    }
  }

  private static generateSector({
    mushroom_perlin_service,
    plastic_perlin_service,
    solar_perlin_service,
    sector_x,
    sector_y
  }: {
    mushroom_perlin_service: PerlinService
    plastic_perlin_service: PerlinService
    solar_perlin_service: PerlinService
    sector_x: number
    sector_y: number
  }): CellEntity[] {
    const sector_id = sector_x + SECTOR_SIZE*(sector_y - 1)
    const sector: CellEntity[] = []

    for (let x = 1 ; x <= SECTOR_SIZE ; x++) {
      for (let y = 1 ; y <= SECTOR_SIZE ; y++) {
        const mushroom_coefficient = this.getCoefficient({
          perlin: mushroom_perlin_service,
          x,
          y,
          sector_x,
          sector_y
        })

        const plastic_coefficient = this.getCoefficient({
          perlin: plastic_perlin_service,
          x,
          y,
          sector_x,
          sector_y
        })

        const coordinates = {
          x,
          y,
          sector: sector_id
        }

        const solar_coefficient = this.getSolarCoefficient({
          perlin: solar_perlin_service,
          coordinates
        })

        const generated_cell = CellEntity.generate({
          coordinates,
          coefficient: {
            plastic: plastic_coefficient,
            mushroom: mushroom_coefficient,
            plasma: 1
          },
          solar_coefficient
        })

        sector.push(generated_cell)
      }
    }

    return sector
  }


  private static getCoefficient({
    perlin,
    x,
    y,
    sector_x,
    sector_y
  }: {
    perlin: PerlinService
    x: number
    y: number
    sector_x: number
    sector_y: number
  }) {
    const perlin_x = this.getPerlinCoordinate(x, sector_x)
    const perlin_y = this.getPerlinCoordinate(y, sector_y)

    const intensity = perlin.get(perlin_x, perlin_y)
    const fixed_interval_intensity = this.fixInterval(intensity)
    return this.roundCoefficient(fixed_interval_intensity)
  }

  private static roundCoefficient(coefficient: number): number {
    return Math.round(coefficient * 1000) / 1000
  }

  private static getPerlinCoordinate(coordinate: number, sector_coordinate: number): number {
    const ratio = 4/64
    return (coordinate + SECTOR_SIZE*(sector_coordinate - 1)) * ratio
  }

  private static fixInterval(intensity: number): number {
    return (((intensity + 1)*1.5)+1)/2
  }
}
