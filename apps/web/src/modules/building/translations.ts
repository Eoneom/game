import { BuildingCode } from '@eoneom/api-client'

interface BuildingTranslation {
  name: string
  description: string
  effect: string
}


export const BuildingTranslations: Record<BuildingCode, BuildingTranslation> = {
  [BuildingCode.MUSHROOM_FARM]: {
    name: 'Ferme à champignons',
    description: 'La nourriture la plus facile à cultiver en grande quantité en ces temps sombres',
    effect: 'Consomme de l\'énergie. Produit des champignons'
  },
  [BuildingCode.MUSHROOM_WAREHOUSE]: {
    name: 'Entrepôt de champignon',
    description: 'Il faut bien un endroit où stocker tout ces champignons sans quoi ils vont pourrir',
    effect: 'Stocke des champignons'
  },
  [BuildingCode.RECYCLING_PLANT]: {
    name: 'Centre de recyclage',
    description: 'On trouve du plastique partout et c\'est devenu la matière la plus courante. Profitons-en pour le recycler.',
    effect: 'Consomme de l\'énergie. Produit du plastique'
  },
  [BuildingCode.PLASTIC_WAREHOUSE]: {
    name: 'Entrepôt de plastique',
    description: 'Le plastique trié et raffiné doit être séparé du reste, et stocké dans ces entrepôts.',
    effect: 'Stocke du plastique'
  },
  [BuildingCode.RESEARCH_LAB]: {
    name: 'Laboratoire de recherche',
    description: 'Toute sorte d\'expériences sont menées dans ce laboratoire pour améliorer la vie de la colonie, ou en tout cas son expansion.',
    effect: 'Consomme de l\'énergie. Débloque les technologies et réduit le temps de recherche de 10% par niveau'
  },
  [BuildingCode.CLONING_FACTORY]: {
    name: 'Usine de clonage',
    description: 'La reproduction sexuée est trop complexe et trop longue ce qui rendrait les humains vulnérables. La solution la plus pratique reste le clonage.',
    effect: 'Consomme de l\'énergie. Débloque les troupes et réduit le temps de recrutement de 10% par niveau'
  },
  [BuildingCode.SOLAR_PANEL]: {
    name: 'Panneau solaire',
    description: 'Dans un monde où les ressources fossiles se sont épuisées, le soleil reste la source d\'énergie la plus fiable pour alimenter la colonie.',
    effect: 'Produit de l\'énergie'
  },
  [BuildingCode.CENTRAL_INDUCTOR]: {
    name: 'Inducteur central',
    description: 'Un cœur électromagnétique colossal qui force la matière à se dissocier en plasma. Instable, vorace en énergie, et trop dangereux pour être stocké dans un entrepôt ordinaire.',
    effect: 'Consomme beaucoup d\'énergie. Produit du plasma. Stockage illimité'
  },
  [BuildingCode.COMMAND_CENTER]: {
    name: 'Centre de commandement',
    description: 'Cartes, radios et coursiers : coordonner des colonnes dispersées sur des terres hostiles demande un état-major et un lieu où il peut travailler.',
    effect: 'Consomme de l\'énergie. Chaque niveau ajoute un mouvement simultané à tout l\'empire. Dès le niveau 1, débloque une file de recrutement dans la ville'
  },
  [BuildingCode.UNDERGROUND_SHELTER]: {
    name: 'Abri souterrain',
    description: 'Sous les ruines, des caves scellées où l\'on enterre une part des réserves avant que les pillards ne franchissent les murs.',
    effect: 'Protège une quantité fixe de plastique, de champignons, de plasma et d\'eau pure contre le pillage'
  },
  [BuildingCode.CITY_WALL]: {
    name: 'Enceinte',
    description: 'Fossés, talus et murs de ferraille soudée : une ville qui veut durer commence par tracer sa limite.',
    effect: 'Chaque niveau donne 20 points de défense et réduit le temps de fortification de 10%. Hors des 100 niveaux de bâtiments de la ville'
  },
  [BuildingCode.WATER_PURIFIER]: {
    name: 'Purificateur d\'eau',
    description: 'Filtres de charbon, membranes récupérées et bouilloires solaires : l\'eau pure est devenue rare, et ce qui est rare devient monnaie.',
    effect: 'Consomme de l\'énergie. Produit de l\'eau pure, la monnaie de la bourse de faction. Stockage illimité'
  },
  [BuildingCode.TRADING_POST]: {
    name: 'Comptoir d\'échange',
    description: 'Un guichet blindé, des registres et des coursiers : de quoi traiter avec les autres colonies de la faction sans quitter ses murs.',
    effect: 'Donne accès à la bourse de faction. Chaque niveau permet un ordre ouvert de plus dans la ville'
  }
}
