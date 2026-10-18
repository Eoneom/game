import {
  BuildingCode,
  OutpostType,
  TechnologyCode,
  TroopCode,
} from '@eoneom/api-client'

import { BuildingTranslations } from '#building/translations'
import { TechnologyTranslations } from '#technology/translations'
import { TroopTranslations } from '#troop/translations'

export const TICK_CATEGORY_LABEL = {
  upgrade: 'Amélioration de bâtiment',
  research: 'Recherche technologique',
  recruit: 'Recrutement de troupes',
  explore: 'Mouvement de troupes (exploration)',
  base: 'Mouvement de troupes (avant-poste)',
  settle: 'Fondation de colonie',
  'make-permanent': 'Avant-poste rendu permanent',
  transport: 'Transport de ressources',
  'deploy-outpost': 'Déploiement vers avant-poste',
  attack: 'Attaque',
} as const

export type ObservabilityTickCategory = keyof typeof TICK_CATEGORY_LABEL

export function translateBuildingCode(code: BuildingCode): string {
  return BuildingTranslations[code]?.name ?? code
}

export function translateTechnologyCode(code: TechnologyCode): string {
  return TechnologyTranslations[code]?.name ?? code
}

export function translateTroopCode(code: TroopCode): string {
  return TroopTranslations[code]?.name ?? code
}

export function translateOutpostType(type: OutpostType): string {
  if (type === OutpostType.PERMANENT) {
    return 'Permanent'
  }
  if (type === OutpostType.TEMPORARY) {
    return 'Temporaire'
  }
  return type
}

export const RESOURCE_LABEL = {
  plastic: 'Plastique',
  mushroom: 'Champignon',
  plasma: 'Plasma',
} as const
