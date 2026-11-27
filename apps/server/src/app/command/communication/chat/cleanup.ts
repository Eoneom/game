import { Factory } from '#adapter/factory'
import { CHAT_CLEANUP_INTERVAL_MS } from '#app/scheduling/intervals'
import { runCommand } from '#command/run'
import { CHAT_RETENTION_MS } from '#core/communication/constant/limits'
import { now } from '#shared/time'

/** Daily job `communication.chat.cleanup`: old chat messages and letters both sides deleted (slice 032). */
export async function cleanupCommunicationChat(): Promise<void> {
  return runCommand('communication:chat:cleanup', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()
    const logger = Factory.getLogger('app:command:communication:chat:cleanup')
    const cleanup_at = now()

    const deleted_message_count = await repository.chat_message.deleteOlderThan(cleanup_at - CHAT_RETENTION_MS)
    const deleted_mail_count = await repository.mail.deleteDeletedByBoth()

    logger.info('cleaned up chat messages and deleted letters', {
      deleted_message_count,
      deleted_mail_count
    })

    await job_queue.scheduleChatCleanup({ execute_at: cleanup_at + CHAT_CLEANUP_INTERVAL_MS })
  })
}
