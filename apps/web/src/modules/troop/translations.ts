import { TroopCode } from '@eoneom/api-client'

interface TroopTranslation {
  name: string
  description: string
  effect: string
}

export const TroopTranslations: Record<TroopCode, TroopTranslation> = {
  [TroopCode.EXPLORER]: {
    name: 'Explorateur',
    description: 'Créé pour se déplacer rapidement, il est capable de se camoufler et passer n\'importe où',
    effect: 'Récupère des informations sur le monde concernant les ressources à récupérer'
  },
  [TroopCode.SETTLER]: {
    name: 'Colon',
    description: 'Le colon emporte avec lui toute la nourriture et le matériel nécessaire à la création de ville',
    effect: 'Permet de coloniser un emplacement du monde en créant une nouvelle ville'
  },
  [TroopCode.LIGHT_TRANSPORTER]: {
    name: 'Transporteur léger',
    description: '',
    effect: ''
  },
  [TroopCode.FARMER]: {
    name: 'Fermier',
    description: 'Unité spécialisée dans la production de champignons sur les avant postes.',
    effect: 'Récolte des champignons.'
  },
  [TroopCode.RECYCLER]: {
    name: 'Recycleur',
    description: 'Unité dédiée à la récupération et à la valorisation du plastique sur les avant postes.',
    effect: 'Récolte du plastique.'
  },
  [TroopCode.SEEKER]: {
    name: 'Traqueur',
    description: 'Conçu pour se déplacer rapidement, ce drone se camoufle et s\'infiltre partout.',
    effect: 'Récupère des informations sur le monde concernant les ressources à récupérer'
  },
  [TroopCode.ASSEMBLER]: {
    name: 'Assembleur',
    description: 'L\'assembleur emporte le matériel nécessaire à l\'édification d\'une ville-machine.',
    effect: 'Permet de coloniser un emplacement du monde en créant une nouvelle ville'
  },
  [TroopCode.HAULER]: {
    name: 'Convoyeur',
    description: '',
    effect: ''
  },
  [TroopCode.HARVESTER]: {
    name: 'Moissonneur',
    description: 'Unité spécialisée dans l\'extraction de champignons sur les avant-postes.',
    effect: 'Récolte des champignons.'
  },
  [TroopCode.RECLAIMER]: {
    name: 'Récupérateur',
    description: 'Unité dédiée à l\'extraction et à la valorisation du plastique sur les avant-postes.',
    effect: 'Récolte du plastique.'
  }
}
