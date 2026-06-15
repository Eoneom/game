import { TroopCode } from './code'

export enum TroopRole {
  SCOUT = 'scout',
  FOUNDER = 'founder',
  CARRIER = 'carrier',
  CULTIVATOR = 'cultivator',
  SALVAGER = 'salvager'
}

export const troop_role: Record<TroopCode, TroopRole> = {
  [TroopCode.EXPLORER]: TroopRole.SCOUT,
  [TroopCode.SETTLER]: TroopRole.FOUNDER,
  [TroopCode.LIGHT_TRANSPORTER]: TroopRole.CARRIER,
  [TroopCode.FARMER]: TroopRole.CULTIVATOR,
  [TroopCode.RECYCLER]: TroopRole.SALVAGER,
  [TroopCode.SEEKER]: TroopRole.SCOUT,
  [TroopCode.ASSEMBLER]: TroopRole.FOUNDER,
  [TroopCode.HAULER]: TroopRole.CARRIER,
  [TroopCode.HARVESTER]: TroopRole.CULTIVATOR,
  [TroopCode.RECLAIMER]: TroopRole.SALVAGER
}
