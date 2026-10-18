import { CellType } from '@eoneom/api-client'
import { FactionCode } from '@eoneom/api-client'
import { getCellFillStyle, getSettlementOwnership, terrainLegend } from '#map/helper'

describe('map helper', () => {
  it('maps terrain types to fill colors', () => {
    expect(getCellFillStyle({ type: CellType.FOREST })).toMatch(/^#/)
    expect(getCellFillStyle({ type: CellType.RUINS })).toMatch(/^#/)
    expect(getCellFillStyle({ type: CellType.LAKE })).toMatch(/^#/)
    expect(getCellFillStyle({})).toMatch(/^#/)
  })

  it('terrainLegend lists terrain types', () => {
    expect(terrainLegend.some(e => e.key === CellType.FOREST)).toBe(true)
    expect(terrainLegend.some(e => e.key === CellType.LAKE)).toBe(true)
  })

  it('classifies settlement ownership for the viewer', () => {
    expect(getSettlementOwnership({
      owner_player_id: 'me',
      owner_faction_code: FactionCode.THE_CONFEDERATION,
      viewer_player_id: 'me',
      viewer_faction_code: FactionCode.THE_CONFEDERATION,
    })).toBe('self')
    expect(getSettlementOwnership({
      owner_player_id: 'ally',
      owner_faction_code: FactionCode.THE_CONFEDERATION,
      viewer_player_id: 'me',
      viewer_faction_code: FactionCode.THE_CONFEDERATION,
    })).toBe('ally')
    expect(getSettlementOwnership({
      owner_player_id: 'foe',
      owner_faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      viewer_player_id: 'me',
      viewer_faction_code: FactionCode.THE_CONFEDERATION,
    })).toBe('enemy')
  })
})
