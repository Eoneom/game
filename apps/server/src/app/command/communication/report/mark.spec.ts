import type { MockInstance } from 'vitest'
import { markCommunicationReport } from './mark'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { id } from '#shared/identification'
import { now } from '#shared/time'
import assert from 'assert'

describe('markCommunicationReport', () => {
  const player_id = id()
  const other_player_id = id()
  const origin = {
    x: 1,
    y: 2,
    sector: 3
  }
  const destination = {
    x: 4,
    y: 5,
    sector: 6
  }
  const resource_coefficient = {
    plastic: 1,
    mushroom: 2,
    plasma: 0
  }
  let report: ReportEntity
  let reportUpdateOne: MockInstance
  let repository: Pick<Repository, 'report'>

  beforeEach(() => {
    report = ReportEntity.create({
      id: id(),
      destination,
      origin,
      player_id,
      resource_coefficient,
      troops: [],
      type: ReportType.BASE,
      recorded_at: now(),
      was_read: false
    })

    reportUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      report: {
        getById: vi.fn().mockResolvedValue(report),
        updateOne: reportUpdateOne
      } as unknown as Repository['report']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent another player from changing the report read status', async () => {
    await assert.rejects(
      () => markCommunicationReport({
        report_id: report.id,
        player_id: other_player_id,
        was_read: true
      }),
      new RegExp(CommunicationError.REPORT_NOT_OWNER)
    )

    assert.strictEqual(reportUpdateOne.mock.calls.length, 0)
  })

  it('should change the report read status', async () => {
    await markCommunicationReport({
      report_id: report.id,
      player_id,
      was_read: true
    })

    assert.strictEqual(report.was_read, false)
    assert.strictEqual(reportUpdateOne.mock.calls.length, 1)
    const updated_report = reportUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_report.was_read, true)
  })
})
