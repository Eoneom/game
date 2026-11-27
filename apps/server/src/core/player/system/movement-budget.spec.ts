import assert from 'assert'
import {
  getSystemAiProfile,
  SystemAiProfileId,
} from '#core/player/system/ai-profile'
import { defaultSystemEmpireSnapshotFields } from '#core/player/system/empire-snapshot'
import {
  isSystemMovementSaturated,
  nextSystemMovementSaturatedTicks,
  prioritizeScarceMovementIntents,
  shouldPrioritizeSystemCommandCenter,
  SYSTEM_COMMAND_CENTER_SATURATION_TICKS,
  systemMovementSlotsRemaining,
} from '#core/player/system/movement-budget'
import type { SystemTickCategory } from '#core/player/system/tick-category'

function intents(categories: SystemTickCategory[]) {
  return categories.map((category, priority) => ({
    category,
    priority,
  }))
}

describe('system movement budget', () => {
  const budget = ({
    movement_used,
    movement_limit,
    profile = SystemAiProfileId.SINGULARITY_DEFAULT,
    outpost_transport_pressure_count = 0,
  }: {
    movement_used: number
    movement_limit: number
    profile?: SystemAiProfileId
    outpost_transport_pressure_count?: number
  }) => ({
    movement_used,
    movement_limit,
    ai_profile: getSystemAiProfile(profile),
    outpost_transport_pressure_count,
  })

  it('defaults the snapshot to the base limit with nothing used', () => {
    const fields = defaultSystemEmpireSnapshotFields()
    assert.strictEqual(fields.movement_used, 0)
    assert.strictEqual(fields.movement_limit, 5)
  })

  it('counts remaining slots and saturation', () => {
    assert.strictEqual(systemMovementSlotsRemaining({
      movement_used: 3,
      movement_limit: 5
    }), 2)
    assert.strictEqual(systemMovementSlotsRemaining({
      movement_used: 7,
      movement_limit: 5
    }), 0)
    assert.strictEqual(isSystemMovementSaturated({
      movement_used: 3,
      movement_limit: 5
    }), false)
    assert.strictEqual(isSystemMovementSaturated({
      movement_used: 4,
      movement_limit: 5
    }), true)
  })

  it('raises the command center only after several saturated ticks', () => {
    let ticks = 0
    for (let index = 0; index < SYSTEM_COMMAND_CENTER_SATURATION_TICKS - 1; index += 1) {
      ticks = nextSystemMovementSaturatedTicks({
        previous_ticks: ticks,
        saturated: true
      })
    }
    const memory = (movement_saturated_ticks: number) => ({
      memory: {
        failed_base_cells: [],
        failed_attack_targets: [],
        movement_saturated_ticks,
      },
    })
    assert.strictEqual(shouldPrioritizeSystemCommandCenter(memory(ticks)), false)
    ticks = nextSystemMovementSaturatedTicks({
      previous_ticks: ticks,
      saturated: true
    })
    assert.strictEqual(shouldPrioritizeSystemCommandCenter(memory(ticks)), true)
    assert.strictEqual(nextSystemMovementSaturatedTicks({
      previous_ticks: ticks,
      saturated: false
    }), 0)
  })

  it('keeps the plan when every movement intent has a slot', () => {
    const plan = intents([
      'explore',
      'upgrade',
      'base'
    ])
    assert.deepStrictEqual(
      prioritizeScarceMovementIntents(plan, budget({
        movement_used: 0,
        movement_limit: 5
      })),
      plan,
    )
  })

  it('spends scarce slots on attack and pressured transport, then expansion, then explore', () => {
    const plan = intents([
      'explore',
      'upgrade',
      'base',
      'transport',
      'research',
      'attack'
    ])
    const ordered = prioritizeScarceMovementIntents(plan, budget({
      movement_used: 4,
      movement_limit: 5,
      profile: SystemAiProfileId.ASH_LITURGY_AGGRESSIVE,
      outpost_transport_pressure_count: 1,
    }))

    assert.deepStrictEqual(ordered.map(intent => intent.category), [
      'transport',
      'upgrade',
      'attack',
      'base',
      'research',
      'explore',
    ])
    assert.deepStrictEqual(ordered.map(intent => intent.priority), [
      0,
      1,
      2,
      3,
      4,
      5
    ])
  })

  it('puts expansion before a default-profile attack when slots are scarce', () => {
    const plan = intents([
      'attack',
      'deploy-outpost',
      'explore'
    ])
    const ordered = prioritizeScarceMovementIntents(plan, budget({
      movement_used: 5,
      movement_limit: 5
    }))

    assert.deepStrictEqual(ordered.map(intent => intent.category), [
      'deploy-outpost',
      'attack',
      'explore'
    ])
  })
})
