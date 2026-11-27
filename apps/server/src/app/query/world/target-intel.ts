import { SpyIntelEntry } from '#app/port/repository/report'
import { IntelService } from '#core/intel/service'

export interface TargetIntel {
  report_id: string
  recorded_at: number
  tier: number
  troop_count: number
  defenses_known: boolean
  estimated: { attack: number, life: number }
}

/** Summary of the latest successful spy report on a cell, with its strength estimate (slice 044). */
export const toTargetIntel = (entry: SpyIntelEntry): TargetIntel => {
  const estimate = IntelService.estimateStrength(entry.metadata)
  return {
    report_id: entry.report_id,
    recorded_at: entry.recorded_at,
    tier: entry.metadata.tier,
    troop_count: estimate.troop_count,
    defenses_known: estimate.defenses_known,
    estimated: {
      attack: estimate.attack,
      life: estimate.life
    }
  }
}
