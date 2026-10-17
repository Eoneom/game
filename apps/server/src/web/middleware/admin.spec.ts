import type {
  NextFunction, Request, Response 
} from 'express'
import { adminMiddleware } from './admin'
import { AdminError } from '#core/admin/error'
import * as observabilityAccess from '#app/query/admin/observability-access'

describe('adminMiddleware', () => {
  it('calls next when player is observability admin', async () => {
    vi.spyOn(observabilityAccess, 'isObservabilityAdmin').mockResolvedValue(true)
    const next = vi.fn()
    const res = { locals: { player_id: 'admin-id' } } as Response

    await adminMiddleware({} as Request, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('forwards AdminError.FORBIDDEN when not admin', async () => {
    vi.spyOn(observabilityAccess, 'isObservabilityAdmin').mockResolvedValue(false)
    const next = vi.fn()
    const res = { locals: { player_id: 'player-id' } } as Response

    await adminMiddleware({} as Request, res, next)

    expect(next).toHaveBeenCalledWith(new Error(AdminError.FORBIDDEN))
  })
})
