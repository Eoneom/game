import { CellType } from '@eoneom/api-client'

/** Edge length of one cell in Konva group space (before zoom). */
export const CELL_WORLD_SIZE = 100

export const getCellFillStyle = ({ type }: { type?: CellType }): string => {
  switch (type) {
  case CellType.FOREST:
    return '#2d6a4f'
  case CellType.RUINS:
    return '#8d6e63'
  case CellType.LAKE:
    return '#457b9d'
  }

  return '#3d3d4a'
}

export const getCellStrokeStyle = ({ type }: { type?: CellType }): string => {
  switch (type) {
  case CellType.FOREST:
    return '#1b4332'
  case CellType.RUINS:
    return '#5d4037'
  case CellType.LAKE:
    return '#1d3557'
  }

  return '#2a2a32'
}

export type TerrainLegendKey = CellType

export const terrainLegend: { key: TerrainLegendKey; label: string; color: string }[] = [
  { key: CellType.FOREST, label: 'Forêt', color: getCellFillStyle({ type: CellType.FOREST }) },
  { key: CellType.RUINS, label: 'Ruines', color: getCellFillStyle({ type: CellType.RUINS }) },
  { key: CellType.LAKE, label: 'Lac', color: getCellFillStyle({ type: CellType.LAKE }) },
]

export type SettlementOwnership = 'self' | 'ally' | 'enemy'

export const getSettlementOwnership = ({
  owner_player_id,
  owner_faction_code,
  viewer_player_id,
  viewer_faction_code,
}: {
  owner_player_id: string
  owner_faction_code: string
  viewer_player_id: string
  viewer_faction_code: string
}): SettlementOwnership => {
  if (owner_player_id === viewer_player_id) {
    return 'self'
  }
  if (owner_faction_code === viewer_faction_code) {
    return 'ally'
  }
  return 'enemy'
}

export const settlementMarkerStyles: Record<
  SettlementOwnership,
  { cityFill: string; cityStroke: string; outpostFill: string; outpostStroke: string }
> = {
  self: {
    cityFill: 'rgba(241,196,15,0.45)',
    cityStroke: '#f1c40f',
    outpostFill: 'rgba(212,137,74,0.5)',
    outpostStroke: '#D4894A',
  },
  ally: {
    cityFill: 'rgba(46,204,113,0.35)',
    cityStroke: '#2ecc71',
    outpostFill: 'rgba(39,174,96,0.35)',
    outpostStroke: '#27ae60',
  },
  enemy: {
    cityFill: 'rgba(231,76,60,0.35)',
    cityStroke: '#e74c3c',
    outpostFill: 'rgba(192,57,43,0.35)',
    outpostStroke: '#c0392b',
  },
}

export const settlementLegend: { key: SettlementOwnership; label: string; color: string }[] = [
  { key: 'self', label: 'Vos emplacements', color: settlementMarkerStyles.self.cityStroke },
  { key: 'ally', label: 'Alliés (même faction)', color: settlementMarkerStyles.ally.cityStroke },
  { key: 'enemy', label: 'Autres factions', color: settlementMarkerStyles.enemy.cityStroke },
]
