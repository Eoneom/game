import { TroopCode } from '#core/troop/constant/code'
import { TroopService } from '#core/troop/service'
import { FactionCode } from '#core/faction/constant/code'
import { TroopError } from '#core/troop/error'
import assert from 'assert'

describe('TroopService recruitment', () => {
  describe('progressRecruitment', () => {
    it('should finish recruitment when progress time is greater than finish time', () => {
      const result = TroopService.progressRecruitment({
        count: 0,
        recruitment: {
          finish_at: 10,
          last_progress: 5,
          remaining_count: 10,
          started_at: 0
        },
        progress_time: 11
      })

      assert.strictEqual(result.count, 10)
      assert.strictEqual(result.recruitment, null)
    })

    describe('partial progress', () => {
      it('should progress a bit based on progress time, remaining troops and finish time', () => {
        const recruitment = {
          finish_at: 20,
          last_progress: 10,
          remaining_count: 10,
          started_at: 0
        }
        const progress_time = 15
        const result = TroopService.progressRecruitment({
          count: 0,
          recruitment,
          progress_time
        })

        assert.strictEqual(result.count, 5)
        assert.ok(result.recruitment)
        assert.strictEqual(result.recruitment.finish_at, recruitment.finish_at)
        assert.strictEqual(result.recruitment.last_progress, progress_time)
        assert.strictEqual(result.recruitment.remaining_count, 5)
        assert.strictEqual(result.recruitment.started_at, 0)
      })

      it('should not recruit troop before finish time', () => {
        const recruitment = {
          finish_at: 3000,
          last_progress: 0,
          remaining_count: 1,
          started_at: 0
        }
        const progress_time = 1000
        const result = TroopService.progressRecruitment({
          count: 0,
          recruitment,
          progress_time
        })

        assert.strictEqual(result.count, 0)
        assert.ok(result.recruitment)
        assert.strictEqual(result.recruitment.finish_at, recruitment.finish_at)
        assert.strictEqual(result.recruitment.last_progress, 0)
        assert.strictEqual(result.recruitment.remaining_count, 1)
        assert.strictEqual(result.recruitment.started_at, 0)
      })
    })
  })

  describe('launchRecruitment', () => {
    it('should set started_at to recruitment_time', () => {
      const t = 1_700_000_000_000
      const recruitment = TroopService.launchRecruitment({
        duration: 60,
        count: 5,
        recruitment_time: t
      })
      assert.strictEqual(recruitment.started_at, t)
      assert.strictEqual(recruitment.last_progress, t)
      assert.strictEqual(recruitment.finish_at, t + 60_000)
      assert.strictEqual(recruitment.remaining_count, 5)
    })
  })

  describe('init', () => {
    it('creates one troop per roster code', () => {
      const troops = TroopService.init({
        player_id: 'p',
        cell_id: 'c',
        faction_code: FactionCode.THE_CONFEDERATION
      })
      assert.strictEqual(troops.length, Object.values(TroopCode).length)
    })
  })

  describe('assertInRoster', () => {
    it('rejects a troop code that is not in the faction roster', () => {
      assert.throws(
        () => TroopService.assertInRoster({
          faction_code: FactionCode.THE_CONFEDERATION,
          troop_code: 'not_a_unit' as TroopCode
        }),
        new RegExp(TroopError.NOT_IN_FACTION_ROSTER)
      )
    })
  })
})
