import { CityListQuery } from '#query/city/list'
import { OutpostListQuery } from '#query/outpost/list'
import { TroopListQuery } from '#query/troop/list'
import { OutpostType } from '#core/outpost/constant/type'
import { TroopRole } from '#core/troop/constant/role'
import { TroopService } from '#core/troop/service'
import { CellEntity } from '#core/world/cell/entity'
import {
  sortCellsByExpansionScore,
  systemExpansionCitySiteScore,
} from '#core/player/system/expansion-cell'
import { OutpostEntity } from '#core/outpost/entity'

export type SettleReadyTemporaryOutpost = {
  outpost: OutpostEntity
  cell: CellEntity
}

export async function listSettleReadyTemporaryOutposts(
  player_id: string,
): Promise<SettleReadyTemporaryOutpost[]> {
  const { cities, count_limit } = await new CityListQuery().run({ player_id })
  if (cities.length >= count_limit) {
    return []
  }

  const { outposts, cells } = await new OutpostListQuery().run({ player_id })
  const candidates: SettleReadyTemporaryOutpost[] = []

  for (let index = 0; index < outposts.length; index += 1) {
    const outpost = outposts[index]
    const cell = cells[index]
    if (outpost.type === OutpostType.PERMANENT || !cell) {
      continue
    }

    const { troops } = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'outpost',
        outpost_id: outpost.id,
      },
    })
    const founder = TroopService.findByRole({
      troops,
      role: TroopRole.FOUNDER,
    })
    if (!founder || founder.count < 1) {
      continue
    }

    candidates.push({
      outpost,
      cell,
    })
  }

  return sortCellsByExpansionScore({
    cells: candidates,
    score: ({ cell }) => systemExpansionCitySiteScore(cell),
  })
}

export async function countSettleReadyTemporaryOutposts(
  player_id: string,
): Promise<number> {
  const ready = await listSettleReadyTemporaryOutposts(player_id)
  return ready.length
}
