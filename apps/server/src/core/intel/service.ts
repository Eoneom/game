import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import {
  attackContribution,
  lifeContribution,
} from '#core/combat/troop-combat'
import { defense_characteristics } from '#core/defense/constant/characteristic'
import {
  SPY_SUCCESS_BASE,
  SPY_SUCCESS_MAX,
  SPY_SUCCESS_MIN,
  SPY_SUCCESS_PER_EXTRA_SCOUT,
  SPY_SUCCESS_PER_GAP,
} from '#core/intel/constant/probability'
import { IntelError } from '#core/intel/error'
import {
  IncomingAttack,
  IncomingAttackView,
  ReportSpyMetadata,
  SpyIntelScope,
  SpyStrengthEstimate,
} from '#core/intel/type'
import {
  troop_role, TroopRole 
} from '#core/troop/constant/role'
import { TroopCount } from '#core/troop/type'

/** Detection level from which each incoming-attack field is revealed. */
export const DETECTION_LEVEL_ALERT = 1
const DETECTION_LEVEL_ATTACKER = 2
const DETECTION_LEVEL_UNIT_COUNT = 3
const DETECTION_LEVEL_COMPOSITION = 4

const UNIT_COUNT_ROUNDING = 10

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/** Removes float noise (`0.5 + 0.15 × 3` → 0.95, not 0.9500000000000001). */
const round = (value: number): number => Math.round(value * 1e6) / 1e6

export class IntelService {
  static assertEspionageLevel({ espionage_level }: { espionage_level: number }): void {
    if (espionage_level < 1) {
      throw new Error(IntelError.ESPIONAGE_REQUIRED)
    }
  }

  /** A spy movement carries `scout`-role troops only, at least one unit. */
  static assertScoutsOnly({ move_troops }: { move_troops: TroopCount[] }): void {
    const sent = move_troops.filter(troop => troop.count > 0)
    if (sent.length === 0 || sent.some(troop => troop_role[troop.code] !== TroopRole.SCOUT)) {
      throw new Error(IntelError.SCOUT_ONLY)
    }
  }

  static getGap({
    espionage_level,
    detection_level,
  }: {
    espionage_level: number
    detection_level: number
  }): number {
    return espionage_level - detection_level
  }

  static getSpySuccessProbability({
    gap,
    scout_count,
  }: {
    gap: number
    scout_count: number
  }): number {
    const extra_scouts = Math.max(0, scout_count - 1)
    return round(clamp(
      SPY_SUCCESS_BASE + SPY_SUCCESS_PER_GAP * gap + SPY_SUCCESS_PER_EXTRA_SCOUT * extra_scouts,
      SPY_SUCCESS_MIN,
      SPY_SUCCESS_MAX
    ))
  }

  /** `roll` is uniform in [0, 1); the mission succeeds when it falls under `p_success`. */
  static isSpySuccess({
    roll,
    p_success,
  }: {
    roll: number
    p_success: number
  }): boolean {
    return roll < p_success
  }

  /** Report detail tier on success; a lucky success with `gap ≤ 0` gives tier 1. */
  static getSpyReportTier({ gap }: { gap: number }): number {
    return Math.max(1, gap)
  }

  static getSpyIntelScope({
    tier,
    target_kind,
  }: {
    tier: number
    target_kind: BattleTargetKind
  }): SpyIntelScope {
    const is_city = target_kind === BattleTargetKind.CITY
    const is_outpost = target_kind === BattleTargetKind.OUTPOST
    const is_location = is_city || is_outpost

    return {
      troops: tier >= 1,
      defenses: is_city && tier >= 2,
      default_strategy: is_location && tier >= 2,
      resources: is_location && tier >= 3,
      buildings: is_city && tier >= 4,
      technologies: is_city && tier >= 4,
      outpost_type: is_outpost && tier >= 4,
    }
  }

  static roundUnitCount(count: number): number {
    return Math.round(count / UNIT_COUNT_ROUNDING) * UNIT_COUNT_ROUNDING
  }

  /**
   * Filters an incoming attack by the defender's live `detection` level; `null` at level 0.
   * The attacker's strategy is never part of the view.
   */
  static toIncomingAttackView({
    attack,
    detection_level,
  }: {
    attack: IncomingAttack
    detection_level: number
  }): IncomingAttackView | null {
    if (detection_level < DETECTION_LEVEL_ALERT) {
      return null
    }

    const view: IncomingAttackView = {
      id: attack.id,
      target: attack.target,
      arrive_at: attack.arrive_at,
    }

    // The attacker, its origin and departure time are revealed together (origin and departure from slice 044).
    if (detection_level >= DETECTION_LEVEL_ATTACKER) {
      view.attacker = attack.attacker
      view.origin = attack.origin
      view.departure_at = attack.departure_at
    }

    if (detection_level >= DETECTION_LEVEL_UNIT_COUNT) {
      const total = attack.troops.reduce((sum, troop) => sum + troop.count, 0)
      view.unit_count = this.roundUnitCount(total)
    }

    if (detection_level >= DETECTION_LEVEL_COMPOSITION) {
      view.troops = attack.troops.map(troop => ({
        code: troop.code,
        count: troop.count,
      }))
    }

    return view
  }

  /**
   * Attack and life pools of a spied location from the stored snapshot (slice 044), display only: no strategy or
   * technology modifier (unknown to the spy). Defense attack uses round 1 for `attack_by_round`. `defenses_known`
   * is false only on a city whose tier did not reveal its defenses (tier 1); outposts have none.
   */
  static estimateStrength(metadata: Pick<ReportSpyMetadata, 'tier' | 'target' | 'troops' | 'defenses'>): SpyStrengthEstimate {
    const troops = metadata.troops ?? []
    const defenses = metadata.defenses ?? []

    let attack = 0
    let life = 0
    for (const troop of troops) {
      attack += attackContribution({
        code: troop.code,
        count: troop.count
      })
      life += lifeContribution({
        code: troop.code,
        count: troop.count
      })
    }
    for (const defense of defenses) {
      const characteristic = defense_characteristics[defense.code]
      attack += defense.count * (characteristic.attack_by_round?.[0] ?? characteristic.attack)
      life += defense.count * characteristic.life
    }

    const is_city = metadata.target.kind === BattleTargetKind.CITY
    const defenses_known = !is_city || this.getSpyIntelScope({
      tier: metadata.tier,
      target_kind: BattleTargetKind.CITY
    }).defenses

    return {
      attack: Math.round(attack),
      life: Math.round(life),
      troop_count: troops.reduce((sum, troop) => sum + troop.count, 0),
      defenses_known,
    }
  }
}
