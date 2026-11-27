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
  },
  [TroopCode.LEGIONNAIRE]: {
    name: 'Légionnaire',
    description: 'Ligne d\'infanterie organo-synthétique ; tient les garnisons et mène les assauts.',
    effect: 'Unité de combat de la Confédération.',
  },
  [TroopCode.INTERCEPTOR]: {
    name: 'Intercepteur',
    description: 'Chasseur rapide optimisé pour frapper en premier.',
    effect: 'Unité de frappe rapide.',
  },
  [TroopCode.SHOCK_TROOPER]: {
    name: 'Troupier de choc',
    description: 'Brècheur d\'élite confédéré ; saturation électrique et percée des lignes.',
    effect: 'Unité de perturbation de la Confédération.',
  },
  [TroopCode.ASSAULT_BEHEMOTH]: {
    name: 'Béhémoth d\'assaut',
    description: 'Colosse de siège organo-mécanique ; avance lourdement sous le feu.',
    effect: 'Plateforme d\'assaut lourde de la Confédération.',
  },
  [TroopCode.WAR_MACHINE]: {
    name: 'Machine de guerre',
    description: 'Plateforme d\'assaut autonome, lente mais blindée.',
    effect: 'Unité de combat de la Singularité.',
  },
  [TroopCode.DISRUPTOR]: {
    name: 'Perturbateur',
    description: 'Unité légère de harcèlement et de saturation.',
    effect: 'Unité d\'harcelement rapide.',
  },
  [TroopCode.PRIME_UNIT]: {
    name: 'Unité prime',
    description: 'Ligne synthétique d\'élite d\'Alpha ; cohésion et endurance de combat.',
    effect: 'Infanterie de ligne de la Singularité.',
  },
  [TroopCode.STRIKER_DRONE]: {
    name: 'Drone d\'assaut',
    description: 'Essaim rapide à lames énergétiques ; frappe puis décrochage.',
    effect: 'Intercepteur autonome de la Singularité.',
  },
  [TroopCode.ASH_EMISSARY]: {
    name: 'Émissaire des cendres',
    description: 'Messager masqué de cire et de suie ; écoute les ruines avant la marée.',
    effect: 'Éclaireur de la Liturgie des cendres.',
  },
  [TroopCode.PYRE_PILGRIM]: {
    name: 'Pèlerin du bûcher',
    description: 'Porte reliques calcinées pour fonder un autel-cité.',
    effect: 'Permet de coloniser un emplacement en créant une nouvelle ville.',
  },
  [TroopCode.BONE_CART]: {
    name: 'Char d\'ossements',
    description: 'Râtelier de côtes et de ferraille bénie.',
    effect: '',
  },
  [TroopCode.SPORE_ACOLYTE]: {
    name: 'Acolyte des spores',
    description: 'Incube les champignons comme offrandes vivantes.',
    effect: 'Récolte des champignons.',
  },
  [TroopCode.SCRAP_LECTOR]: {
    name: 'Lecteur de ferraille',
    description: 'Déchiffre le plastique des cadavres de machines.',
    effect: 'Récolte du plastique.',
  },
  [TroopCode.PENITENT_HORDE]: {
    name: 'Horde pénitente',
    description: 'Fouets de barbelés et chants rauques ; tient la ligne une minute de trop.',
    effect: 'ATK 14 · DEF 8 · VIE 10',
  },
  [TroopCode.WRAITH_LANCER]: {
    name: 'Lancier spectre',
    description: 'Frappe en silence puis s\'efface dans la brume cendrée.',
    effect: 'ATK 22 · DEF 2 · VIE 3',
  },
  [TroopCode.HEMORRHAGE_CULTIST]: {
    name: 'Cultiste hémorragique',
    description: 'Ouvre ses veines pour noyer l\'ennemi sous les lames rituelles.',
    effect: 'ATK 19 · DEF 3 · VIE 3',
  },
  [TroopCode.CINDER_TITAN]: {
    name: 'Titan de cendre',
    description: 'Colosse de braises mortes ; avance comme une chute lente.',
    effect: 'ATK 9 · DEF 18 · VIE 20',
  },
  [TroopCode.DRIFTING_SPORE]: {
    name: 'Spore errante',
    description: 'Spore portée par le vent, qui s\'infiltre partout et voit tout.',
    effect: 'Éclaireur de la Symbiose.',
  },
  [TroopCode.SEED_BEARER]: {
    name: 'Porte-germe',
    description: 'Porte une graine de mycélium pour planter une nouvelle colonie.',
    effect: 'Permet de coloniser un emplacement en créant une nouvelle ville.',
  },
  [TroopCode.MYCELIAL_PORTER]: {
    name: 'Portefaix mycélien',
    description: 'Bête de somme fongique, lente et infatigable.',
    effect: '',
  },
  [TroopCode.SYMBIONT_GROWER]: {
    name: 'Cultivateur symbiote',
    description: 'Fait pousser les champignons à même sa peau.',
    effect: 'Récolte des champignons.',
  },
  [TroopCode.DECOMPOSER]: {
    name: 'Décomposeur',
    description: 'Digère les déchets plastiques des ruines.',
    effect: 'Récolte du plastique.',
  },
  [TroopCode.ROOT_WARDEN]: {
    name: 'Garde-racine',
    description: 'Infanterie enracinée dans le sol, qui tient les lignes.',
    effect: 'ATK 9 · DEF 10 · VIE 12',
  },
  [TroopCode.SPORE_SWARM]: {
    name: 'Essaim de spores',
    description: 'Nuage rapide de spores chasseresses.',
    effect: 'ATK 14 · DEF 3 · VIE 4',
  },
  [TroopCode.FUNGAL_COLOSSUS]: {
    name: 'Colosse fongique',
    description: 'Masse de mycélium qui écrase les murailles.',
    effect: 'ATK 10 · DEF 12 · VIE 13',
  },
  [TroopCode.TOXIC_HOWLER]: {
    name: 'Hurleur toxique',
    description: 'Crache des toxines paralysantes.',
    effect: 'ATK 11 · DEF 5 · VIE 5',
  },
  [TroopCode.SENTINEL]: {
    name: 'Vigie',
    description: 'Guetteur de l\'Ordre, posté sur les hauteurs, qui relève chaque mouvement.',
    effect: 'Éclaireur de l\'Ordre du Bastion.',
  },
  [TroopCode.FIELD_ENGINEER]: {
    name: 'Ingénieur de campagne',
    description: 'Arpente le terrain et trace les fondations d\'un nouveau bastion.',
    effect: 'Permet de coloniser un emplacement en créant une nouvelle ville.',
  },
  [TroopCode.SUPPLY_TRUCK]: {
    name: 'Camion de ravitaillement',
    description: 'Vieux camion militaire blindé, rafistolé pour suivre les colonnes.',
    effect: '',
  },
  [TroopCode.QUARTERMASTER]: {
    name: 'Intendant',
    description: 'Tient les rations de la garnison et fait tourner les champignonnières.',
    effect: 'Récolte des champignons.',
  },
  [TroopCode.SCRAPPER]: {
    name: 'Ferrailleur',
    description: 'Démonte les carcasses d\'avant l\'effondrement pour en tirer le plastique.',
    effect: 'Récolte du plastique.',
  },
  [TroopCode.GRENADIER]: {
    name: 'Grenadier',
    description: 'Infanterie de ligne cuirassée, lente et inébranlable.',
    effect: 'ATK 13 · DEF 16 · VIE 18',
  },
  [TroopCode.DRAGOON]: {
    name: 'Dragon mécanisé',
    description: 'Unité de choc à moto blindée.',
    effect: 'ATK 22 · DEF 5 · VIE 6',
  },
  [TroopCode.SIEGE_TANK]: {
    name: 'Char de siège',
    description: 'Char d\'avant l\'effondrement, restauré pièce par pièce.',
    effect: 'ATK 14 · DEF 18 · VIE 19',
  },
  [TroopCode.MOBILE_MORTAR]: {
    name: 'Mortier mobile',
    description: 'Équipe de mortier tractée, dévastatrice mais fragile.',
    effect: 'ATK 17 · DEF 7 · VIE 7',
  },
}
