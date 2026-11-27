import { Coordinates, TroopCode } from '@eoneom/api-client'

import { TroopTranslations } from '#troop/translations'

type TroopLine = { code: TroopCode; count: number }

export const totalUnits = (troops: readonly TroopLine[]): number =>
  troops.reduce((total, troop) => total + troop.count, 0)

/** « 25 unités », « 1 unité ». */
export const formatUnitCount = (count: number): string => `${count} unité${count > 1 ? 's' : ''}`

/** « Légionnaire × 20 · Intercepteur × 5 » (row tooltips, convoy carriers). */
export const formatTroopLines = (troops: readonly TroopLine[]): string =>
  troops.map(troop => `${TroopTranslations[troop.code].name} × ${troop.count}`).join(' · ')

/** Distance in cells (Manhattan, as `WorldService.getDistance` before its × 10 000 scale). */
export const cellDistance = (origin: Coordinates, destination: Coordinates): number =>
  Math.abs(origin.x - destination.x) + Math.abs(origin.y - destination.y)

/** « 1 case », « 12 cases ». */
export const formatCellDistance = (cells: number): string => `${cells} case${cells > 1 ? 's' : ''}`
