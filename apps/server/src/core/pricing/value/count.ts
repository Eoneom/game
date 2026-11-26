import { TroopCode } from '#core/troop/constant/code'
import { Resource } from '#shared/resource'

export interface CountCosts {
  plastic: number
  mushroom: number
  duration: number
  /** Plasma per unit; absent means no plasma cost. */
  plasma?: number
}

export interface CountCostValue {
  code: TroopCode
  resource: Resource
  duration: number
}
