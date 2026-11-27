import { TechnologyCode } from '@eoneom/api-client'

import { TechnologyBranch } from '#technology/branch'

interface TechnologyTranslation {
  name: string
  description: string
  effect: string
}

export const TechnologyTranslations: Record<TechnologyCode, TechnologyTranslation> = {
  [TechnologyCode.ARCHITECTURE]: {
    name: 'Architecture',
    description: 'Réfléchir à la construction de bâtiments permet de nouvelles prouesses d\'optimisation de place',
    effect: 'Débloque des bâtiments et réduit le temps de construction de 10% par niveau'
  },
  [TechnologyCode.REPLICATION_CATALYST]: {
    name: 'Catalyseur de réplication',
    description: 'L\'ajout de catalyseur dans le bain des clones permet d\'accélérer leur développement',
    effect: 'Accélère la production de troupes de 10% par niveau'
  },
  [TechnologyCode.OUTPOST_LOGISTICS]: {
    name: 'Logistique des avant-postes',
    description: 'Optimiser le stockage et le ravitaillement des avant-postes permet d\'y entreposer davantage de ressources',
    effect: 'Augmente la capacité de stockage des avant-postes de 40% par niveau (base 2000 plastique / 1500 champignons)'
  },
  [TechnologyCode.OUTPOST_EXPANSION]: {
    name: 'Expansion des avant-postes',
    description: 'Étendre les réseaux de ravitaillement permet de maintenir davantage d\'avant-postes actifs sur le terrain',
    effect: '+5 avant-postes max par niveau (base 15)'
  },
  [TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION]: {
    name: 'Optimisation photovoltaïque',
    description: 'Améliorer le rendement des cellules solaires permet d\'extraire davantage d\'énergie des panneaux',
    effect: 'Augmente la production d\'énergie des panneaux solaires de 15% par niveau'
  },
  [TechnologyCode.BALLISTIC_ALLOYS]: {
    name: 'Alliages balistiques',
    description: 'Des alliages récupérés et retrempés donnent aux armes de nos combattants un mordant inégalé',
    effect: 'Augmente l\'attaque des troupes de combat de 3% par niveau'
  },
  [TechnologyCode.ORGANIC_PLATING]: {
    name: 'Blindage organique',
    description: 'Des plaques cultivées sur mycélium renforcent les protections sans alourdir les combattants',
    effect: 'Augmente la vie des troupes de combat de 3% par niveau'
  },
  [TechnologyCode.TACTICAL_PROPULSION]: {
    name: 'Propulsion tactique',
    description: 'Des propulseurs alimentés au plasma permettent aux unités de combat de fondre sur leurs cibles',
    effect: 'Augmente la vitesse des troupes de combat de 4% par niveau (le mouvement garde la vitesse de l\'unité la plus lente)'
  },
  [TechnologyCode.ADVANCED_RECYCLING]: {
    name: 'Recyclage avancé',
    description: 'Un tri plus fin des déchets permet d\'extraire davantage de plastique de chaque tonne de rebuts',
    effect: 'Augmente la production de plastique (usines et troupes) de 5% par niveau'
  },
  [TechnologyCode.AGRONOMY]: {
    name: 'Agronomie',
    description: 'Maîtriser l\'humidité et les substrats rend les cultures de champignons plus généreuses',
    effect: 'Augmente la production de champignons (fermes et troupes) de 5% par niveau'
  },
  [TechnologyCode.STORAGE_COMPRESSION]: {
    name: 'Compression',
    description: 'Compacter les stocks libère de la place dans les entrepôts des villes',
    effect: 'Augmente la capacité des entrepôts de plastique et de champignons des villes de 10% par niveau'
  },
  [TechnologyCode.PLASMA_CONTAINMENT]: {
    name: 'Confinement plasma',
    description: 'De meilleurs champs de confinement limitent les pertes de l\'inducteur central',
    effect: 'Augmente la production de plasma de 5% par niveau'
  },
  [TechnologyCode.FORTIFICATION]: {
    name: 'Fortification',
    description: 'Béton armé de rebuts, blindages superposés et circuits de tir redondants rendent les défenses de ville plus coriaces',
    effect: 'Augmente l\'attaque et la vie des défenses de 3% par niveau. Débloque la tourelle, le générateur de bouclier et la batterie plasma'
  },
  [TechnologyCode.ESPIONAGE]: {
    name: 'Espionnage',
    description: 'Des éclaireurs discrets, des relais d\'écoute bricolés et une patience infinie pour voir sans être vus',
    effect: 'Débloque l\'ordre « Espionner » pour les éclaireurs. Chaque niveau au-dessus de la Détection adverse améliore les chances de succès et le détail des rapports'
  },
  [TechnologyCode.DETECTION]: {
    name: 'Détection',
    description: 'Guetteurs, capteurs de vibration et balises de proximité surveillent les abords de nos positions',
    effect: 'Signale les attaques entrantes : cible et heure d\'arrivée au niveau 1, attaquant au niveau 2, taille de l\'armée au niveau 3, composition exacte à partir du niveau 4. Protège aussi contre les espions'
  }
}

export const TechnologyBranchLabels: Record<TechnologyBranch, string> = {
  [TechnologyBranch.FOUNDATIONS]: 'Fondations',
  [TechnologyBranch.ARSENAL]: 'Arsenal',
  [TechnologyBranch.ECONOMY]: 'Économie',
  [TechnologyBranch.INTELLIGENCE]: 'Renseignement',
}
