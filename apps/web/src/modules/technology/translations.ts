import { TechnologyCode } from '@eoneom/api-client'

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
  [TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION]: {
    name: 'Optimisation photovoltaïque',
    description: 'Améliorer le rendement des cellules solaires permet d\'extraire davantage d\'énergie des panneaux',
    effect: 'Augmente la production d\'énergie des panneaux solaires de 15% par niveau'
  }
}
