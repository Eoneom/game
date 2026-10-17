import type { Response } from 'express'
import { adminSystemPlayerObservabilityGetHandler } from './get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { PlayerEntity } from '#core/player/entity'
import { FactionCode } from '#core/faction/constant/code'
import { id } from '#shared/identification'
import { resetAdminPlayerNamesCacheForTests } from '#adapter/admin/player-names'

describe('adminSystemPlayerObservabilityGetHandler', () => {
  const human = PlayerEntity.create({
    id: id(),
    name: 'OpsLead',
    faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    system_controlled: false,
  })
  const system_player = PlayerEntity.create({
    id: id(),
    name: 'Alpha',
    faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    system_controlled: true,
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetAdminPlayerNamesCacheForTests()
    delete process.env.ADMIN_PLAYER_NAMES
  })

  it('returns is_admin false without system_players for non-allowlisted commanders', async () => {
    process.env.ADMIN_PLAYER_NAMES = 'OpsLead'
    vi.spyOn(Factory, 'getAdminPlayerNames').mockReturnValue([ 'OpsLead' ])
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn().mockResolvedValue(human),
        listSystemControlled: vi.fn().mockResolvedValue([ system_player ]),
      },
    } as unknown as Repository)

    const json = vi.fn()
    const res = {
      locals: { player_id: human.id },
      json,
    } as unknown as Response

    await adminSystemPlayerObservabilityGetHandler({} as never, res, vi.fn())

    expect(json).toHaveBeenCalledWith({
      status: 'ok',
      data: { is_admin: true, system_players: [
        {
          id: system_player.id,
          name: system_player.name,
        },
      ] },
    })
  })

  it('returns is_admin false for players outside the allowlist', async () => {
    process.env.ADMIN_PLAYER_NAMES = 'OpsLead'
    vi.spyOn(Factory, 'getAdminPlayerNames').mockReturnValue([ 'OpsLead' ])
    const outsider = PlayerEntity.create({
      id: id(),
      name: 'Guest',
      faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      system_controlled: false,
    })
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn().mockResolvedValue(outsider),
        listSystemControlled: vi.fn(),
      },
    } as unknown as Repository)

    const json = vi.fn()
    const res = {
      locals: { player_id: outsider.id },
      json,
    } as unknown as Response

    await adminSystemPlayerObservabilityGetHandler({} as never, res, vi.fn())

    expect(json).toHaveBeenCalledWith({
      status: 'ok',
      data: { is_admin: false },
    })
  })
})
