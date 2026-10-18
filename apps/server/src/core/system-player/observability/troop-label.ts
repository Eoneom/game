import { TroopCode } from '@eoneom/api-client'

/** French display names — aligned with `apps/web/src/modules/troop/translations.ts`. */
const TROOP_NAME: Record<TroopCode, string> = {
  [TroopCode.EXPLORER]: 'Explorateur',
  [TroopCode.SETTLER]: 'Colon',
  [TroopCode.LIGHT_TRANSPORTER]: 'Transporteur léger',
  [TroopCode.FARMER]: 'Fermier',
  [TroopCode.RECYCLER]: 'Recycleur',
  [TroopCode.SEEKER]: 'Traqueur',
  [TroopCode.ASSEMBLER]: 'Assembleur',
  [TroopCode.HAULER]: 'Convoyeur',
  [TroopCode.HARVESTER]: 'Moissonneur',
  [TroopCode.RECLAIMER]: 'Récupérateur',
  [TroopCode.LEGIONNAIRE]: 'Légionnaire',
  [TroopCode.INTERCEPTOR]: 'Intercepteur',
  [TroopCode.SHOCK_TROOPER]: 'Troupier de choc',
  [TroopCode.ASSAULT_BEHEMOTH]: 'Béhémoth d\'assaut',
  [TroopCode.WAR_MACHINE]: 'Machine de guerre',
  [TroopCode.DISRUPTOR]: 'Perturbateur',
  [TroopCode.PRIME_UNIT]: 'Unité prime',
  [TroopCode.STRIKER_DRONE]: 'Drone d\'assaut',
}

export function translateTroopCodeForObservability(code: string): string {
  const label = TROOP_NAME[code as TroopCode]
  return label ?? code
}
