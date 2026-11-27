import { CombatRole, TroopCode } from '@eoneom/api-client'
import { troop_characteristics } from '@server-core/troop/constant/characteristic'

import { TerrainMetric } from '#map/search'

/** Explored cell of `GET /world/exploration`. */
export interface ExploredCell {
  plastic: number
  mushroom: number
  solar: number
}

/** Coefficients are in [0.5, 2.0] (slice 005); five sequential bins split at these bounds. */
export const TERRAIN_BIN_BOUNDS = [ 0.8, 1.1, 1.4, 1.7 ] as const

/** Single-hue ramps, light to strong, drawn at 55 % opacity over the terrain. */
export const TERRAIN_RAMPS: Record<TerrainMetric, readonly string[]> = {
  plastic: [ '#5a3a22', '#8a5530', '#c27a3c', '#e6a04f', '#ffd27a' ],
  mushroom: [ '#1f3d2b', '#2f6141', '#3f8a5a', '#5fb87b', '#9ae6ad' ],
  mixed: [ '#3d3424', '#6b5a35', '#9a8446', '#c9b25a', '#f2e08a' ],
}

export const TERRAIN_OVERLAY_OPACITY = 0.55

export const TERRAIN_METRIC_LABELS: Record<TerrainMetric, string> = {
  plastic: 'Plastique',
  mushroom: 'Champignon',
  mixed: 'Mixte',
}

export const terrainValue = (cell: ExploredCell, metric: TerrainMetric): number => {
  if (metric === 'plastic') return cell.plastic
  if (metric === 'mushroom') return cell.mushroom
  return (cell.plastic + cell.mushroom) / 2
}

/** Bin index 0–4: < 0.8, 0.8–1.1, 1.1–1.4, 1.4–1.7, ≥ 1.7. */
export const terrainBin = (value: number): number => {
  const index = TERRAIN_BIN_BOUNDS.findIndex(bound => value < bound)
  return index === -1 ? TERRAIN_BIN_BOUNDS.length : index
}

const decimal = (value: number): string => value.toFixed(2).replace('.', ',')

/** « ×1,42 » */
export const formatCoefficient = (value: number): string => `×${decimal(value)}`

/** Legend / drawer label of a bin: « < ×0,8 », « ×0,8 – ×1,1 », « ≥ ×1,7 ». */
export const terrainBinLabel = (bin: number): string => {
  const short = (value: number) => `×${String(value).replace('.', ',')}`
  if (bin <= 0) return `< ${short(TERRAIN_BIN_BOUNDS[0])}`
  if (bin >= TERRAIN_BIN_BOUNDS.length) return `≥ ${short(TERRAIN_BIN_BOUNDS[TERRAIN_BIN_BOUNDS.length - 1])}`
  return `${short(TERRAIN_BIN_BOUNDS[bin - 1])} – ${short(TERRAIN_BIN_BOUNDS[bin])}`
}

const HOUR_MS = 3_600_000

/** Spy report age: fresh (< 6 h) solid, aging (6–24 h) faded, stale (> 24 h) outline only. */
type ReportAgeClass = 'fresh' | 'aging' | 'stale'

export const reportAgeClass = (recorded_at: number, now: number): ReportAgeClass => {
  const age = now - recorded_at
  if (age < 6 * HOUR_MS) return 'fresh'
  if (age <= 24 * HOUR_MS) return 'aging'
  return 'stale'
}

/** « 12 min », « 2 h », « 3 j ». */
export const formatReportAge = (recorded_at: number, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - recorded_at) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} j`
}

const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** « ATK ≈ 1 200 · VIE ≈ 3 400 », prefixed « ≥ » when the tier did not reveal defenses. */
export const formatStrength = ({
  attack,
  life,
  defenses_known,
}: {
  attack: number
  life: number
  defenses_known: boolean
}): string => {
  const prefix = defenses_known ? '' : '≥ '
  return `${prefix}ATK ≈ ${integer.format(attack)} · VIE ≈ ${integer.format(life)}`
}

export type Balance = 'favorable' | 'uncertain' | 'risky'

export const BALANCE_LABELS: Record<Balance, string> = {
  favorable: 'Favorable',
  uncertain: 'Incertain',
  risky: 'Risqué',
}

/** Our attack over the target's estimated life: ≥ 1.5 favorable, 0.75–1.5 uncertain, < 0.75 risky. */
export const balanceOf = ({ attack, targetLife }: { attack: number; targetLife: number }): Balance => {
  const ratio = targetLife <= 0 ? Number.POSITIVE_INFINITY : attack / targetLife
  if (ratio >= 1.5) return 'favorable'
  if (ratio >= 0.75) return 'uncertain'
  return 'risky'
}

/**
 * Combat attack of the current location's available troops, as the server's `attackContribution` counts it
 * (combat units full, scouts a quarter, no modifier).
 */
export const combatAttack = (troops: { code: TroopCode; count: number }[]): number =>
  troops.reduce((sum, { code, count }) => {
    const characteristic = troop_characteristics[code]
    if (characteristic.combat_role === CombatRole.COMBAT) return sum + count * characteristic.attack_capacity
    if (characteristic.combat_role === CombatRole.SCOUT) return sum + count * characteristic.attack_capacity * 0.25
    return sum
  }, 0)
