import { DefenseCode } from '#core/defense/constant/code'

export const defense_order: Record<DefenseCode, number> = {
  [DefenseCode.RAMPART]: 1,
  [DefenseCode.TURRET]: 2,
  [DefenseCode.MINEFIELD]: 3,
  [DefenseCode.SHIELD_GENERATOR]: 4,
  [DefenseCode.PLASMA_BATTERY]: 5,
  [DefenseCode.MYCELIUM_WALL]: 6,
  [DefenseCode.SPORE_CLOUD]: 7,
}
