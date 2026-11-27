import { TroopCode } from '#core/troop/constant/code'

export type EarningTroopCode =
  | TroopCode.FARMER
  | TroopCode.RECYCLER
  | TroopCode.HARVESTER
  | TroopCode.RECLAIMER
  | TroopCode.SPORE_ACOLYTE
  | TroopCode.SCRAP_LECTOR
  | TroopCode.SYMBIONT_GROWER
  | TroopCode.DECOMPOSER

export const troop_earnings: Record<EarningTroopCode, number> = {
  [TroopCode.FARMER]: 0.2,
  [TroopCode.RECYCLER]: 0.24,
  [TroopCode.HARVESTER]: 0.2,
  [TroopCode.RECLAIMER]: 0.24,
  [TroopCode.SPORE_ACOLYTE]: 0.2,
  [TroopCode.SCRAP_LECTOR]: 0.24,
  [TroopCode.SYMBIONT_GROWER]: 0.2,
  [TroopCode.DECOMPOSER]: 0.24,
}
