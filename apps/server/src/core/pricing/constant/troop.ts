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
  },
  [TroopCode.LEGIONNAIRE]: {
    plastic: 2500,
    mushroom: 2500,
    duration: 200
  },
  [TroopCode.INTERCEPTOR]: {
    plastic: 3500,
    mushroom: 2000,
    duration: 280
  },
  [TroopCode.ASSAULT_BEHEMOTH]: {
    plastic: 2800,
    mushroom: 2200,
    duration: 220
  },
  [TroopCode.SHOCK_TROOPER]: {
    plastic: 3200,
    mushroom: 1800,
    duration: 265
  },
  [TroopCode.WAR_MACHINE]: {
    plastic: 2700,
    mushroom: 2300,
    duration: 210
  },
  [TroopCode.DISRUPTOR]: {
    plastic: 3300,
    mushroom: 1750,
    duration: 270
  },
  [TroopCode.PRIME_UNIT]: {
    plastic: 2400,
    mushroom: 2600,
    duration: 195
  },
  [TroopCode.STRIKER_DRONE]: {
    plastic: 3600,
    mushroom: 1900,
    duration: 275
  },
}
