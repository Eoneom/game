import { DefenseCode } from '#core/defense/constant/code'
import { CountCosts } from '#core/pricing/value/count'

/** Each `city_wall` level shortens defense build durations by 1/10 (same shape as the cloning factory). */
export const CITY_WALL_REDUCTION_PER_LEVEL = 10

/** Per-unit costs (slice 029). */
export const defense_costs: Record<DefenseCode, CountCosts> = {
  [DefenseCode.RAMPART]: {
    plastic: 800,
    mushroom: 400,
    duration: 60
  },
  [DefenseCode.TURRET]: {
    plastic: 1000,
    mushroom: 600,
    duration: 90
  },
  [DefenseCode.MINEFIELD]: {
    plastic: 300,
    mushroom: 100,
    duration: 30
  },
  [DefenseCode.SHIELD_GENERATOR]: {
    plastic: 2000,
    mushroom: 1500,
    plasma: 200,
    duration: 240
  },
  [DefenseCode.PLASMA_BATTERY]: {
    plastic: 1500,
    mushroom: 1000,
    plasma: 300,
    duration: 180
  },
  [DefenseCode.MYCELIUM_WALL]: {
    plastic: 400,
    mushroom: 700,
    duration: 60
  },
  [DefenseCode.SPORE_CLOUD]: {
    plastic: 500,
    mushroom: 700,
    duration: 60
  },
}
