import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'

export interface CommunicationReportMarkAllParams {
  player_id: string
}

export async function markAllCommunicationReports({
  player_id,
}: CommunicationReportMarkAllParams): Promise<void> {
  return runCommand('communication:report:mark-all', async () => {
    const repository = Factory.getRepository()

    await repository.report.markAllAsRead(player_id)
  })
}
