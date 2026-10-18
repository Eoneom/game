import { CountCosts } from '#core/pricing/value/count'
import { TroopCode } from '#core/troop/constant/code'

export const CLONING_FACTORY_REDUCTION_PER_LEVEL = 10
export const REPLICATION_CATALYST_REDUCTION_PER_LEVEL = 10

export const troop_costs: Record<TroopCode, CountCosts> = {
  [TroopCode.EXPLORER]: {
    plastic: 5,
    mushroom: 8,
    duration: 30
  },
  [TroopCode.SETTLER]: {
    plastic: 10000,
    mushroom: 20000,
    duration: 1800
  },
  [TroopCode.LIGHT_TRANSPORTER]: {
    plastic: 1500,
    mushroom: 1000,
    duration: 120
  },
  [TroopCode.FARMER]: {
    plastic: 500,
    mushroom: 1000,
    duration: 50
  },
  [TroopCode.RECYCLER]: {
    plastic: 1000,
    mushroom: 500,
    duration: 50
  },
  [TroopCode.SEEKER]: {
    plastic: 5,
    mushroom: 8,
    duration: 30
  },
  [TroopCode.ASSEMBLER]: {
    plastic: 10000,
    mushroom: 20000,
    duration: 1800
  },
  [TroopCode.HAULER]: {
    plastic: 1500,
    mushroom: 1000,
    duration: 120
  },
  [TroopCode.HARVESTER]: {
    plastic: 500,
    mushroom: 1000,
    duration: 50
  },
  [TroopCode.RECLAIMER]: {
    plastic: 1000,
    mushroom: 500,
    duration: 50
  },
  [TroopCode.LEGIONNAIRE]: {
    plastic: 1250,
    mushroom: 1250,
    duration: 100
  },
  [TroopCode.INTERCEPTOR]: {
    plastic: 1750,
    mushroom: 1000,
    duration: 140
  },
  [TroopCode.ASSAULT_BEHEMOTH]: {
    plastic: 1400,
    mushroom: 1100,
    duration: 110
  },
  [TroopCode.SHOCK_TROOPER]: {
    plastic: 1600,
    mushroom: 900,
    duration: 133
  },
  [TroopCode.WAR_MACHINE]: {
    plastic: 1350,
    mushroom: 1150,
    duration: 105
  },
  [TroopCode.DISRUPTOR]: {
    plastic: 1650,
    mushroom: 875,
    duration: 135
  },
  [TroopCode.PRIME_UNIT]: {
    plastic: 1200,
    mushroom: 1300,
    duration: 98
  },
  [TroopCode.STRIKER_DRONE]: {
    plastic: 1800,
    mushroom: 950,
    duration: 138
  },
  [TroopCode.ASH_EMISSARY]: {
    plastic: 5,
    mushroom: 8,
    duration: 30
  },
  [TroopCode.PYRE_PILGRIM]: {
    plastic: 10000,
    mushroom: 20000,
    duration: 1800
  },
  [TroopCode.BONE_CART]: {
    plastic: 1500,
    mushroom: 1000,
    duration: 120
  },
  [TroopCode.SPORE_ACOLYTE]: {
    plastic: 500,
    mushroom: 1000,
    duration: 50
  },
  [TroopCode.SCRAP_LECTOR]: {
    plastic: 1000,
    mushroom: 500,
    duration: 50
  },
  [TroopCode.PENITENT_HORDE]: {
    plastic: 1250,
    mushroom: 1250,
    duration: 100
  },
  [TroopCode.WRAITH_LANCER]: {
    plastic: 1750,
    mushroom: 1000,
    duration: 140
  },
  [TroopCode.HEMORRHAGE_CULTIST]: {
    plastic: 1600,
    mushroom: 900,
    duration: 133
  },
  [TroopCode.CINDER_TITAN]: {
    plastic: 1400,
    mushroom: 1100,
    duration: 110
  },
}
