import { describe, expect, it } from 'vitest'
import {
  AllianceMineDataResponse,
  AllianceRole,
  CellType,
  FactionCode,
  OutpostType,
  WorldGetCellsDataResponse,
} from '@eoneom/api-client'

import { describeDestination, resolveDestinationInfo } from '#movement/api/destination'

const viewer = { player_id: 'me', faction_code: FactionCode.THE_CONFEDERATION }
const cell = (x: number, y: number, explored = true) => ({ coordinates: { x, y }, type: CellType.FOREST, explored })

const cells: WorldGetCellsDataResponse = {
  viewer,
  cells: [ cell(1, 1), cell(2, 2), cell(3, 3), cell(4, 4), cell(5, 5), cell(6, 6), cell(7, 7), cell(8, 8, false), cell(9, 9) ],
  settlements: {
    cities: [
      { id: 'c1', name: 'Alpha', player_id: 'me', faction_code: viewer.faction_code, alliance_tag: 'VEIL', coordinates: { x: 1, y: 1 } },
      { id: 'c2', name: 'Bastion', player_id: 'ally', faction_code: viewer.faction_code, alliance_tag: 'VEIL', coordinates: { x: 2, y: 2 } },
      { id: 'c3', name: 'Voisin', player_id: 'stranger', faction_code: viewer.faction_code, alliance_tag: null, coordinates: { x: 3, y: 3 } },
      { id: 'c4', name: 'Brasier', player_id: 'enemy', faction_code: FactionCode.THE_ASH_LITURGY, alliance_tag: 'ABC', coordinates: { x: 4, y: 4 } },
    ],
    outposts: [
      { id: 'o1', player_id: 'me', faction_code: viewer.faction_code, alliance_tag: null, type: OutpostType.PERMANENT, coordinates: { x: 5, y: 5 } },
      { id: 'o2', player_id: 'ally', faction_code: viewer.faction_code, alliance_tag: 'VEIL', type: OutpostType.PERMANENT, coordinates: { x: 6, y: 6 } },
      { id: 'o3', player_id: 'enemy', faction_code: FactionCode.THE_ASH_LITURGY, alliance_tag: null, type: OutpostType.TEMPORARY, coordinates: { x: 7, y: 7 } },
    ],
  },
}

const myAlliance: AllianceMineDataResponse = {
  viewer_player_id: 'me',
  cooldown_until: null,
  alliance: {
    id: 'a1',
    name: 'Les Veilleurs',
    tag: 'VEIL',
    description: '',
    faction_code: FactionCode.THE_CONFEDERATION,
    created_at: 0,
    viewer_role: AllianceRole.MEMBRE,
    members: [
      { player_id: 'me', name: 'Moi', role: AllianceRole.MEMBRE, joined_at: 0, cities: [] },
      { player_id: 'ally', name: 'Allié', role: AllianceRole.CHEF, joined_at: 0, cities: [] },
    ],
  },
}

const kindAt = (x: number, y: number, alliance: AllianceMineDataResponse | null = myAlliance) =>
  resolveDestinationInfo({ coordinates: { x, y }, cells, myAlliance: alliance ?? undefined }).kind

describe('destination resolution (slice 045)', () => {
  it('classifies every destination kind', () => {
    expect(kindAt(8, 8)).toBe('unexplored')
    expect(kindAt(9, 9)).toBe('empty')
    expect(kindAt(1, 1)).toBe('own_city')
    expect(kindAt(5, 5)).toBe('own_outpost')
    expect(kindAt(2, 2)).toBe('allied_city')
    // Allied outposts and same-faction strangers are friendly.
    expect(kindAt(6, 6)).toBe('friendly')
    expect(kindAt(3, 3)).toBe('friendly')
    expect(kindAt(4, 4)).toBe('enemy_city')
    expect(kindAt(7, 7)).toBe('enemy_outpost')
  })

  it('treats an ally\'s city as friendly without alliance data', () => {
    expect(kindAt(2, 2, null)).toBe('friendly')
    expect(kindAt(2, 2, { ...myAlliance, alliance: null })).toBe('friendly')
  })

  it('describes the cell', () => {
    const describe_at = (x: number, y: number) => describeDestination(resolveDestinationInfo({ coordinates: { x, y }, cells, myAlliance }))
    expect(describe_at(4, 4)).toBe('Ville ennemie [ABC] Brasier — Liturgie des cendres')
    expect(describe_at(8, 8)).toBe('Case inexplorée')
    expect(describe_at(5, 5)).toBe('Votre avant-poste')
    expect(describe_at(1, 1)).toBe('Votre ville Alpha')
    expect(describe_at(2, 2)).toBe('Ville alliée [VEIL] Bastion')
    expect(describe_at(9, 9)).toBe('Case vide')
    expect(describe_at(7, 7)).toBe('Avant-poste ennemi — Liturgie des cendres')
  })
})
