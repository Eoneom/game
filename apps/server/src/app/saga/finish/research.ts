import { finishTechnologyResearch } from '#app/command/technology/finish-research'

export const sagaFinishResearch = async ({
  player_id,
  technology_id,
  level,
}: {
  player_id: string
  technology_id: string
  level: number
}): Promise<void> => {
  await finishTechnologyResearch({
    player_id,
    technology_id,
    level,
  })
}
