import { listSettleReadyTemporaryOutposts } from '#command/player/system/settle-candidates'
import {
  frontierQueueSummary,
  sortFrontierQueue,
  type SystemFrontierQueueEntry,
} from '#core/player/system/frontier'
import {
  sortCellsByExpansionScore,
  systemExpansionBaseCellScore,
  systemExpansionCitySiteScore,
  systemExpansionOutpostResourceScore,
} from '#core/player/system/expansion-cell'
import { OutpostType } from '#core/outpost/constant/type'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { OutpostListQuery } from '#query/outpost/list'
import {
  getWorldViewportForOrigin,
  type SystemTickContext,
} from '#app/query/player/system/system-tick-context'
import type { Coordinates } from '#core/world/value/coordinates'

function sameCoordinates(left: Coordinates, right: Coordinates): boolean {
  return left.x === right.x && left.y === right.y
}

export async function buildSystemFrontierQueue(
  player_id: string,
  tick_context?: SystemTickContext,
): Promise<SystemFrontierQueueEntry[]> {
  const [
    { cities, count_limit },
    settle_ready,
    { outposts, cells },
  ] = await Promise.all([
    new CityListQuery().run({ player_id }),
    listSettleReadyTemporaryOutposts(player_id),
    new OutpostListQuery().run({ player_id }),
  ])
  const can_found_city = cities.length < count_limit
  const base_cell_score = systemExpansionBaseCellScore({ can_found_city })

  const occupied_cell_ids = new Set<string>()
  const origins: Coordinates[] = []

  for (const city of cities) {
    const details = await new CityGetQuery().run({
      city_id: city.id,
      player_id,
    })
    occupied_cell_ids.add(details.cell.id)
    origins.push(details.cell.coordinates)
  }

  outposts.forEach((outpost, index) => {
    const cell = cells[index]
    if (!cell) {
      return
    }
    occupied_cell_ids.add(cell.id)
    origins.push(cell.coordinates)
  })

  const entries: SystemFrontierQueueEntry[] = []

  for (const candidate of settle_ready) {
    if (!can_found_city) {
      continue
    }
    entries.push({
      kind: 'settle',
      coordinates: candidate.cell.coordinates,
      cell_id: candidate.cell.id,
      score: systemExpansionCitySiteScore(candidate.cell),
    })
  }

  const settle_ready_ids = new Set(settle_ready.map(({ outpost }) => outpost.id))
  for (const [
    index,
    outpost,
  ] of outposts.entries()) {
    if (outpost.type === OutpostType.PERMANENT || settle_ready_ids.has(outpost.id)) {
      continue
    }
    const cell = cells[index]
    if (!cell) {
      continue
    }
    entries.push({
      kind: 'make-permanent',
      coordinates: cell.coordinates,
      cell_id: cell.id,
      score: systemExpansionOutpostResourceScore(cell),
    })
  }

  for (const origin of origins) {
    const viewport = await getWorldViewportForOrigin({
      player_id,
      origin,
      context: tick_context,
    })
    const explored = new Set(viewport.explored_cell_ids)
    const base_candidates = viewport.cells.filter(cell => explored.has(cell.id)
      && !occupied_cell_ids.has(cell.id)
      && !sameCoordinates(cell.coordinates, origin))
    const best = sortCellsByExpansionScore({
      cells: base_candidates,
      score: base_cell_score,
    })[0]
    if (!best) {
      continue
    }
    const score = base_cell_score(best)
    if (score <= 0) {
      continue
    }
    entries.push({
      kind: 'base',
      coordinates: best.coordinates,
      cell_id: best.id,
      score,
    })
  }

  const deduped = new Map<string, SystemFrontierQueueEntry>()
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.cell_id}`
    const existing = deduped.get(key)
    if (!existing || entry.score > existing.score) {
      deduped.set(key, entry)
    }
  }

  return sortFrontierQueue([ ...deduped.values() ])
}

export async function summarizeSystemFrontierQueue(
  player_id: string,
  tick_context?: SystemTickContext,
): Promise<{
  frontier_queue: SystemFrontierQueueEntry[]
  frontier_queue_length: number
  frontier_top_score: number | null
}> {
  const frontier_queue = await buildSystemFrontierQueue(player_id, tick_context)
  const summary = frontierQueueSummary(frontier_queue)
  return {
    frontier_queue,
    frontier_queue_length: summary.length,
    frontier_top_score: summary.top_score,
  }
}
