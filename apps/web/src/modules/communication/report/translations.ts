import { ReportType } from '@eoneom/api-client'

export const ReportTypeLabels: Record<ReportType, string> = {
  [ReportType.EXPLORATION]: 'Exploration',
  [ReportType.BASE]: 'Base',
  [ReportType.REBASE]: 'Rebase',
  [ReportType.TRANSPORT]: 'Transport',
}
