import { GenericRepository } from '#app/port/repository/generic'
import { ReportEntity } from '#core/communication/report/entity'

export type ReportRepository = GenericRepository<ReportEntity> & {
  list(query: {
    player_id: string
    limit: number
    offset: number
  }): Promise<{ reports: ReportEntity[]; total: number }>

  getById(id: string): Promise<ReportEntity>

  count(query: { player_id: string, was_read: boolean }): Promise<number>

  markAllAsRead(player_id: string): Promise<void>
}
