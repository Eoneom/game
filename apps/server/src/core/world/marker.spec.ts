import { FactionCode } from '#core/faction/constant/code'
import { WorldMarkerService } from '#core/world/marker'

describe('WorldMarkerService (slice 044)', () => {
  const viewer = {
    player_id: 'me',
    faction_code: FactionCode.THE_CONFEDERATION,
    alliance_id: 'alliance-1'
  }
  const owner = (overrides: Partial<Parameters<typeof WorldMarkerService.getRelation>[0]['owner']>) => ({
    player_id: 'other',
    faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    alliance_id: null,
    system_controlled: false,
    ...overrides
  })

  describe('getRelation', () => {
    it('applies mine > ally > system > faction > enemy', () => {
      expect(WorldMarkerService.getRelation({
        viewer,
        owner: owner({
          player_id: 'me',
          faction_code: viewer.faction_code,
          alliance_id: 'alliance-1'
        })
      })).toBe('mine')
      expect(WorldMarkerService.getRelation({
        viewer,
        owner: owner({
          faction_code: viewer.faction_code,
          alliance_id: 'alliance-1',
          system_controlled: true
        })
      })).toBe('ally')
      expect(WorldMarkerService.getRelation({
        viewer,
        owner: owner({
          faction_code: viewer.faction_code,
          system_controlled: true
        })
      })).toBe('system')
      expect(WorldMarkerService.getRelation({
        viewer,
        owner: owner({
          faction_code: viewer.faction_code,
          alliance_id: 'alliance-2'
        })
      })).toBe('faction')
      expect(WorldMarkerService.getRelation({
        viewer,
        owner: owner({})
      })).toBe('enemy')
    })

    it('never treats two players without alliance as allies', () => {
      expect(WorldMarkerService.getRelation({
        viewer: {
          ...viewer,
          alliance_id: null
        },
        owner: owner({ faction_code: viewer.faction_code })
      })).toBe('faction')
    })
  })

  describe('getCitySize', () => {
    it.each([
      [
        0,
        1
      ],
      [
        19,
        1
      ],
      [
        20,
        2
      ],
      [
        49,
        2
      ],
      [
        50,
        3
      ],
      [
        79,
        3
      ],
      [
        80,
        4
      ],
      [
        500,
        4
      ]
    ])('%i levels → size %i', (total, size) => {
      expect(WorldMarkerService.getCitySize(total)).toBe(size)
    })
  })
})
