import { CombatStrategy, RequestError } from '@eoneom/api-client'
import { vi, type MockInstance } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { citySetCombatStrategyHandler } from './set-combat-strategy'
import { citySetCombatStrategy } from '#app/command/city/set-combat-strategy'

vi.mock('#app/command/city/set-combat-strategy')

type MockRes = {
  status: MockInstance
  json: MockInstance
  locals: Record<string, unknown>
}

describe('citySetCombatStrategyHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  const run = () => citySetCombatStrategyHandler(
    req as unknown as Parameters<typeof citySetCombatStrategyHandler>[0],
    res as unknown as Response,
    next as unknown as NextFunction
  )

  beforeEach(() => {
    req = { params: { city_id: 'x1' }, body: { combat_strategy: CombatStrategy.HOLD_THE_LINE } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(citySetCombatStrategy as unknown as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.params = {}
    await run()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ status: 'nok', error_code: RequestError.CITY_ID_NOT_FOUND })
  })

  it('returns 400 when combat_strategy is not a known strategy', async () => {
    req.body = { combat_strategy: 'berserk' }
    await run()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ status: 'nok', error_code: RequestError.COMBAT_STRATEGY_NOT_FOUND })
    expect(citySetCombatStrategy).not.toHaveBeenCalled()
  })

  it('runs the command and returns ok', async () => {
    await run()
    expect(citySetCombatStrategy).toHaveBeenCalledWith({
      city_id: 'x1',
      player_id: 'p1',
      combat_strategy: CombatStrategy.HOLD_THE_LINE
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })

  it('forwards command errors to next', async () => {
    const error = new Error('boom')
    ;(citySetCombatStrategy as unknown as MockInstance).mockRejectedValue(error)
    await run()
    expect(next).toHaveBeenCalledWith(error)
  })
})
