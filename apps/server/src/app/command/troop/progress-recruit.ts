import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CityError } from '#core/city/error'
import { TroopError } from '#core/troop/error'
import { now } from '#shared/time'

export interface ProgressTroopRecruitmentParams {
  city_id: string
  player_id: string
}

export interface ProgressTroopRecruitmentResult {
  recruit_count: number
}

export async function progressTroopRecruitment({
  city_id,
  player_id,
}: ProgressTroopRecruitmentParams): Promise<ProgressTroopRecruitmentResult> {
  return runCommand('troop:progress-recruit', async () => {
    const repository = Factory.getRepository()

    const [
      city_cell,
      city
    ] = await Promise.all([
      repository.cell.getCityCell({ city_id }),
      repository.city.get(city_id),
    ])

    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const troop = await repository.troop.getInProgress({ cell_id: city_cell.id })

    if (!troop) {
      throw new Error(TroopError.NOT_IN_PROGRESS)
    }

    const updated_troop = troop.progressRecruitment({ progress_time: now() })
    const recruit_count = updated_troop.count - troop.count

    await repository.troop.updateOne(updated_troop)

    return { recruit_count }
  })
}
