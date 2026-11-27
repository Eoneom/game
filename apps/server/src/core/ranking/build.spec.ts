import {
  buildRankingEntries, ScoredRankingPlayer 
} from '#core/ranking/build'
import { FactionCode } from '#core/faction/constant/code'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'

const player = ({
  id,
  points,
  alliance_id = null,
  faction_code = FactionCode.THE_CONFEDERATION,
}: {
  id: string
  points: number
  alliance_id?: string | null
  faction_code?: FactionCode
}): ScoredRankingPlayer => ({
  id,
  name: id,
  faction_code,
  alliance_id,
  scores: {
    [RankingCategory.GLOBAL]: points,
    [RankingCategory.ECONOMY]: points * 2,
    [RankingCategory.MILITARY]: 0,
  },
})

describe('buildRankingEntries', () => {
  const players = [
    player({
      id: 'p1',
      points: 10,
      alliance_id: 'big'
    }),
    player({
      id: 'p2',
      points: 11,
      alliance_id: 'big'
    }),
    player({
      id: 'p3',
      points: 15,
      alliance_id: 'big'
    }),
    player({
      id: 'p4',
      points: 100,
      alliance_id: 'small'
    }),
    player({
      id: 'p5',
      points: 100,
      alliance_id: 'small'
    }),
  ]
  const entries = buildRankingEntries({
    players,
    alliances: [
      {
        id: 'big',
        name: 'Big'
      },
      {
        id: 'small',
        name: 'Small'
      },
      {
        id: 'empty',
        name: 'Empty'
      },
    ],
  })
  const of = (kind: RankingKind, category: RankingCategory) => entries.filter(entry => entry.kind === kind && entry.category === category)

  it('ranks every player in each category', () => {
    for (const category of Object.values(RankingCategory)) {
      expect(of(RankingKind.PLAYER, category)).toHaveLength(players.length)
    }
    expect(of(RankingKind.PLAYER, RankingCategory.GLOBAL).map(entry => [
      entry.entity_id,
      entry.rank 
    ])).toEqual([
      [
        'p4',
        1 
      ],
      [
        'p5',
        1 
      ],
      [
        'p3',
        3 
      ],
      [
        'p2',
        4 
      ],
      [
        'p1',
        5 
      ],
    ])
    expect(of(RankingKind.PLAYER, RankingCategory.MILITARY).every(entry => entry.rank === 1)).toBe(true)
  })

  it('ranks alliances by the floored average of their members, only from 3 members', () => {
    const alliances = of(RankingKind.ALLIANCE, RankingCategory.GLOBAL)
    expect(alliances).toEqual([
      {
        category: RankingCategory.GLOBAL,
        kind: RankingKind.ALLIANCE,
        entity_id: 'big',
        rank: 1,
        position: 1,
        points: 12,
      } 
    ])
  })

  it('ranks playable factions with at least one human player by their average', () => {
    expect(of(RankingKind.FACTION, RankingCategory.ECONOMY)).toEqual([
      {
        category: RankingCategory.ECONOMY,
        kind: RankingKind.FACTION,
        entity_id: FactionCode.THE_CONFEDERATION,
        rank: 1,
        position: 1,
        points: Math.floor((20 + 22 + 30 + 200 + 200) / 5),
      } 
    ])
  })

  it('never ranks a non-playable faction', () => {
    const with_system_faction = buildRankingEntries({
      players: [
        player({
          id: 'x',
          points: 5,
          faction_code: FactionCode.THE_ASH_LITURGY
        }) 
      ],
      alliances: [],
    })
    expect(with_system_faction.filter(entry => entry.kind === RankingKind.FACTION)).toEqual([])
  })
})
