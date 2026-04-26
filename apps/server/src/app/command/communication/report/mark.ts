import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CommunicationError } from '#core/communication/error'

export interface CommunicationReportMarkParams {
  report_id: string
  player_id: string
  was_read: boolean
}

export async function markCommunicationReport({
  report_id,
  player_id,
  was_read,
}: CommunicationReportMarkParams): Promise<void> {
  return runCommand('communication:report:mark', async () => {
    const repository = Factory.getRepository()

    const report = await repository.report.getById(report_id)

    if (!report.isOwnedBy(player_id)) {
      throw new Error(CommunicationError.REPORT_NOT_OWNER)
    }

    const updated_report = report.markAs(was_read)

    await repository.report.updateOne(updated_report)
  })
}
