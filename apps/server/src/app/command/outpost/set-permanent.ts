import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostError } from '#core/outpost/error'

export interface OutpostSetPermanentParams {
  outpost_id: string
  player_id: string
}

export async function outpostSetPermanent({
  outpost_id,
  player_id,
}: OutpostSetPermanentParams): Promise<void> {
  return runCommand('outpost:set-permanent', async () => {
    const repository = Factory.getRepository()

    const outpost = await repository.outpost.getById(outpost_id)
    if (!outpost.isOwnedBy(player_id)) {
      throw new Error(OutpostError.NOT_OWNER)
    }

    if (outpost.type === OutpostType.PERMANENT) {
      return
    }

    await repository.outpost.updateOne(outpost.setPermanent())
  })
}
