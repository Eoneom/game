import { GenericRepository } from '#app/port/repository/generic'
import { ChatMessageEntity } from '#core/communication/chat/entity'

export type ChatMessageRepository = GenericRepository<ChatMessageEntity> & {
  getById(id: string): Promise<ChatMessageEntity>

  /**
   * Newest first, skipping authors the viewer blocked. `before` is a message id:
   * only older messages are returned (none when it no longer exists).
   */
  listHistory(query: {
    channel_key: string
    viewer_id: string
    before?: string
    limit: number
  }): Promise<ChatMessageEntity[]>

  deleteOlderThan(before: number): Promise<number>
}
