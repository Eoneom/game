import { MovementAction, WorldMarkerRelation } from '@eoneom/api-client'

/** Terrain chars of `GET /world/terrain` (slice 044). */
export type TerrainChar = 'f' | 'r' | 'l'

export const TERRAIN_COLORS: Record<TerrainChar, string> = {
  f: '#2d5a43',
  r: '#6f5a4c',
  l: '#3c6684',
}

/** Darker blocks of the minimap. */
export const MINIMAP_TERRAIN_COLORS: Record<TerrainChar, string> = {
  f: '#22422f',
  r: '#4f4036',
  l: '#2b4a60',
}

export const GRID_COLOR = 'rgba(20, 16, 12, 0.45)'

export const terrainLegend: { key: TerrainChar; label: string; color: string }[] = [
  { key: 'f', label: 'Forêt', color: TERRAIN_COLORS.f },
  { key: 'r', label: 'Ruines', color: TERRAIN_COLORS.r },
  { key: 'l', label: 'Lac', color: TERRAIN_COLORS.l },
]

export const terrainLabel = (char: TerrainChar | undefined): string =>
  terrainLegend.find(entry => entry.key === char)?.label ?? 'Inconnu'

interface RelationStyle {
  fill: string
  stroke: string
  label: string
}

/** Marker colours by relation (040 palette hues), legend order. */
export const RELATION_STYLES: Record<WorldMarkerRelation, RelationStyle> = {
  mine: { fill: '#e8c547', stroke: '#7a5e12', label: 'Vos emplacements' },
  ally: { fill: '#7dcea0', stroke: '#2a6b47', label: 'Alliance' },
  faction: { fill: '#5ec4c0', stroke: '#1f6664', label: 'Même faction' },
  enemy: { fill: '#ff7a68', stroke: '#8a2418', label: 'Factions ennemies' },
  system: { fill: '#b79cf0', stroke: '#563f8c', label: 'Système' },
}

export const RELATION_ORDER: WorldMarkerRelation[] = [ 'mine', 'ally', 'faction', 'enemy', 'system' ]

/** Short relation names for the hover card and the drawer. */
export const RELATION_NAMES: Record<WorldMarkerRelation, string> = {
  mine: 'Vous',
  ally: 'Alliance',
  faction: 'Même faction',
  enemy: 'Faction ennemie',
  system: 'Système',
}

export const CURRENT_LOCATION_RING = '#e8c547'
export const SELECTION_COLOR = '#ffe27a'
export const HOVER_COLOR = 'rgba(255, 255, 255, 0.85)'
export const DANGER_COLOR = '#ff5a44'

interface MovementStyle {
  color: string
  width: number
  dash: number[]
}

/** Arrow style per action; return trips use the `base` style. */
export const MOVEMENT_STYLES: Record<MovementAction, MovementStyle> = {
  [MovementAction.ATTACK]: { color: '#ff5a44', width: 2.5, dash: [] },
  [MovementAction.SPY]: { color: '#b79cf0', width: 2, dash: [ 2, 5 ] },
  [MovementAction.TRANSPORT]: { color: '#5ec8e6', width: 2.5, dash: [] },
  [MovementAction.REINFORCE]: { color: '#7dcea0', width: 2.5, dash: [] },
  [MovementAction.EXPLORE]: { color: '#d8d2c4', width: 2, dash: [ 2, 5 ] },
  [MovementAction.BASE]: { color: '#a59c8e', width: 2, dash: [ 8, 6 ] },
  [MovementAction.EXCHANGE]: { color: '#e8c547', width: 1.5, dash: [] },
}

export const INCOMING_STYLE: MovementStyle = { color: '#ff3b2a', width: 4, dash: [] }

export const movementLegend: { key: string; label: string; style: MovementStyle }[] = [
  { key: 'attack', label: 'Attaque', style: MOVEMENT_STYLES[MovementAction.ATTACK] },
  { key: 'spy', label: 'Espionnage', style: MOVEMENT_STYLES[MovementAction.SPY] },
  { key: 'transport', label: 'Transport', style: MOVEMENT_STYLES[MovementAction.TRANSPORT] },
  { key: 'reinforce', label: 'Renfort', style: MOVEMENT_STYLES[MovementAction.REINFORCE] },
  { key: 'explore', label: 'Exploration', style: MOVEMENT_STYLES[MovementAction.EXPLORE] },
  { key: 'base', label: 'Base / retour', style: MOVEMENT_STYLES[MovementAction.BASE] },
  { key: 'exchange', label: 'Convoi de bourse', style: MOVEMENT_STYLES[MovementAction.EXCHANGE] },
  { key: 'incoming', label: 'Attaque entrante', style: INCOMING_STYLE },
]

/** Canvas fonts: never below 12 px (040). */
const CANVAS_FONT_FAMILY = 'Oxanium, system-ui, sans-serif'
export const LABEL_FONT = `600 13px ${CANVAS_FONT_FAMILY}`
export const SMALL_FONT = `600 12px ${CANVAS_FONT_FAMILY}`
