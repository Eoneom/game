import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AbuseReportEntity } from '#core/communication/abuse-report/entity'
import { AbuseReportKind } from '#core/communication/abuse-report/kind'
import { CommunicationError } from '#core/communication/error'
import { CommunicationService } from '#core/communication/service'
import { id } from '#shared/identification'
import { now } from '#shared/time'

export interface CreateCommunicationAbuseReportParams {
  reporter_id: string
  kind: AbuseReportKind
  message_id: string
  reason?: unknown
}

type ReportedMessage = {
  author_id: string
  content: string
}

const getVisibleMail = async ({
  reporter_id,
  message_id
}: {
  reporter_id: string
  message_id: string
}): Promise<ReportedMessage> => {
  const mail = await Factory.getRepository().mail.getById(message_id)
  // Only the recipient of a delivered letter can report it (a deleted letter stays reportable).
  if (mail.recipient_id !== reporter_id || !mail.delivered) {
    throw new Error(CommunicationError.MAIL_NOT_OWNER)
  }
  return {
    author_id: mail.sender_id,
    content: CommunicationService.mailAbuseContent(mail)
  }
}

const getVisibleChatMessage = async ({
  reporter_id,
  message_id
}: {
  reporter_id: string
  message_id: string
}): Promise<ReportedMessage> => {
  const repository = Factory.getRepository()
  const message = await repository.chat_message.getById(message_id)
  const reporter = await repository.player.get(reporter_id)
  if (!CommunicationService.canAccessChannel({
    player: reporter,
    channel_key: message.channel
  })) {
    throw new Error(CommunicationError.CHANNEL_FORBIDDEN)
  }
  return {
    author_id: message.author_id,
    content: message.body
  }
}

/** Stores a content snapshot; reporting the same message twice succeeds without a new row. */
export async function createCommunicationAbuseReport({
  reporter_id,
  kind,
  message_id,
  reason,
}: CreateCommunicationAbuseReportParams): Promise<void> {
  return runCommand('communication:abuse-report:create', async () => {
    const normalized_reason = CommunicationService.normalizeAbuseReason(reason)

    const reported = kind === AbuseReportKind.MAIL
      ? await getVisibleMail({
        reporter_id,
        message_id
      })
      : await getVisibleChatMessage({
        reporter_id,
        message_id
      })

    await Factory.getRepository().abuse_report.createIfAbsent(AbuseReportEntity.create({
      id: id(),
      reporter_id,
      author_id: reported.author_id,
      kind,
      message_id,
      content: reported.content,
      reason: normalized_reason,
      created_at: now(),
    }))
  })
}
