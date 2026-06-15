import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'

export const troop_faction: Record<TroopCode, FactionCode> = {
  [TroopCode.EXPLORER]: FactionCode.THE_CONFEDERATION,
  [TroopCode.SETTLER]: FactionCode.THE_CONFEDERATION,
  [TroopCode.LIGHT_TRANSPORTER]: FactionCode.THE_CONFEDERATION,
  [TroopCode.FARMER]: FactionCode.THE_CONFEDERATION,
  [TroopCode.RECYCLER]: FactionCode.THE_CONFEDERATION,
  [TroopCode.SEEKER]: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
  [TroopCode.ASSEMBLER]: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
  [TroopCode.HAULER]: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
  [TroopCode.HARVESTER]: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
  [TroopCode.RECLAIMER]: FactionCode.THE_TECHNOLOGICAL_SINGULARITY
}
