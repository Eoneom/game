import { Factory } from '#adapter/factory'
import { SYSTEM_PLAYER_TICK_INTERVAL_MS } from '#app/scheduling/intervals'
import {
  actForSystemPlayer,
  categoriesForTick,
  prioritizeResearchBeforeUpgrade,
  systemTickExpansionCategories,
} from '#command/player/system/policy'
import { isEmpireProductionReadyForResearch } from '#command/player/system/production'
import { systemTickActions } from '#command/player/system/actions'
import { shouldPrioritizeEconomyForSystemPlayer } from '#command/player/system/storage'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostListQuery } from '#query/outpost/list'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { BuildingListQuery } from '#query/building/list'
import { emitSystemPlayerTickObservability } from '#command/player/system/emit-observability'
import { emitSystemPlayerStatsUpdated } from '#command/player/system/emit-stats'
import { collectSystemPlayerStatsSnapshot } from '#app/query/admin/system-player-stats'
import { now } from '#shared/time'

export async function tickSystemPlayers({ tick_index }: { tick_index: number }): Promise<void> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()
  const logger = Factory.getTickLogger('app:command:player:system:tick')
  const tick_at = now()

  const players = await repository.player.listSystemControlled()
  for (const player of players) {
    try {
      const economy_first = await isSystemPlayerEconomyPriority({ player_id: player.id })
      const { outposts } = await new OutpostListQuery().run({ player_id: player.id })
      const temporary_outpost_count = outposts.filter(
        outpost => outpost.type !== OutpostType.PERMANENT,
      ).length
      const expansion_categories = systemTickExpansionCategories({
        temporary_outpost_count,
      })
      let categories = categoriesForTick(tick_index, {
        economy_first,
        expansion_categories,
      })
      const production_ready = await isEmpireProductionReadyForResearch(player.id)
      if (production_ready) {
        categories = prioritizeResearchBeforeUpgrade(categories)
      }
      const result = await actForSystemPlayer({
        player_id: player.id,
        tick_index,
        actions: systemTickActions,
        categories,
      })
      logger.info('system player tick', {
        player_id: player.id,
        tick_index,
        outcome: result.outcome,
        category: result.outcome === 'success' ? result.category : null,
      })
      if (result.outcome === 'success') {
        emitSystemPlayerTickObservability({
          player_id: player.id,
          player_name: player.name,
          tick_index,
          committed_at: tick_at,
          outcome: 'success',
          attempts: result.attempts,
          category: result.category,
          payload: result.payload,
        })
        const stats = await collectSystemPlayerStatsSnapshot({
          player_id: player.id,
          player_name: player.name,
        })
        emitSystemPlayerStatsUpdated(stats)
      } else {
        emitSystemPlayerTickObservability({
          player_id: player.id,
          player_name: player.name,
          tick_index,
          committed_at: tick_at,
          outcome: 'idle',
          attempts: result.attempts,
        })
      }
    } catch (err) {
      logger.error('system player tick failed', {
        player_id: player.id,
        tick_index,
        err
      })
      emitSystemPlayerTickObservability({
        player_id: player.id,
        player_name: player.name,
        tick_index,
        committed_at: tick_at,
        outcome: 'error',
        attempts: [],
        error: err,
      })
    }
  }

  await job_queue.scheduleSystemPlayerTick({
    execute_at: tick_at + SYSTEM_PLAYER_TICK_INTERVAL_MS,
    tick_index: tick_index + 1
  })
}

async function isSystemPlayerEconomyPriority({ player_id }: { player_id: string }): Promise<boolean> {
  const { cities } = await new CityListQuery().run({ player_id })
  const city = cities[0]
  if (!city) {
    return true
  }

  const [
    city_details,
    building_list,
  ] = await Promise.all([
    new CityGetQuery().run({
      city_id: city.id,
      player_id,
    }),
    new BuildingListQuery().run({
      city_id: city.id,
      player_id,
    }),
  ])

  return shouldPrioritizeEconomyForSystemPlayer({
    production_energy_ratio: city_details.production_energy_ratio,
    resource_stock: city_details.resource_stock,
    warehouses_capacity: city_details.warehouses_capacity,
    buildings: building_list.buildings,
  })
}
