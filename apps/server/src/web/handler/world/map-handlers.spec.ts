import type { MockInstance } from 'vitest'
import {
  NextFunction, Request, Response
} from 'express'
import { FactionCode } from '#core/faction/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import { WorldError } from '#core/world/error'
import { WorldExplorationQuery } from '#query/world/exploration'
import { WorldIntelQuery } from '#query/world/intel'
import { WorldMarkersQuery } from '#query/world/markers'
import { WorldTargetsQuery } from '#query/world/targets'
import { WorldTerrainQuery } from '#query/world/terrain'
import { worldExplorationHandler } from './exploration'
import { worldIntelHandler } from './intel'
import { worldMarkersHandler } from './markers'
import { worldTargetsHandler } from './targets'
import { worldTerrainHandler } from './terrain'

type MockRes = {
  status: MockInstance
  json: MockInstance
  setHeader: MockInstance
  locals: Record<string, unknown>
}

/** `GET /world/{terrain,exploration,markers,targets,intel}` handlers (slice 044). */
describe('world map handlers', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { query: {} }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const call = (handler: (req: Request, res: Response, next: NextFunction) => unknown) => handler(req as Request, res as unknown as Response, next as unknown as NextFunction)

  it('terrain: answers the terrain string with a one-day private cache header', async () => {
    vi.spyOn(WorldTerrainQuery.prototype, 'run').mockResolvedValue({
      size: 100,
      terrain: 'frl'
    })

    await call(worldTerrainHandler)

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=86400')
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        size: 100,
        terrain: 'frl'
      }
    })
  })

  it('exploration: runs for the authenticated player', async () => {
    vi.spyOn(WorldExplorationQuery.prototype, 'run').mockResolvedValue({
      cells: [
        [
          1,
          2,
          1.1,
          0.9,
          1
        ]
      ]
    })

    await call(worldExplorationHandler)

    expect(WorldExplorationQuery.prototype.run).toHaveBeenCalledWith({ player_id: 'p1' })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        cells: [
          [
            1,
            2,
            1.1,
            0.9,
            1
          ]
        ]
      }
    })
  })

  describe('markers', () => {
    it('answers 400 when a bound is missing or not a number', async () => {
      req.query = {
        min_x: '1',
        max_x: 'abc',
        min_y: '1',
        max_y: '5'
      }

      await call(worldMarkersHandler)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        status: 'nok',
        error_code: WorldError.INVALID_BOUNDS
      })
    })

    it('maps viewer, cities and outposts', async () => {
      req.query = {
        min_x: '1',
        max_x: '100',
        min_y: '1',
        max_y: '100'
      }
      const viewer = {
        player_id: 'p1',
        faction_code: FactionCode.THE_CONFEDERATION,
        alliance_id: null
      }
      const city = {
        id: 'c1',
        name: 'Rivet',
        player_id: 'p2',
        owner_name: 'Bob',
        faction_code: FactionCode.THE_ASH_LITURGY,
        alliance_tag: null,
        relation: 'system' as const,
        size: 2 as const,
        coordinates: {
          x: 3,
          y: 4
        }
      }
      const outpost = {
        id: 'o1',
        player_id: 'p1',
        owner_name: 'Me',
        faction_code: FactionCode.THE_CONFEDERATION,
        alliance_tag: 'ABC',
        relation: 'mine' as const,
        type: OutpostType.TEMPORARY,
        coordinates: {
          x: 5,
          y: 6
        }
      }
      vi.spyOn(WorldMarkersQuery.prototype, 'run').mockResolvedValue({
        viewer,
        cities: [ city ],
        outposts: [ outpost ]
      })

      await call(worldMarkersHandler)

      expect(WorldMarkersQuery.prototype.run).toHaveBeenCalledWith({
        player_id: 'p1',
        min_x: 1,
        max_x: 100,
        min_y: 1,
        max_y: 100
      })
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: {
          viewer,
          cities: [ city ],
          outposts: [ outpost ]
        }
      })
    })

    it('hands invalid bounds errors to the error middleware', async () => {
      req.query = {
        min_x: '1',
        max_x: '101',
        min_y: '1',
        max_y: '5'
      }
      const error = new Error(WorldError.INVALID_BOUNDS)
      vi.spyOn(WorldMarkersQuery.prototype, 'run').mockRejectedValue(error)

      await call(worldMarkersHandler)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  it('targets: runs for the authenticated player', async () => {
    vi.spyOn(WorldTargetsQuery.prototype, 'run').mockResolvedValue({
      radius: 15,
      targets: []
    })

    await call(worldTargetsHandler)

    expect(WorldTargetsQuery.prototype.run).toHaveBeenCalledWith({ player_id: 'p1' })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        radius: 15,
        targets: []
      }
    })
  })

  describe('intel', () => {
    it('answers 400 without coordinates', async () => {
      req.query = { x: '4' }

      await call(worldIntelHandler)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('runs for the authenticated player and cell', async () => {
      req.query = {
        x: '4',
        y: '5'
      }
      vi.spyOn(WorldIntelQuery.prototype, 'run').mockResolvedValue({ intel: null })

      await call(worldIntelHandler)

      expect(WorldIntelQuery.prototype.run).toHaveBeenCalledWith({
        player_id: 'p1',
        x: 4,
        y: 5
      })
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { intel: null }
      })
    })
  })
})
