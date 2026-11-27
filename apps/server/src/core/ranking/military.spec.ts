import { BattleStateJson } from '#core/combat/type/battle-stack'
import { DefenseCode } from '#core/defense/constant/code'
import {
  militaryCredits,
  splitDefenderCredit
} from '#core/ranking/military'
import { TroopCode } from '#core/troop/constant/code'

const LEGIONNAIRE_VALUE = 2500
const TURRET_VALUE = 1600
const PLASMA_BATTERY_VALUE = 4000

const state = (overrides: Partial<BattleStateJson>): BattleStateJson => ({
  attacker_stacks: [],
  defender_stacks: [],
  attacker_origin: {
    x: 0,
    y: 0
  },
  cumulative_attacker_losses: [],
  cumulative_defender_losses: [],
  ...overrides,
})

describe('militaryCredits', () => {
  it('credits the attacker with defender troop and defense losses', () => {
    const credits = militaryCredits({
      attacker_player_id: 'attacker',
      defender_player_id: 'host',
      state_json: state({
        cumulative_defender_losses: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 2
          },
          {
            kind: 'defense',
            code: DefenseCode.TURRET,
            count: 3
          },
        ],
      }),
      destroyed_defender_stacks: [],
    })

    expect(credits).toEqual([
      {
        player_id: 'attacker',
        value: 2 * LEGIONNAIRE_VALUE + 3 * TURRET_VALUE
      } 
    ])
  })

  it('adds the defender stacks destroyed with the capture on an attacker win', () => {
    const credits = militaryCredits({
      attacker_player_id: 'attacker',
      defender_player_id: 'host',
      state_json: state({}),
      destroyed_defender_stacks: [
        {
          kind: 'defense',
          code: DefenseCode.PLASMA_BATTERY,
          count: 1
        },
        {
          code: TroopCode.LEGIONNAIRE,
          count: 0
        },
      ],
    })

    expect(credits).toEqual([
      {
        player_id: 'attacker',
        value: PLASMA_BATTERY_VALUE
      } 
    ])
  })

  it('gives the host every attacker loss without reinforcements', () => {
    const credits = militaryCredits({
      attacker_player_id: 'attacker',
      defender_player_id: 'host',
      state_json: state({
        defender_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 5
          } 
        ],
        cumulative_attacker_losses: [
          {
            code: TroopCode.PENITENT_HORDE,
            count: 4
          } 
        ],
      }),
      destroyed_defender_stacks: [],
    })

    expect(credits).toEqual([
      {
        player_id: 'host',
        value: 4 * 2500
      } 
    ])
  })

  it('splits attacker losses between host and reinforcements by raw attack at battle start', () => {
    // Host: 4 survivors + 2 lost legionnaires (6 × 11) and a turret (25) = 91. Ally: 3 + 0 lost legionnaires = 33.
    const credits = militaryCredits({
      attacker_player_id: 'attacker',
      defender_player_id: 'host',
      state_json: state({
        defender_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 4
          },
          {
            code: TroopCode.LEGIONNAIRE,
            count: 3,
            player_id: 'ally'
          },
          {
            kind: 'defense',
            code: DefenseCode.TURRET,
            count: 1
          },
        ],
        cumulative_defender_losses: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 2
          } 
        ],
        cumulative_attacker_losses: [
          {
            code: TroopCode.PENITENT_HORDE,
            count: 10
          } 
        ],
        defender_owner_modifiers: {
          ally: {
            attack: 2,
            life: 2
          }
        },
      }),
      destroyed_defender_stacks: [],
    })

    const total = 10 * 2500
    const ally_share = Math.floor(total * 33 / 124)
    expect(credits).toEqual([
      {
        player_id: 'attacker',
        value: 2 * LEGIONNAIRE_VALUE
      },
      {
        player_id: 'host',
        value: total - ally_share
      },
      {
        player_id: 'ally',
        value: ally_share
      },
    ])
  })

  it('never produces a negative credit', () => {
    const credits = militaryCredits({
      attacker_player_id: 'attacker',
      defender_player_id: 'host',
      state_json: state({}),
      destroyed_defender_stacks: [],
    })
    expect(credits).toEqual([])
  })
})

describe('splitDefenderCredit', () => {
  it('floors reinforcement shares and gives the remainder to the host, losing nothing', () => {
    const credits = splitDefenderCredit({
      value: 100,
      host_player_id: 'host',
      attack_by_owner: new Map([
        [
          'host',
          1 
        ],
        [
          'a',
          1 
        ],
        [
          'b',
          1 
        ],
      ]),
    })

    expect(credits).toEqual([
      {
        player_id: 'host',
        value: 34
      },
      {
        player_id: 'a',
        value: 33
      },
      {
        player_id: 'b',
        value: 33
      },
    ])
  })

  it('gives everything to the host when nobody has attack', () => {
    expect(splitDefenderCredit({
      value: 50,
      host_player_id: 'host',
      attack_by_owner: new Map([
        [
          'a',
          0 
        ] 
      ]),
    })).toEqual([
      {
        player_id: 'host',
        value: 50
      } 
    ])
  })
})
