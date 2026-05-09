import { TroopCode } from '#core/troop/constant/code'

export const troop_earnings: Record<TroopCode.FARMER | TroopCode.RECYCLER, number> = {
  [TroopCode.FARMER]: 0.1,
  [TroopCode.RECYCLER]: 0.12
}
