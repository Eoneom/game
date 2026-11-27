import { DefenseCode } from '#core/defense/constant/code'

interface DefenseCharacteristic {
  /** Defense points used against the city's `city_wall` capacity, per unit. */
  points: number
  attack: number
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
}

/** Plasma each firing `plasma_battery` unit spends per round from the city stock. */
export const PLASMA_BATTERY_PLASMA_PER_ROUND = 5

/** Each surviving `shield_generator` lowers the attacker's attack pool by this share... */
export const SHIELD_REDUCTION_PER_UNIT = 0.02
/** ...up to this cap. */
export const SHIELD_REDUCTION_CAP = 0.3

/** Share of defense life counted in the defender life pool when the attacker uses `siege_assault`. */
export const SIEGE_DEFENSE_LIFE_MULTIPLIER = 0.75
