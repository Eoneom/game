import { DefenseCode } from '@eoneom/api-client'

export const DefenseTranslations: Record<DefenseCode, { name: string, description: string, effect: string }> = {
  [DefenseCode.RAMPART]: {
    name: 'Rempart',
    description: 'Des blocs de béton récupérés, empilés et soudés : rien de glorieux, mais l\'ennemi doit passer à travers.',
    effect: 'Aucune attaque. Beaucoup de vie : encaisse les pertes en premier.',
  },
  [DefenseCode.TURRET]: {
    name: 'Tourelle',
    description: 'Une arme lourde montée sur pivot, alimentée par les réserves de la ville.',
    effect: 'Défense armée : maintient la ville au combat même sans troupes.',
  },
  [DefenseCode.MINEFIELD]: {
    name: 'Champ de mines',
    description: 'Des charges enfouies aux abords des murs, qui ne servent qu\'une fois.',
    effect: 'Frappe uniquement au premier tour, puis est consommé. Ne peut pas être ciblé.',
  },
  [DefenseCode.PLASMA_BATTERY]: {
    name: 'Batterie plasma',
    description: 'Un canon branché sur l\'inducteur central, dévastateur tant que le plasma coule.',
    effect: 'Défense armée. Chaque tir coûte 5 plasma au stock de la ville par tour.',
  },
  [DefenseCode.SHIELD_GENERATOR]: {
    name: 'Générateur de bouclier',
    description: 'Un champ de force diffus qui dévie une partie des tirs ennemis.',
    effect: 'Chaque générateur réduit l\'attaque ennemie de 2 %, jusqu\'à 30 %.',
  },
  [DefenseCode.MYCELIUM_WALL]: {
    name: 'Mur de mycélium',
    description: 'Un rempart vivant de filaments entrelacés, qui repousse là où on l\'a tranché.',
    effect: 'Aucune attaque. Encaisse les pertes en premier. Si la ville tient, 30 % des murs détruits repoussent.',
  },
  [DefenseCode.SPORE_CLOUD]: {
    name: 'Nuage de spores',
    description: 'Des spores toxiques en suspension, qui brûlent les poumons et voilent la vue des assaillants.',
    effect: 'Défense armée. Chaque nuage réduit l\'attaque ennemie de 1 %, jusqu\'à 15 % (40 % au total avec les boucliers).',
  },
  [DefenseCode.FIELD_ARTILLERY]: {
    name: 'Artillerie de position',
    description: 'Des pièces lourdes d\'avant l\'effondrement, retranchées derrière les murs et réglées sur chaque approche.',
    effect: 'Défense armée. Brise les assauts : l\'essentiel de ses dégâts tombe aux tours 1 et 2.',
  },
  [DefenseCode.BARBED_WIRE]: {
    name: 'Barbelés',
    description: 'Des rouleaux de fil barbelé tendus devant les murs, qui ralentissent et désorganisent l\'assaut.',
    effect: 'Aucune attaque. Tombe en premier. Chaque rouleau réduit l\'attaque ennemie de 1 % au tour 1 (jusqu\'à 10 %) et de 0,5 % au tour 2 (jusqu\'à 5 %), dans la limite de 40 % au total avec boucliers et spores.',
  },
  [DefenseCode.RAILGUN]: {
    name: 'Canon électromagnétique',
    description: 'Un rail d\'accélération alimenté par l\'inducteur central, qui perce le blindage des engins de siège.',
    effect: 'Défense armée. Anti-siège : son attaque double à chaque tour où l\'assaillant mène un assaut de siège ou aligne au moins 50 % de son attaque en machines de guerre.',
  },
  [DefenseCode.HOLO_DECOY]: {
    name: 'Leurres holographiques',
    description: 'Des projecteurs qui peuplent les remparts de silhouettes trompeuses, le temps que l\'ennemi gaspille ses premières salves.',
    effect: 'Aucune attaque ni vie. Aux tours 1 et 2, chaque leurre absorbe une perte, dans la limite de 30 % des pertes de la ville. Les leurres restants s\'éteignent après le tour 2 : à reconstruire après chaque bataille.',
  },
}

/** Per-round attack profile of a defense (slice 037), e.g. "60 / 50 / 25 / 20 / 20"; null for a flat attack. */
export const formatAttackByRound = (attack_by_round?: number[]): string | null =>
  attack_by_round && attack_by_round.length > 0 ? attack_by_round.join(' / ') : null
