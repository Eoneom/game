import type { Response } from 'express'
import { RequestError } from '@eoneom/api-client'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { adminCombatSimulatorPostHandler } from './post'
import * as simulate from '#command/combat/simulate'

describe('adminCombatSimulatorPostHandler city defenses (slice 029)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes defender defenses, Fortification, city plasma and siege_assault to the simulation', async () => {
    const simulate_spy = vi.spyOn(simulate, 'simulateCombat').mockReturnValue({
      winner: BattleWinner.DEFENDER,
      round_summaries: [
        {
          round: 1,
          attacker_attack_pool: 70,
          defender_attack_pool: 80,
          attacker_life_pool: 150,
          defender_life_pool: 600,
          attacker_losses: [
            {
              code: TroopCode.WAR_MACHINE,
              count: 1 
            } 
          ],
          defender_losses: [
            {
              kind: 'defense',
              code: DefenseCode.RAMPART,
              count: 1 
            } 
          ],
          defender_plasma_spent: 5,
          shield_reduction: 0.04,
        },
      ],
      final_attacker_stacks: [
        {
          code: TroopCode.WAR_MACHINE,
          count: 4 
        } 
      ],
      final_defender_stacks: [
        {
          kind: 'defense',
          code: DefenseCode.RAMPART,
          count: 9 
        } 
      ],
    })
    const json = vi.fn()

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [
            {
              troop_code: TroopCode.WAR_MACHINE,
              count: 5 
            } 
          ],
          defender_stacks: [],
          defender_defense_stacks: [
            {
              defense_code: DefenseCode.RAMPART,
              count: 10 
            },
            {
              defense_code: DefenseCode.PLASMA_BATTERY,
              count: 1 
            },
          ],
          attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
          defender_strategy: CombatStrategy.BALANCED,
          defender_technology_levels: { fortification: 3 },
          defender_city_plasma: 40,
        },
      } as never,
      { json } as unknown as Response,
      vi.fn(),
    )

    const params = simulate_spy.mock.calls[0][0]
    expect(params.attacker_strategy).toBe(CombatStrategy.SIEGE_ASSAULT)
    expect(params.defender_stacks).toEqual([
      {
        kind: 'defense',
        code: DefenseCode.RAMPART,
        count: 10 
      },
      {
        kind: 'defense',
        code: DefenseCode.PLASMA_BATTERY,
        count: 1 
      },
    ])
    expect(params.defender_plasma).toBe(40)
    expect(params.defender_modifiers?.fortification).toBeCloseTo(1.09)

    const data = json.mock.calls[0][0].data
    expect(data.round_summaries[0].defender_losses).toEqual([
      {
        defense_code: DefenseCode.RAMPART,
        count: 1 
      } 
    ])
    expect(data.round_summaries[0].defender_plasma_spent).toBe(5)
    expect(data.round_summaries[0].shield_reduction).toBe(0.04)
    expect(data.final_defender_stacks).toEqual([
      {
        defense_code: DefenseCode.RAMPART,
        count: 9 
      } 
    ])
  })

  it('leaves city plasma unlimited when omitted', async () => {
    const simulate_spy = vi.spyOn(simulate, 'simulateCombat').mockReturnValue({
      winner: null,
      round_summaries: [],
      final_attacker_stacks: [],
      final_defender_stacks: [],
    })

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [
            {
              troop_code: TroopCode.WAR_MACHINE,
              count: 5 
            } 
          ],
          defender_stacks: [],
          defender_defense_stacks: [
            {
              defense_code: DefenseCode.PLASMA_BATTERY,
              count: 1 
            } 
          ],
          attacker_strategy: CombatStrategy.BALANCED,
          defender_strategy: CombatStrategy.BALANCED,
        },
      } as never,
      { json: vi.fn() } as unknown as Response,
      vi.fn(),
    )

    expect('defender_plasma' in simulate_spy.mock.calls[0][0]).toBe(false)
  })

  it('returns 400 for an unknown defense code', async () => {
    const status = vi.fn().mockReturnThis()
    const json = vi.fn()

    await adminCombatSimulatorPostHandler(
      {
        body: {
          attacker_stacks: [],
          defender_stacks: [],
          defender_defense_stacks: [
            {
              defense_code: 'moat',
              count: 1 
            } 
          ],
          attacker_strategy: CombatStrategy.BALANCED,
          defender_strategy: CombatStrategy.BALANCED,
        },
      } as never,
      {
        status,
        json 
      } as unknown as Response,
      vi.fn(),
    )

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.DEFENSE_CODE_NOT_FOUND,
    })
  })
})
