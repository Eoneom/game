import { DefenseCode } from '#core/defense/constant/code'

interface DefenseCharacteristic {
  /** Defense points used against the city's `city_wall` capacity, per unit. */
  points: number
  /** Flat attack per unit; with `attack_by_round`, the headline (round 1) value. */
  attack: number
  /**
   * Attack per unit for rounds 1 to 5 (slice 037); when set it replaces `attack` in combat. Rounds past the
   * table use its last value.
   */
  attack_by_round?: readonly number[]
  /** Life per unit; minefields are not in the life pool and cannot be targeted. */
  life: number
  /** Armed defenses keep the defender in the fight without combat troops. */
  armed: boolean
}

/** Initial values (slice 029), to be tuned with the admin combat simulator. */
export const defense_characteristics: Record<DefenseCode, DefenseCharacteristic> = {
  [DefenseCode.RAMPART]: {
    points: 1,
    attack: 0,
    life: 60,
    armed: false,
  },
  [DefenseCode.TURRET]: {
    points: 2,
    attack: 25,
    life: 20,
    armed: true,
  },
  [DefenseCode.MINEFIELD]: {
    points: 1,
    attack: 40,
    // Fires in round 1 only (then the stack is consumed).
    attack_by_round: [
      40,
      0,
      0,
      0,
      0
    ],
    life: 0,
    armed: false,
  },
  [DefenseCode.PLASMA_BATTERY]: {
    points: 5,
    attack: 80,
    life: 30,
    armed: true,
  },
  [DefenseCode.SHIELD_GENERATOR]: {
    points: 4,
    attack: 0,
    life: 40,
    armed: false,
  },
  // La Symbiose (slice 036).
  [DefenseCode.MYCELIUM_WALL]: {
    points: 1,
    attack: 0,
    life: 50,
    armed: false,
  },
  [DefenseCode.SPORE_CLOUD]: {
    points: 2,
    attack: 12,
    life: 10,
    armed: true,
  },
  // L'Ordre du Bastion (slice 037).
  [DefenseCode.FIELD_ARTILLERY]: {
    points: 4,
    attack: 60,
    // Breaks assaults: most of its damage lands in rounds 1-2.
    attack_by_round: [
      60,
      50,
      25,
      20,
      20
    ],
    life: 35,
    armed: true,
  },
  [DefenseCode.BARBED_WIRE]: {
    points: 1,
    attack: 0,
    life: 15,
    armed: false,
  },
}

/** Plasma each firing `plasma_battery` unit spends per round from the city stock. */
export const PLASMA_BATTERY_PLASMA_PER_ROUND = 5

/** Each surviving `shield_generator` lowers the attacker's attack pool by this share... */
export const SHIELD_REDUCTION_PER_UNIT = 0.02
/** ...up to this cap. */
export const SHIELD_REDUCTION_CAP = 0.3

/** Each surviving `spore_cloud` lowers the attacker's attack pool by this share (slice 036)... */
export const SPORE_REDUCTION_PER_UNIT = 0.01
/** ...up to this cap. */
export const SPORE_REDUCTION_CAP = 0.15

/**
 * Each surviving `barbed_wire` lowers the attacker's attack pool by this share per round (slice 037): 1 % in
 * round 1, 0.5 % in round 2, nothing afterwards...
 */
export const BARBED_WIRE_REDUCTION_PER_UNIT_BY_ROUND: readonly number[] = [
  0.01,
  0.005
]
/** ...up to these caps (10 % in round 1, 5 % in round 2). */
export const BARBED_WIRE_REDUCTION_CAP_BY_ROUND: readonly number[] = [
  0.1,
  0.05
]

/** Shield generators, spore clouds and barbed wire add up, capped at this total share of the attacker's attack pool. */
export const ATTACK_REDUCTION_CAP = 0.4

/** Share of the `mycelium_wall` units destroyed in a battle that grow back when the defender wins or draws. */
export const MYCELIUM_WALL_REGROWTH_RATIO = 0.3

/** Share of defense life counted in the defender life pool when the attacker uses `siege_assault`. */
export const SIEGE_DEFENSE_LIFE_MULTIPLIER = 0.75
