import {
  SPY_SUCCESS_BASE,
  SPY_SUCCESS_MAX,
  SPY_SUCCESS_MIN,
  SPY_SUCCESS_PER_EXTRA_SCOUT,
  SPY_SUCCESS_PER_GAP,
  TroopCode,
  TroopRole,
  troop_role,
} from '@eoneom/api-client'

/** A spy movement carries `scout`-role troops only (slice 030). */
export const isScoutOnlySelection = (troops: { code: TroopCode; count: number }[]): boolean => {
  const sent = troops.filter(troop => troop.count > 0)
  return sent.length > 0 && sent.every(troop => troop_role[troop.code] === TroopRole.SCOUT)
}

const formatPercent = (probability: number): string => `${Math.round(probability * 100)} %`

/**
 * Success odds from the known levels: the target's Détection is unknown, so only the 5 % floor is certain.
 * `best_case` assumes a target without Détection (gap = own Espionnage).
 */
export const spySuccessPreview = ({
  espionage_level,
  scout_count,
}: {
  espionage_level: number
  scout_count: number
}): { floor: number; best_case: number } => {
  const raw = SPY_SUCCESS_BASE
    + SPY_SUCCESS_PER_GAP * espionage_level
    + SPY_SUCCESS_PER_EXTRA_SCOUT * Math.max(0, scout_count - 1)
  return {
    floor: SPY_SUCCESS_MIN,
    // Rounded like the server to drop float noise.
    best_case: Math.round(Math.min(SPY_SUCCESS_MAX, Math.max(SPY_SUCCESS_MIN, raw)) * 1e6) / 1e6,
  }
}

export const formatSpySuccessPreview = (preview: { floor: number; best_case: number }): string =>
  `≥ ${formatPercent(preview.floor)} (jusqu'à ${formatPercent(preview.best_case)} contre une cible sans Détection)`
