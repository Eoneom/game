import {
  AuthError,
  BuildingError,
  CityError,
  CommunicationError,
  FactionError,
  OutpostError,
  PlayerError,
  RequestError,
  RequirementError,
  ResourceStockError,
  TechnologyError,
  TroopError,
  WorldError,
} from '@eoneom/api-client'

const FALLBACK_MESSAGE = 'Une erreur est survenue'

const ErrorTranslations: Record<string, string> = {
  [AuthError.NOT_FOUND]: 'Authentification introuvable',

  [BuildingError.NOT_FOUND]: 'Bâtiment introuvable',
  [BuildingError.ALREADY_IN_PROGRESS]: 'Une construction est déjà en cours',
  [BuildingError.NOT_IN_PROGRESS]: 'Aucune construction en cours',
  [BuildingError.QUEUE_FULL]: 'La file de construction est pleine',
  [BuildingError.QUEUE_ITEM_NOT_FOUND]: 'Élément de file de construction introuvable',

  [CityError.ALREADY_EXISTS]: 'Cette ville existe déjà',
  [CityError.NOT_FOUND]: 'Ville introuvable',
  [CityError.NOT_ENOUGH_RESOURCES]: 'Pas assez de ressources',
  [CityError.NOT_ENOUGH_SPACE]: 'Pas assez d\'espace',
  [CityError.NOT_OWNER]: 'Vous n\'êtes pas propriétaire de cette ville',
  [CityError.LIMIT_REACHED]: 'Limite de villes atteinte',
  [CityError.NO_SETTLER_AVAILABLE]: 'Aucune unité de colonisation disponible',
  [CityError.CANNOT_SETTLE_ON_PERMANENT_OUTPOST]: 'Impossible de s\'installer sur un avant-poste permanent',

  [CommunicationError.REPORT_NOT_FOUND]: 'Rapport introuvable',
  [CommunicationError.REPORT_NOT_OWNER]: 'Vous n\'êtes pas propriétaire de ce rapport',

  [OutpostError.NOT_FOUND]: 'Avant-poste introuvable',
  [OutpostError.NOT_OWNER]: 'Vous n\'êtes pas propriétaire de cet avant-poste',
  [OutpostError.LIMIT_REACHED]: 'Limite d\'avant-postes atteinte',

  [FactionError.NOT_FOUND]: 'Faction introuvable',
  [FactionError.NOT_PLAYABLE]: 'Cette faction n\'est pas jouable',

  [PlayerError.NOT_FOUND]: 'Joueur introuvable',
  [PlayerError.ALREADY_EXISTS]: 'Ce joueur existe déjà',

  [RequirementError.BUILDING_NOT_FULFILLED]: 'Prérequis de bâtiment non remplis',
  [RequirementError.TECHNOLOGY_NOT_FULFILLED]: 'Prérequis de technologie non remplis',

  [ResourceStockError.NOT_FOUND]: 'Stock de ressources introuvable',

  [TechnologyError.ALREADY_IN_PROGRESS]: 'Une recherche est déjà en cours',
  [TechnologyError.NOT_FOUND]: 'Technologie introuvable',
  [TechnologyError.NOT_IN_PROGRESS]: 'Aucune recherche en cours',

  [TroopError.NOT_FOUND]: 'Troupe introuvable',
  [TroopError.ALREADY_IN_PROGRESS]: 'Un recrutement est déjà en cours',
  [TroopError.NOT_IN_PROGRESS]: 'Aucun recrutement en cours',
  [TroopError.NOT_ENOUGH_TROOPS]: 'Pas assez de troupes',
  [TroopError.NOT_OWNER]: 'Vous n\'êtes pas propriétaire de ces troupes',
  [TroopError.MOVEMENT_NOT_OWNER]: 'Vous n\'êtes pas propriétaire de ce mouvement',
  [TroopError.MOVEMENT_NOT_FOUND]: 'Mouvement introuvable',
  [TroopError.MOVEMENT_ACTION_NOT_IMPLEMENTED]: 'Action de mouvement non disponible',
  [TroopError.TRANSPORT_CAPACITY_EXCEEDED]: 'Capacité de transport dépassée',
  [TroopError.TRANSPORT_RESOURCES_REQUIRED]: 'Des ressources sont requises pour ce transport',
  [TroopError.TRANSPORT_RESOURCES_NOT_ALLOWED]: 'Les ressources ne sont pas autorisées pour cette action',
  [TroopError.NOT_IN_FACTION_ROSTER]: 'Cette unité n\'appartient pas à votre faction',

  [WorldError.ALREADY_EXISTS]: 'Ce monde existe déjà',
  [WorldError.CELL_NOT_FOUND]: 'Case introuvable',
  [WorldError.CELL_CITY_MISMATCH]: 'La case ne correspond pas à cette ville',
  [WorldError.CELL_OUTPOST_MISMATCH]: 'La case ne correspond pas à cet avant-poste',
  [WorldError.EXPLORATION_NOT_FOUND]: 'Exploration introuvable',
  [WorldError.INVALID_BOUNDS]: 'Limites de carte invalides',

  [RequestError.CITY_ID_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.BUILDING_CODE_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.TECHNOLOGY_CODE_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.TROOP_CODE_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.TROOP_ID_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.OUTPOST_ID_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.MOVEMENT_ID_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.QUEUE_ITEM_ID_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.REPORT_ID_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.PLAYER_NAME_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.CITY_NAME_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.FACTION_CODE_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.COUNT_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.ORIGIN_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.DESTINATION_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.TROOPS_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.TROOP_CODES_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.ACTION_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.WAS_READ_NOT_FOUND]: 'Paramètre manquant',
  [RequestError.TOKEN_NOT_FOUND]: 'Authentification requise',
  [RequestError.PLAYER_ID_NOT_IN_CONTEXT]: 'Authentification requise',
}

export const translateError = (code: string): string => {
  return ErrorTranslations[code] ?? FALLBACK_MESSAGE
}
