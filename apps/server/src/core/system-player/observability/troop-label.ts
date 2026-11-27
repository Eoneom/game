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
  [TroopCode.ASH_EMISSARY]: 'Émissaire des cendres',
  [TroopCode.PYRE_PILGRIM]: 'Pèlerin du bûcher',
  [TroopCode.BONE_CART]: 'Char d\'ossements',
  [TroopCode.SPORE_ACOLYTE]: 'Acolyte des spores',
  [TroopCode.SCRAP_LECTOR]: 'Lecteur de ferraille',
  [TroopCode.PENITENT_HORDE]: 'Horde pénitente',
  [TroopCode.WRAITH_LANCER]: 'Lancier spectre',
  [TroopCode.HEMORRHAGE_CULTIST]: 'Cultiste hémorragique',
  [TroopCode.CINDER_TITAN]: 'Titan de cendre',
  [TroopCode.DRIFTING_SPORE]: 'Spore errante',
  [TroopCode.SEED_BEARER]: 'Porte-germe',
  [TroopCode.MYCELIAL_PORTER]: 'Portefaix mycélien',
  [TroopCode.SYMBIONT_GROWER]: 'Cultivateur symbiote',
  [TroopCode.DECOMPOSER]: 'Décomposeur',
  [TroopCode.ROOT_WARDEN]: 'Garde-racine',
  [TroopCode.SPORE_SWARM]: 'Essaim de spores',
  [TroopCode.FUNGAL_COLOSSUS]: 'Colosse fongique',
  [TroopCode.TOXIC_HOWLER]: 'Hurleur toxique',
}

export function translateTroopCodeForObservability(code: string): string {
  const label = TROOP_NAME[code as TroopCode]
  return label ?? code
}
