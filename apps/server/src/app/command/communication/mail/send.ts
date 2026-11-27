import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { assertCommunicationRateLimit } from '#app/command/communication/rate-limit'
import { MAIL_RATE_LIMIT_WINDOW_MS } from '#core/communication/constant/limits'
import { CommunicationError } from '#core/communication/error'
import { MailEntity } from '#core/communication/mail/entity'
import { CommunicationService } from '#core/communication/service'
import { AppEvent } from '#core/events'
import { PlayerEntity } from '#core/player/entity'
import { PlayerError } from '#core/player/error'
import { id } from '#shared/identification'
import { now } from '#shared/time'

interface SendCommunicationMailParams {
  sender_id: string
  recipient_name: unknown
  subject: unknown
  body: unknown
  in_reply_to?: string | null
}

const getRecipient = async (recipient_name: unknown): Promise<PlayerEntity> => {
  if (typeof recipient_name !== 'string' || recipient_name.trim().length === 0) {
    throw new Error(CommunicationError.RECIPIENT_NOT_FOUND)
  }
  try {
    return await Factory.getRepository().player.getByName(recipient_name.trim())
  } catch (err) {
    if (err instanceof Error && err.message === PlayerError.NOT_FOUND) {
      throw new Error(CommunicationError.RECIPIENT_NOT_FOUND)
    }
    throw err
  }
}

export async function sendCommunicationMail({
  sender_id,
  recipient_name,
  subject,
  body,
  in_reply_to,
}: SendCommunicationMailParams): Promise<{ mail_id: string }> {
  const mail = await runCommand('communication:mail:send', async () => {
    const repository = Factory.getRepository()
    const normalized_subject = CommunicationService.normalizeMailSubject(subject)
    const normalized_body = CommunicationService.normalizeMailBody(body)

    const recipient = await getRecipient(recipient_name)
    CommunicationService.assertMailRecipient({
      sender_id,
      recipient
    })

    if (in_reply_to) {
      const replied = await repository.mail.getById(in_reply_to)
      if (!replied.isVisibleTo(sender_id)) {
        throw new Error(CommunicationError.MAIL_NOT_OWNER)
      }
    }

    const blocked = await repository.player_block.isBlocked({
      blocker_id: recipient.id,
      blocked_id: sender_id
    })

    assertCommunicationRateLimit({
      player_id: sender_id,
      scope: 'mail',
      window_ms: MAIL_RATE_LIMIT_WINDOW_MS
    })

    const created = MailEntity.create({
      id: id(),
      sender_id,
      recipient_id: recipient.id,
      subject: normalized_subject,
      body: normalized_body,
      in_reply_to: in_reply_to ?? null,
      delivered: !blocked,
      sent_at: now(),
      read_at: null,
      deleted_by_sender: false,
      deleted_by_recipient: false,
    })
    await repository.mail.create(created)

    return created
  })

  if (mail.delivered) {
    Factory.getEventBus().emit(AppEvent.MailReceived, {
      player_id: mail.recipient_id,
      mail_id: mail.id
    })
  }

  return { mail_id: mail.id }
}
