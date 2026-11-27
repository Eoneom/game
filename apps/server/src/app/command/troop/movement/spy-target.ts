import {
  resolveAttackTarget,
  ResolvedAttackTarget,
} from '#app/command/troop/movement/attack-target'
import { CombatError } from '#core/combat/error'
import { FactionCode } from '#core/faction/constant/code'
import { IntelError } from '#core/intel/error'
import { Coordinates } from '#core/world/value/coordinates'

/**
 * Spy targets are the attack targets (slice 030): an enemy-faction city, outpost or field stack.
 * Same-faction targets keep `combat:same-faction-attack`; a cell with nothing to spy on is `intel:no-valid-target`.
 */
export async function resolveSpyTarget({
  spy_player_id,
  spy_faction_code,
  destination,
}: {
  spy_player_id: string
  spy_faction_code: FactionCode
  destination: Coordinates
}): Promise<ResolvedAttackTarget> {
  try {
    return await resolveAttackTarget({
      attacker_player_id: spy_player_id,
      attacker_faction_code: spy_faction_code,
      destination,
    })
  } catch (err) {
    if ((err as Error).message === CombatError.NO_VALID_TARGET) {
      throw new Error(IntelError.NO_VALID_TARGET)
    }
    throw err
  }
}
