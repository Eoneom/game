import { CombatStrategy, RequestError } from '@eoneom/api-client'
import { vi, type MockInstance } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { outpostSetCombatStrategyHandler } from './set-combat-strategy'
import { outpostSetCombatStrategy } from '#app/command/outpost/set-combat-strategy'

vi.mock('#app/command/outpost/set-combat-strategy')

type MockRes = {
  status: MockInstance
  json: MockInstance
  locals: Record<string, unknown>
}

describe('outpostSetCombatStrategyHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  const run = () => outpostSetCombatStrategyHandler(
    req as unknown as Parameters<typeof outpostSetCombatStrategyHandler>[0],
    res as unknown as Response,
    next as unknown as NextFunction
  )

  beforeEach(() => {
    req = { params: { outpost_id: 'x1' }, body: { combat_strategy: CombatStrategy.HOLD_THE_LINE } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(outpostSetCombatStrategy as unknown as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when outpost_id is missing', async () => {
    req.params = {}
    await run()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ status: 'nok', error_code: RequestError.OUTPOST_ID_NOT_FOUND })
  })

  it('returns 400 when combat_strategy is not a known strategy', async () => {
    req.body = { combat_strategy: 'berserk' }
    await run()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ status: 'nok', error_code: RequestError.COMBAT_STRATEGY_NOT_FOUND })
    expect(outpostSetCombatStrategy).not.toHaveBeenCalled()
  })

  it('runs the command and returns ok', async () => {
    await run()
    expect(outpostSetCombatStrategy).toHaveBeenCalledWith({
      outpost_id: 'x1',
      player_id: 'p1',
      combat_strategy: CombatStrategy.HOLD_THE_LINE
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })

  it('forwards command errors to next', async () => {
    const error = new Error('boom')
    ;(outpostSetCombatStrategy as unknown as MockInstance).mockRejectedValue(error)
    await run()
    expect(next).toHaveBeenCalledWith(error)
  })
})
