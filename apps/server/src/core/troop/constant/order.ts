import { TroopCode } from '#core/troop/constant/code'

export const troop_order: Record<TroopCode, number> = {
  [TroopCode.EXPLORER]: 1,
  [TroopCode.FARMER]: 2,
  [TroopCode.RECYCLER]: 3,
  [TroopCode.LIGHT_TRANSPORTER]: 4,
  [TroopCode.SETTLER]: 5,
  [TroopCode.SEEKER]: 1,
  [TroopCode.HARVESTER]: 2,
  [TroopCode.RECLAIMER]: 3,
  [TroopCode.HAULER]: 4,
  [TroopCode.ASSEMBLER]: 5
}
