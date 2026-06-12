import { WORLD_SIZE } from '#core/world/constant/size'
import { WorldService } from '#core/world/service'
import { CellType } from '#core/world/value/cell-type'
import { Coordinates } from '#core/world/value/coordinates'

function expectedDistance(origin: Coordinates, destination: Coordinates): number {
  return (Math.abs(origin.x - destination.x) + Math.abs(origin.y - destination.y)) * 10000
}

describe('WorldService', () => {
  describe('getDistance', () => {
    it('returns 0 when origin and destination are equal', () => {
      const c = {
        x: 1,
        y: 1
      }
      expect(WorldService.getDistance({
        origin: c,
        destination: c
      })).toBe(0)
    })

    it('returns Manhattan distance in game units for known coordinates', () => {
      const origin = {
        x: 1,
        y: 1
      }
      const destination = {
        x: 2,
        y: 1
      }
      expect(WorldService.getDistance({
        origin,
        destination
      })).toBe(expectedDistance(origin, destination))
    })

    it('returns expected distance across the world', () => {
      const origin = {
        x: 1,
        y: 1
      }
      const destination = {
        x: 11,
        y: 1
      }
      expect(WorldService.getDistance({
        origin,
        destination
      })).toBe(expectedDistance(origin, destination))
    })

    it('is symmetric', () => {
      const a = {
        x: 3,
        y: 5
      }
      const b = {
        x: 47,
        y: 22
      }
      expect(WorldService.getDistance({
        origin: a,
        destination: b
      })).toBe(WorldService.getDistance({
        origin: b,
        destination: a
      }))
    })
  })

  describe('getRandomCoordinates', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('maps minimum random values to minimum coordinates', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      expect(WorldService.getRandomCoordinates()).toEqual({
        x: 1,
        y: 1
      })
    })

    it('maps maximum random values to maximum coordinates', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)
      expect(WorldService.getRandomCoordinates()).toEqual({
        x: WORLD_SIZE,
        y: WORLD_SIZE
      })
    })
  })

  describe('generate', () => {
    const cellTypes = new Set(Object.values(CellType))
    const expectedLength = WORLD_SIZE * WORLD_SIZE

    it('returns a full world grid with valid cells', () => {
      const world = WorldService.generate()

      expect(world).toHaveLength(expectedLength)
      expect(world[0].coordinates).toEqual({
        x: 1,
        y: 1
      })

      for (const cell of world) {
        const {
          x, y
        } = cell.coordinates
        expect(x).toBeGreaterThanOrEqual(1)
        expect(x).toBeLessThanOrEqual(WORLD_SIZE)
        expect(y).toBeGreaterThanOrEqual(1)
        expect(y).toBeLessThanOrEqual(WORLD_SIZE)
        expect(cellTypes.has(cell.type)).toBe(true)
        const {
          plastic, mushroom
        } = cell.resource_coefficient
        expect(plastic).toBe(Math.round(plastic * 1000) / 1000)
        expect(mushroom).toBe(Math.round(mushroom * 1000) / 1000)
        expect(Number.isFinite(plastic)).toBe(true)
        expect(Number.isFinite(mushroom)).toBe(true)
        expect(cell.solar_coefficient).toBe(Math.round(cell.solar_coefficient * 1000) / 1000)
        expect(Number.isFinite(cell.solar_coefficient)).toBe(true)
      }
    }, 15000)
  })
})
