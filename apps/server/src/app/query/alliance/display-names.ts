import { Factory } from '#adapter/factory'
import { AllianceService } from '#core/alliance/service'

/** `[TAG] Name` labels of players, keyed by id (slice 033); unknown ids are left out. */
export async function getPlayerDisplayNames(player_ids: string[]): Promise<Map<string, string>> {
  const ids = [ ...new Set(player_ids) ]
  if (ids.length === 0) {
    return new Map()
  }
  const repository = Factory.getRepository()
  const [
    players,
    tags
  ] = await Promise.all([
    repository.player.listByIds(ids),
    repository.alliance.listTagsByPlayerIds(ids),
  ])
  const tag_by_player_id = new Map(tags.map(entry => [
    entry.player_id,
    entry.tag
  ]))
  return new Map(players.map(player => [
    player.id,
    AllianceService.displayName({
      name: player.name,
      tag: tag_by_player_id.get(player.id)
    })
  ]))
}
