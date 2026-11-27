import { competitionRank } from '#core/ranking/competition-rank'

describe('competitionRank', () => {
  it('shares ranks on ties and skips the tied places (1, 2, 2, 4)', () => {
    const ranked = competitionRank([
      {
        entity_id: 'c',
        name: 'Charlie',
        points: 50
      },
      {
        entity_id: 'a',
        name: 'Alpha',
        points: 100
      },
      {
        entity_id: 'd',
        name: 'Delta',
        points: 10
      },
      {
        entity_id: 'b',
        name: 'bravo',
        points: 50
      },
    ])

    expect(ranked.map(entry => [
      entry.entity_id,
      entry.rank,
      entry.position 
    ])).toEqual([
      [
        'a',
        1,
        1 
      ],
      [
        'b',
        2,
        2 
      ],
      [
        'c',
        2,
        3 
      ],
      [
        'd',
        4,
        4 
      ],
    ])
  })

  it('keeps a stable display order by name for equal points', () => {
    const candidates = [
      'Zoé',
      'éloïse',
      'Bruno',
      'Adam' 
    ].map(name => ({
      entity_id: name,
      name,
      points: 7
    }))

    const first = competitionRank(candidates)
    const second = competitionRank([ ...candidates ].reverse())

    expect(first.map(entry => entry.entity_id)).toEqual([
      'Adam',
      'Bruno',
      'éloïse',
      'Zoé' 
    ])
    expect(second).toEqual(first)
    expect(first.every(entry => entry.rank === 1)).toBe(true)
  })
})
