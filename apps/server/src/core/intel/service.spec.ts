import assert from 'assert'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { FactionCode } from '#core/faction/constant/code'
import { IntelError } from '#core/intel/error'
import { IntelService } from '#core/intel/service'
import { IncomingAttack } from '#core/intel/type'
import { TroopCode } from '#core/troop/constant/code'

describe('IntelService', () => {
  describe('creation rules', () => {
    it('requires espionage level 1', () => {
      assert.throws(() => IntelService.assertEspionageLevel({ espionage_level: 0 }), new RegExp(IntelError.ESPIONAGE_REQUIRED))
      assert.doesNotThrow(() => IntelService.assertEspionageLevel({ espionage_level: 1 }))
    })

    it('accepts scout-role troops of any faction only', () => {
      assert.doesNotThrow(() => IntelService.assertScoutsOnly({
        move_troops: [
          {
            code: TroopCode.EXPLORER,
            count: 2 
          },
          {
            code: TroopCode.ASH_EMISSARY,
            count: 1 
          },
          {
            code: TroopCode.LEGIONNAIRE,
            count: 0 
          },
        ]
      }))
      assert.throws(() => IntelService.assertScoutsOnly({
        move_troops: [
          {
            code: TroopCode.EXPLORER,
            count: 2 
          },
          {
            code: TroopCode.LEGIONNAIRE,
            count: 1 
          },
        ]
      }), new RegExp(IntelError.SCOUT_ONLY))
      assert.throws(() => IntelService.assertScoutsOnly({ move_troops: [] }), new RegExp(IntelError.SCOUT_ONLY))
      assert.throws(() => IntelService.assertScoutsOnly({
        move_troops: [
          {
            code: TroopCode.EXPLORER,
            count: 0 
          } 
        ] 
      }), new RegExp(IntelError.SCOUT_ONLY))
    })
  })

  describe('getSpySuccessProbability', () => {
    it('applies 0.50 + 0.15 × gap + 0.02 × (scouts − 1)', () => {
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: 0,
        scout_count: 1 
      }), 0.5)
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: 1,
        scout_count: 1 
      }), 0.65)
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: -1,
        scout_count: 1 
      }), 0.35)
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: 0,
        scout_count: 6 
      }), 0.6)
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: 2,
        scout_count: 3 
      }), 0.84)
    })

    it('clamps to [0.05, 0.95]', () => {
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: 3,
        scout_count: 1 
      }), 0.95)
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: 10,
        scout_count: 50 
      }), 0.95)
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: -3,
        scout_count: 1 
      }), 0.05)
      assert.strictEqual(IntelService.getSpySuccessProbability({
        gap: -10,
        scout_count: 1 
      }), 0.05)
    })

    it('succeeds when the roll falls under the probability', () => {
      assert.strictEqual(IntelService.isSpySuccess({
        roll: 0.49,
        p_success: 0.5 
      }), true)
      assert.strictEqual(IntelService.isSpySuccess({
        roll: 0.5,
        p_success: 0.5 
      }), false)
    })
  })

  describe('getSpyReportTier', () => {
    it('is max(1, gap)', () => {
      assert.strictEqual(IntelService.getSpyReportTier({ gap: -2 }), 1)
      assert.strictEqual(IntelService.getSpyReportTier({ gap: 0 }), 1)
      assert.strictEqual(IntelService.getSpyReportTier({ gap: 1 }), 1)
      assert.strictEqual(IntelService.getSpyReportTier({ gap: 3 }), 3)
      assert.strictEqual(IntelService.getSpyReportTier({ gap: 6 }), 6)
    })
  })

  describe('getSpyIntelScope', () => {
    const scope = (tier: number, target_kind: BattleTargetKind) => Object.entries(IntelService.getSpyIntelScope({
      tier,
      target_kind 
    }))
      .filter(([
        , revealed 
      ]) => revealed)
      .map(([ field ]) => field)
      .sort()

    it('reveals city troops, then defenses and strategy, then resources, then buildings and technologies', () => {
      assert.deepStrictEqual(scope(1, BattleTargetKind.CITY), [ 'troops' ])
      assert.deepStrictEqual(scope(2, BattleTargetKind.CITY), [
        'default_strategy',
        'defenses',
        'troops' 
      ])
      assert.deepStrictEqual(scope(3, BattleTargetKind.CITY), [
        'default_strategy',
        'defenses',
        'resources',
        'troops' 
      ])
      assert.deepStrictEqual(scope(4, BattleTargetKind.CITY), [
        'buildings',
        'default_strategy',
        'defenses',
        'resources',
        'technologies',
        'troops',
      ])
      assert.deepStrictEqual(scope(7, BattleTargetKind.CITY), scope(4, BattleTargetKind.CITY))
    })

    it('reveals outpost troops, then strategy, then resources, then outpost type', () => {
      assert.deepStrictEqual(scope(1, BattleTargetKind.OUTPOST), [ 'troops' ])
      assert.deepStrictEqual(scope(2, BattleTargetKind.OUTPOST), [
        'default_strategy',
        'troops' 
      ])
      assert.deepStrictEqual(scope(3, BattleTargetKind.OUTPOST), [
        'default_strategy',
        'resources',
        'troops' 
      ])
      assert.deepStrictEqual(scope(4, BattleTargetKind.OUTPOST), [
        'default_strategy',
        'outpost_type',
        'resources',
        'troops' 
      ])
    })

    it('reveals only troops for a field stack', () => {
      assert.deepStrictEqual(scope(1, BattleTargetKind.FIELD), [ 'troops' ])
      assert.deepStrictEqual(scope(5, BattleTargetKind.FIELD), [ 'troops' ])
    })
  })

  describe('toIncomingAttackView', () => {
    const attack: IncomingAttack = {
      id: 'movement-id',
      target: {
        kind: BattleTargetKind.CITY,
        id: 'city-id',
        name: 'Ville',
        coordinates: {
          x: 3,
          y: 4 
        },
      },
      arrive_at: 1_000,
      attacker: {
        name: 'Raider',
        faction_code: FactionCode.THE_ASH_LITURGY,
      },
      troops: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 24 
        },
        {
          code: TroopCode.CINDER_TITAN,
          count: 3 
        },
      ],
    }

    it('shows nothing at level 0', () => {
      assert.strictEqual(IntelService.toIncomingAttackView({
        attack,
        detection_level: 0 
      }), null)
    })

    it('shows target and arrival time at level 1', () => {
      assert.deepStrictEqual(IntelService.toIncomingAttackView({
        attack,
        detection_level: 1 
      }), {
        id: 'movement-id',
        target: attack.target,
        arrive_at: 1_000,
      })
    })

    it('adds the attacker at level 2', () => {
      const view = IntelService.toIncomingAttackView({
        attack,
        detection_level: 2 
      })
      assert.deepStrictEqual(view?.attacker, attack.attacker)
      assert.strictEqual(view?.unit_count, undefined)
      assert.strictEqual(view?.troops, undefined)
    })

    it('adds the unit count rounded to the nearest 10 at level 3', () => {
      const view = IntelService.toIncomingAttackView({
        attack,
        detection_level: 3 
      })
      assert.strictEqual(view?.unit_count, 30)
      assert.strictEqual(view?.troops, undefined)
      assert.strictEqual(IntelService.roundUnitCount(24), 20)
      assert.strictEqual(IntelService.roundUnitCount(25), 30)
      assert.strictEqual(IntelService.roundUnitCount(4), 0)
    })

    it('adds the exact composition from level 4 and never the strategy', () => {
      for (const detection_level of [
        4,
        9 
      ]) {
        const view = IntelService.toIncomingAttackView({
          attack,
          detection_level 
        })
        assert.deepStrictEqual(view?.troops, attack.troops)
        assert.strictEqual(view?.unit_count, 30)
        assert.deepStrictEqual(Object.keys(view ?? {}).sort(), [
          'arrive_at',
          'attacker',
          'id',
          'target',
          'troops',
          'unit_count' 
        ])
      }
    })
  })
})
