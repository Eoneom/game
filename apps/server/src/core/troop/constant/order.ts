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
  [TroopCode.ASSEMBLER]: 5,
  [TroopCode.LEGIONNAIRE]: 6,
  [TroopCode.INTERCEPTOR]: 7,
  [TroopCode.ASSAULT_BEHEMOTH]: 8,
  [TroopCode.SHOCK_TROOPER]: 9,
  [TroopCode.WAR_MACHINE]: 6,
  [TroopCode.DISRUPTOR]: 7,
  [TroopCode.PRIME_UNIT]: 8,
  [TroopCode.STRIKER_DRONE]: 9,
}
