import type { Response } from 'express'
import { RequestError } from '@eoneom/api-client'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { TroopCode } from '#core/troop/constant/code'
import { adminCombatSimulatorPostHandler } from './post'
import * as simulate from '#command/combat/simulate'

describe('adminCombatSimulatorPostHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns simulation result on success', async () => {
    vi.spyOn(simulate, 'simulateCombat').mockReturnValue({
      winner: BattleWinner.ATTACKER,
      round_summaries: [
        {
          round: 1,
          attacker_attack_pool: 10,
          defender_attack_pool: 5,
          attacker_life_pool: 8,
          defender_life_pool: 4,
          attacker_losses: [],
          defender_losses: [{ code: TroopCode.DISRUPTOR, count: 1 }],
        },
      ],
      final_attacker_stacks: [{ code: TroopCode.INTERCEPTOR, count: 50 }],
      final_defender_stacks: [],
    })

    const json = vi.fn()
    const res = { json } as unknown as Response

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [{ troop_code: TroopCode.INTERCEPTOR, count: 50 }],
          defender_stacks: [{ troop_code: TroopCode.DISRUPTOR, count: 1 }],
          attacker_strategy: CombatStrategy.OPENING_STRIKE,
          defender_strategy: CombatStrategy.BALANCED,
        },
      } as never,
      res,
      vi.fn(),
    )

    expect(json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        winner: 'attacker',
        round_summaries: [
          {
            round: 1,
            attacker_attack_pool: 10,
            defender_attack_pool: 5,
            attacker_life_pool: 8,
            defender_life_pool: 4,
            attacker_losses: [],
            defender_losses: [{ troop_code: TroopCode.DISRUPTOR, count: 1 }],
          },
        ],
        final_attacker_stacks: [{ troop_code: TroopCode.INTERCEPTOR, count: 50 }],
        final_defender_stacks: [],
      },
    })
  })

  it('returns 400 for duplicate troop code on one side', async () => {
    const status = vi.fn().mockReturnThis()
    const json = vi.fn()
    const res = { status, json } as unknown as Response

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [
            { troop_code: TroopCode.INTERCEPTOR, count: 1 },
            { troop_code: TroopCode.INTERCEPTOR, count: 2 },
          ],
          defender_stacks: [{ troop_code: TroopCode.DISRUPTOR, count: 1 }],
          attacker_strategy: CombatStrategy.BALANCED,
          defender_strategy: CombatStrategy.BALANCED,
        },
      } as never,
      res,
      vi.fn(),
    )

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.TROOP_CODE_DUPLICATE,
    })
  })

  it('returns 400 for invalid troop code', async () => {
    const status = vi.fn().mockReturnThis()
    const json = vi.fn()
    const res = { status, json } as unknown as Response

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [{ troop_code: 'invalid', count: 1 }],
          defender_stacks: [],
          attacker_strategy: CombatStrategy.BALANCED,
          defender_strategy: CombatStrategy.BALANCED,
        },
      } as never,
      res,
      vi.fn(),
    )

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.TROOP_CODE_NOT_FOUND,
    })
  })

  it('converts per-side Arsenal levels into combat modifiers (default 0)', async () => {
    const simulate_spy = vi.spyOn(simulate, 'simulateCombat').mockReturnValue({
      winner: BattleWinner.DRAW,
      round_summaries: [],
      final_attacker_stacks: [],
      final_defender_stacks: [],
    })
    const res = { json: vi.fn() } as unknown as Response

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [
            {
              troop_code: TroopCode.INTERCEPTOR,
              count: 5
            }
          ],
          defender_stacks: [
            {
              troop_code: TroopCode.DISRUPTOR,
              count: 5
            }
          ],
          attacker_strategy: CombatStrategy.BALANCED,
          defender_strategy: CombatStrategy.BALANCED,
          attacker_technology_levels: {
            ballistic_alloys: 3,
            organic_plating: 2
          },
        },
      } as never,
      res,
      vi.fn(),
    )

    const params = simulate_spy.mock.calls[0][0]
    expect(params.attacker_modifiers?.attack).toBeCloseTo(1.09)
    expect(params.attacker_modifiers?.life).toBeCloseTo(1.06)
    expect(params.defender_modifiers).toEqual({
      attack: 1,
      life: 1
    })
  })

  it('returns 400 for an invalid technology level', async () => {
    const status = vi.fn().mockReturnThis()
    const json = vi.fn()
    const res = {
      status,
      json
    } as unknown as Response

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [
            {
              troop_code: TroopCode.INTERCEPTOR,
              count: 5
            }
          ],
          defender_stacks: [],
          attacker_strategy: CombatStrategy.BALANCED,
          defender_strategy: CombatStrategy.BALANCED,
          defender_technology_levels: { organic_plating: -1 },
        },
      } as never,
      res,
      vi.fn(),
    )

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.TECHNOLOGY_LEVEL_NOT_FOUND,
    })
  })
})
