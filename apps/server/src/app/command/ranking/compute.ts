import { Factory } from '#adapter/factory'
import { RANKING_COMPUTE_INTERVAL_MS } from '#app/scheduling/intervals'
import { runCommand } from '#command/run'
import {
  buildRankingEntries,
  ScoredRankingPlayer
} from '#core/ranking/build'
import { RANKING_SNAPSHOT_RETENTION_MS } from '#core/ranking/constant/limits'
import { RankingService } from '#core/ranking/service'
import { RankingPlayerAssets } from '#core/ranking/type'
import { now } from '#shared/time'

type PlayerOwned<T> = T & { player_id: string }

/** Groups rows by owner, dropping `player_id`. */
function byPlayer<T>(rows: PlayerOwned<T>[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const {
    player_id, ...rest 
  } of rows) {
    const list = grouped.get(player_id) ?? []
    list.push(rest as unknown as T)
    grouped.set(player_id, list)
  }
  return grouped
}

/**
 * Hourly job `ranking.compute` (slice 034): loads every human player in batched queries, scores and ranks them,
 * writes one snapshot, deletes snapshots older than 7 days, then reschedules itself. All writes share the
 * command transaction.
 */
export async function computeRankings(): Promise<void> {
  return runCommand('ranking:compute', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()
    const logger = Factory.getLogger('app:command:ranking:compute')
    const computed_at = now()

    const [
      players,
      building_rows,
      technology_rows,
      troop_rows,
      defense_rows,
      alliances,
    ] = await Promise.all([
      repository.ranking.listHumanPlayers(),
      repository.ranking.listHumanBuildingLevels(),
      repository.ranking.listHumanTechnologyLevels(),
      repository.ranking.listHumanTroopCounts(),
      repository.ranking.listHumanDefenseCounts(),
      repository.ranking.listAlliances(),
    ])

    const buildings = byPlayer(building_rows)
    const technologies = byPlayer(technology_rows)
    const troops = byPlayer(troop_rows)
    const defenses = byPlayer(defense_rows)

    const scored: ScoredRankingPlayer[] = players.map(player => {
      const assets: RankingPlayerAssets = {
        buildings: buildings.get(player.id) ?? [],
        technologies: technologies.get(player.id) ?? [],
        troops: troops.get(player.id) ?? [],
        defenses: defenses.get(player.id) ?? [],
        military_value: player.military_value,
      }
      return {
        id: player.id,
        name: player.name,
        faction_code: player.faction_code,
        alliance_id: player.alliance_id,
        scores: RankingService.scores(assets),
      }
    })

    const entries = buildRankingEntries({
      players: scored,
      alliances,
    })

    const snapshot = await repository.ranking.createSnapshot({
      computed_at,
      entries,
    })
    const deleted_snapshot_count = await repository.ranking.deleteSnapshotsBefore(computed_at - RANKING_SNAPSHOT_RETENTION_MS)

    logger.info('ranking snapshot written', {
      snapshot_id: snapshot.id,
      player_count: players.length,
      entry_count: entries.length,
      deleted_snapshot_count,
    })

    await job_queue.scheduleRankingCompute({ execute_at: computed_at + RANKING_COMPUTE_INTERVAL_MS })
  })
}
