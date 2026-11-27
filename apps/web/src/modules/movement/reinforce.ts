import { TroopCode, TroopRole, troop_role } from '@eoneom/api-client'

/** A reinforcement carries `combat`-role troops only, at least one (slice 033). */
export const isCombatOnlySelection = (troops: { code: TroopCode; count: number }[]): boolean => {
  const sent = troops.filter(troop => troop.count > 0)
  return sent.length > 0 && sent.every(troop => troop_role[troop.code] === TroopRole.COMBAT)
}
