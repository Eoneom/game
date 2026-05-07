import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { buildingUpgradeHandler } from './upgrade'
import { upgradeBuilding } from '#app/command/building/upgrade'

vi.mock('#app/command/building/upgrade')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('buildingUpgradeHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        city_id: 'c1',
        building_code: 'SAWMILL' 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(upgradeBuilding as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.body = { building_code: 'SAWMILL' }
    await buildingUpgradeHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'city_id:not-found' 
    })
  })

  it('returns 400 when building_code is missing', async () => {
    req.body = { city_id: 'c1' }
    await buildingUpgradeHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'building_code:not-found' 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('upgrade error')
    ;(upgradeBuilding as MockInstance).mockRejectedValue(error)
    await buildingUpgradeHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await buildingUpgradeHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(upgradeBuilding).toHaveBeenCalledWith({
      player_id: 'p1',
      city_id: 'c1',
      building_code: 'SAWMILL' 
    })
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
