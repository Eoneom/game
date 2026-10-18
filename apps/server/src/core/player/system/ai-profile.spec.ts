import assert from 'assert'
import { FactionCode } from '#core/faction/constant/code'
import {
  HARROW_SYSTEM_PLAYER_NAME,
  SYSTEM_PLAYER_NAME,
} from '#core/player/constant/system'
import { scoreSystemIntentUtility } from '#core/player/system/intent-utility'
import {
  defaultSystemEmpireSnapshotFields,
  type SystemEmpireSnapshot,
} from '#core/player/system/empire-snapshot'
import {
  getSystemAiProfile,
  resolveSystemAiProfile,
  SystemAiProfileId,
} from '#core/player/system/ai-profile'

function snapshot(overrides: Partial<SystemEmpireSnapshot> = {}): SystemEmpireSnapshot {
  return {
    player_id: 'p',
    temporary_outpost_count: 0,
    permanent_outpost_count: 0,
    expansion_categories: [],
    economy_first: false,
    production_ready_for_research: false,
    defer_explore: false,
    expansion_starved: false,
    combat_army_ready: true,
    needs_outpost_logistics: false,
    outpost_transport_pressure_count: 0,
    city_warehouse_under_pressure: false,
    can_found_city: true,
    settle_ready_temp_count: 0,
    outpost_limit_reached: false,
    ...defaultSystemEmpireSnapshotFields(),
    ...overrides,
  }
}

describe('resolveSystemAiProfile', () => {
  it('maps Harrow to the aggressive ash liturgy profile', () => {
    const profile = resolveSystemAiProfile({
      player_name: HARROW_SYSTEM_PLAYER_NAME,
      faction_code: FactionCode.THE_ASH_LITURGY,
    })
    assert.strictEqual(profile.id, SystemAiProfileId.ASH_LITURGY_AGGRESSIVE)
    assert.strictEqual(profile.ignore_empire_under_threat_for_attack, true)
    assert.strictEqual(profile.use_failed_attack_memory, false)
  })

  it('maps Alpha to the singularity default profile', () => {
    const profile = resolveSystemAiProfile({
      player_name: SYSTEM_PLAYER_NAME,
      faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    })
    assert.strictEqual(profile.id, SystemAiProfileId.SINGULARITY_DEFAULT)
  })
})

describe('aggressive attack utility under threat', () => {
  it('keeps attack intent viable while Alpha idles', () => {
    const aggressive = getSystemAiProfile(SystemAiProfileId.ASH_LITURGY_AGGRESSIVE)
    const alpha = getSystemAiProfile(SystemAiProfileId.SINGULARITY_DEFAULT)
    const under_threat = snapshot({
      empire_under_threat: true,
      ai_profile: aggressive,
    })
    const alpha_threat = snapshot({
      empire_under_threat: true,
      ai_profile: alpha,
    })
    const aggressive_score = scoreSystemIntentUtility({
      category: 'attack',
      reason: undefined,
    }, under_threat)
    const alpha_score = scoreSystemIntentUtility({
      category: 'attack',
      reason: undefined,
    }, alpha_threat)
    assert.ok(aggressive_score > alpha_score)
    assert.ok(aggressive_score > 0)
    assert.strictEqual(alpha_score, 0)
  })
})
