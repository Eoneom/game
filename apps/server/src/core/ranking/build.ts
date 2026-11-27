import { FactionCode } from '#core/faction/constant/code'
import { playableFactionCodes } from '#core/faction/constant/playable'
import {
  competitionRank,
  RankCandidate
} from '#core/ranking/competition-rank'
import { RANKING_ALLIANCE_MIN_MEMBERS } from '#core/ranking/constant/limits'
import {
  RankingEntry,
  RankingPlayer,
  RankingScores
} from '#core/ranking/type'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'

export type ScoredRankingPlayer = RankingPlayer & { scores: RankingScores }

type Group = {
  entity_id: string
  name: string
  members: ScoredRankingPlayer[]
}

/** Average of the members' points, rounded down. */
const averagePoints = (members: ScoredRankingPlayer[], category: RankingCategory): number => {
  const total = members.reduce((sum, member) => sum + member.scores[category], 0)
  return Math.floor(total / members.length)
}

const rankKind = ({
  kind,
  candidates_for,
}: {
  kind: RankingKind
  candidates_for: (category: RankingCategory) => RankCandidate[]
}): RankingEntry[] => {
  return Object.values(RankingCategory).flatMap(category => {
    return competitionRank(candidates_for(category)).map(ranked => ({
      category,
      kind,
      entity_id: ranked.entity_id,
      rank: ranked.rank,
      position: ranked.position,
      points: ranked.points,
    }))
  })
}

const rankGroups = (kind: RankingKind, groups: Group[]): RankingEntry[] => rankKind({
  kind,
  candidates_for: category => groups.map(group => ({
    entity_id: group.entity_id,
    name: group.name,
    points: averagePoints(group.members, category),
  })),
})

/**
 * Every entry of one snapshot (slice 034): players in each category, alliances with at least 3 members
 * (average of their members), playable factions with at least one human player (average of their human players).
 * `players` must only hold human players.
 */
export function buildRankingEntries({
  players,
  alliances,
}: {
  players: ScoredRankingPlayer[]
  alliances: { id: string, name: string }[]
}): RankingEntry[] {
  const player_entries = rankKind({
    kind: RankingKind.PLAYER,
    candidates_for: category => players.map(player => ({
      entity_id: player.id,
      name: player.name,
      points: player.scores[category],
    })),
  })

  const members_by_alliance = new Map<string, ScoredRankingPlayer[]>()
  for (const player of players) {
    if (!player.alliance_id) {
      continue
    }
    const members = members_by_alliance.get(player.alliance_id) ?? []
    members.push(player)
    members_by_alliance.set(player.alliance_id, members)
  }
  const alliance_groups: Group[] = alliances
    .map(alliance => ({
      entity_id: alliance.id,
      name: alliance.name,
      members: members_by_alliance.get(alliance.id) ?? [],
    }))
    .filter(group => group.members.length >= RANKING_ALLIANCE_MIN_MEMBERS)

  const faction_groups: Group[] = playableFactionCodes()
    .map((code: FactionCode) => ({
      entity_id: code,
      name: code,
      members: players.filter(player => player.faction_code === code),
    }))
    .filter(group => group.members.length > 0)

  return [
    ...player_entries,
    ...rankGroups(RankingKind.ALLIANCE, alliance_groups),
    ...rankGroups(RankingKind.FACTION, faction_groups),
  ]
}
