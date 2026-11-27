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
}
