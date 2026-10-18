import { TroopCode } from '#core/troop/constant/code'

export type EarningTroopCode =
  | TroopCode.FARMER
  | TroopCode.RECYCLER
  | TroopCode.HARVESTER
  | TroopCode.RECLAIMER
  | TroopCode.SPORE_ACOLYTE
  | TroopCode.SCRAP_LECTOR

export const troop_earnings: Record<EarningTroopCode, number> = {
  [TroopCode.FARMER]: 0.1,
  [TroopCode.RECYCLER]: 0.12,
  [TroopCode.HARVESTER]: 0.1,
  [TroopCode.RECLAIMER]: 0.12,
  [TroopCode.SPORE_ACOLYTE]: 0.1,
  [TroopCode.SCRAP_LECTOR]: 0.12,
}
