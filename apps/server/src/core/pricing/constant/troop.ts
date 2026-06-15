import { CountCosts } from '#core/pricing/value/count'
import { TroopCode } from '#core/troop/constant/code'

export const CLONING_FACTORY_REDUCTION_PER_LEVEL = 10
export const REPLICATION_CATALYST_REDUCTION_PER_LEVEL = 10

export const troop_costs: Record<TroopCode, CountCosts> = {
  [TroopCode.EXPLORER]: {
    plastic: 10,
    mushroom: 15,
    duration: 60
  },
  [TroopCode.SETTLER]: {
    plastic: 20000,
    mushroom: 40000,
    duration: 3600
  },
  [TroopCode.LIGHT_TRANSPORTER]: {
    plastic: 3000,
    mushroom: 2000,
    duration: 240
  },
  [TroopCode.FARMER]: {
    plastic: 1000,
    mushroom: 2000,
    duration: 100
  },
  [TroopCode.RECYCLER]: {
    plastic: 2000,
    mushroom: 1000,
    duration: 100
  },
  [TroopCode.SEEKER]: {
    plastic: 10,
    mushroom: 15,
    duration: 60
  },
  [TroopCode.ASSEMBLER]: {
    plastic: 20000,
    mushroom: 40000,
    duration: 3600
  },
  [TroopCode.HAULER]: {
    plastic: 3000,
    mushroom: 2000,
    duration: 240
  },
  [TroopCode.HARVESTER]: {
    plastic: 1000,
    mushroom: 2000,
    duration: 100
  },
  [TroopCode.RECLAIMER]: {
    plastic: 2000,
    mushroom: 1000,
    duration: 100
  }
}
