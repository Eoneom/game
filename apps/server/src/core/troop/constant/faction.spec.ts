import assert from 'assert'
import { CombatRole } from '#core/troop/constant/combat-role'
import { FactionCode } from '#core/faction/constant/code'
import { PricingService } from '#core/pricing/service'
import { RequirementService } from '#core/requirement/service'
import { troop_characteristics } from '#core/troop/constant/characteristic'
import { TroopCode } from '#core/troop/constant/code'
import { troop_faction } from '#core/troop/constant/faction'
import { TroopRole } from '#core/troop/constant/role'
import { TroopService } from '#core/troop/service'

describe('troop_faction ash liturgy roster', () => {
  const ash_codes = TroopService.codesForFaction(FactionCode.THE_ASH_LITURGY)

  it('maps nine exclusive troop codes', () => {
    assert.strictEqual(ash_codes.length, 9)
    for (const code of ash_codes) {
      assert.strictEqual(troop_faction[code], FactionCode.THE_ASH_LITURGY)
    }
  })

  it('includes four combat codes', () => {
    const combat = [
      TroopCode.PENITENT_HORDE,
      TroopCode.WRAITH_LANCER,
      TroopCode.HEMORRHAGE_CULTIST,
      TroopCode.CINDER_TITAN,
    ]
    for (const code of combat) {
      assert.ok(ash_codes.includes(code))
    }
  })
})

describe('troop_faction symbiosis roster (slice 036)', () => {
  const symbiosis_codes = TroopService.codesForFaction(FactionCode.THE_SYMBIOSIS)

  /** Symbiose code → the Confederation code of the same role (civilians) or combat class (combat units). */
  const mirrors: [TroopCode, TroopCode][] = [
    [
      TroopCode.DRIFTING_SPORE,
      TroopCode.EXPLORER
    ],
    [
      TroopCode.SEED_BEARER,
      TroopCode.SETTLER
    ],
    [
      TroopCode.MYCELIAL_PORTER,
      TroopCode.LIGHT_TRANSPORTER
    ],
    [
      TroopCode.SYMBIONT_GROWER,
      TroopCode.FARMER
    ],
    [
      TroopCode.DECOMPOSER,
      TroopCode.RECYCLER
    ],
    [
      TroopCode.ROOT_WARDEN,
      TroopCode.LEGIONNAIRE
    ],
    [
      TroopCode.SPORE_SWARM,
      TroopCode.INTERCEPTOR
    ],
    [
      TroopCode.FUNGAL_COLOSSUS,
      TroopCode.ASSAULT_BEHEMOTH
    ],
    [
      TroopCode.TOXIC_HOWLER,
      TroopCode.SHOCK_TROOPER
    ],
  ]

  it('maps nine exclusive troop codes, one per role and four combat units', () => {
    assert.strictEqual(symbiosis_codes.length, 9)
    for (const [
      code,
      mirror
    ] of mirrors) {
      assert.strictEqual(troop_faction[code], FactionCode.THE_SYMBIOSIS)
      assert.strictEqual(TroopService.roleFor(code), TroopService.roleFor(mirror))
    }
    assert.strictEqual(symbiosis_codes.filter(code => TroopService.roleFor(code) === TroopRole.COMBAT).length, 4)
  })

  it('copies civilian stats, costs and requirements from the Confederation counterpart', () => {
    for (const [
      code,
      mirror
    ] of mirrors.slice(0, 5)) {
      assert.deepStrictEqual(troop_characteristics[code], troop_characteristics[mirror])
      assert.deepStrictEqual(PricingService.getTroopCost({
        code,
        count: 1,
        cloning_factory_level: 0,
        replication_catalyst_level: 0
      }).resource, PricingService.getTroopCost({
        code: mirror,
        count: 1,
        cloning_factory_level: 0,
        replication_catalyst_level: 0
      }).resource)
      assert.deepStrictEqual(RequirementService.getTroopRequirement({ troop_code: code }), RequirementService.getTroopRequirement({ troop_code: mirror }))
    }
  })

  it('makes combat units weaker, cheaper and faster to train than their Confederation class counterpart', () => {
    for (const [
      code,
      mirror
    ] of mirrors.slice(5)) {
      const unit = troop_characteristics[code]
      const reference = troop_characteristics[mirror]
      assert.strictEqual(unit.combat_troop_class, reference.combat_troop_class)
      assert.strictEqual(unit.speed, reference.speed)
      assert.ok(unit.attack_capacity < reference.attack_capacity)
      assert.ok(unit.defense_capacity < reference.defense_capacity)
      assert.ok((unit.life_capacity ?? 0) < (reference.life_capacity ?? 0))
      const cost = PricingService.getTroopCost({
        code,
        count: 1,
        cloning_factory_level: 0,
        replication_catalyst_level: 0
      })
      const reference_cost = PricingService.getTroopCost({
        code: mirror,
        count: 1,
        cloning_factory_level: 0,
        replication_catalyst_level: 0
      })
      assert.ok(cost.resource.plastic < reference_cost.resource.plastic)
      assert.ok(cost.resource.mushroom < reference_cost.resource.mushroom)
      assert.ok(cost.duration < reference_cost.duration)
      assert.deepStrictEqual(RequirementService.getTroopRequirement({ troop_code: code }), RequirementService.getTroopRequirement({ troop_code: mirror }))
    }
  })
})

describe('troop_faction bastion order roster (slice 037)', () => {
  const bastion_codes = TroopService.codesForFaction(FactionCode.THE_BASTION_ORDER)
  const cost = (code: TroopCode) => PricingService.getTroopCost({
    code,
    count: 1,
    cloning_factory_level: 0,
    replication_catalyst_level: 0
  })

  /** Bastion code → the Confederation code of the same role (civilians) or combat class (combat units). */
  const mirrors: [TroopCode, TroopCode][] = [
    [
      TroopCode.SENTINEL,
      TroopCode.EXPLORER
    ],
    [
      TroopCode.FIELD_ENGINEER,
      TroopCode.SETTLER
    ],
    [
      TroopCode.SUPPLY_TRUCK,
      TroopCode.LIGHT_TRANSPORTER
    ],
    [
      TroopCode.QUARTERMASTER,
      TroopCode.FARMER
    ],
    [
      TroopCode.SCRAPPER,
      TroopCode.RECYCLER
    ],
    [
      TroopCode.GRENADIER,
      TroopCode.LEGIONNAIRE
    ],
    [
      TroopCode.DRAGOON,
      TroopCode.INTERCEPTOR
    ],
    [
      TroopCode.SIEGE_TANK,
      TroopCode.ASSAULT_BEHEMOTH
    ],
    [
      TroopCode.MOBILE_MORTAR,
      TroopCode.SHOCK_TROOPER
    ],
  ]

  it('maps nine exclusive troop codes, one per role and four combat units', () => {
    assert.strictEqual(bastion_codes.length, 9)
    for (const [
      code,
      mirror
    ] of mirrors) {
      assert.strictEqual(troop_faction[code], FactionCode.THE_BASTION_ORDER)
      assert.strictEqual(TroopService.roleFor(code), TroopService.roleFor(mirror))
    }
    assert.strictEqual(bastion_codes.filter(code => TroopService.roleFor(code) === TroopRole.COMBAT).length, 4)
  })

  it('copies civilian stats, costs and requirements from the Confederation counterpart', () => {
    for (const [
      code,
      mirror
    ] of mirrors.slice(0, 5)) {
      assert.deepStrictEqual(troop_characteristics[code], troop_characteristics[mirror])
      assert.deepStrictEqual(cost(code).resource, cost(mirror).resource)
      assert.strictEqual(cost(code).duration, cost(mirror).duration)
      assert.deepStrictEqual(RequirementService.getTroopRequirement({ troop_code: code }), RequirementService.getTroopRequirement({ troop_code: mirror }))
    }
  })

  it('makes combat units stronger, costlier, slower to train and slower than their Confederation class counterpart', () => {
    for (const [
      code,
      mirror
    ] of mirrors.slice(5)) {
      const unit = troop_characteristics[code]
      const reference = troop_characteristics[mirror]
      assert.strictEqual(unit.combat_troop_class, reference.combat_troop_class)
      assert.ok(unit.speed < reference.speed)
      assert.ok(unit.attack_capacity > reference.attack_capacity)
      assert.ok(unit.defense_capacity > reference.defense_capacity)
      assert.ok((unit.life_capacity ?? 0) > (reference.life_capacity ?? 0))
      assert.ok(cost(code).resource.plastic > cost(mirror).resource.plastic)
      assert.ok(cost(code).resource.mushroom > cost(mirror).resource.mushroom)
      assert.ok(cost(code).duration > cost(mirror).duration)
      assert.deepStrictEqual(RequirementService.getTroopRequirement({ troop_code: code }), RequirementService.getTroopRequirement({ troop_code: mirror }))
    }
  })

  it('uses the spec values for the heavy roster', () => {
    const expected: [TroopCode, number, number, number, number, number, number, number][] = [
      [
        TroopCode.GRENADIER,
        0.85,
        13,
        16,
        18,
        1560,
        1560,
        125
      ],
      [
        TroopCode.DRAGOON,
        1.15,
        22,
        5,
        6,
        2190,
        1250,
        175
      ],
      [
        TroopCode.SIEGE_TANK,
        0.72,
        14,
        18,
        19,
        1750,
        1375,
        138
      ],
      [
        TroopCode.MOBILE_MORTAR,
        1.02,
        17,
        7,
        7,
        2000,
        1125,
        166
      ],
    ]
    for (const [
      code,
      speed,
      attack,
      defense,
      life,
      plastic,
      mushroom,
      duration
    ] of expected) {
      const unit = troop_characteristics[code]
      assert.deepStrictEqual([
        unit.speed,
        unit.attack_capacity,
        unit.defense_capacity,
        unit.life_capacity
      ], [
        speed,
        attack,
        defense,
        life
      ])
      assert.strictEqual(cost(code).resource.plastic, plastic)
      assert.strictEqual(cost(code).resource.mushroom, mushroom)
      assert.strictEqual(cost(code).duration, duration)
    }
  })
})

describe('combat stat uniqueness (slice 024)', () => {
  it('no combat code mirrors another numerically', () => {
    const combat_codes = Object.values(TroopCode).filter(code => troop_characteristics[code].combat_role === CombatRole.COMBAT)
    const signatures = combat_codes.map(code => {
      const c = troop_characteristics[code]
      return `${c.speed}/${c.attack_capacity}/${c.defense_capacity}/${c.life_capacity}`
    })
    assert.strictEqual(new Set(signatures).size, combat_codes.length)
  })
})
