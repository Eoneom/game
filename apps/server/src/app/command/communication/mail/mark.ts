import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CommunicationError } from '#core/communication/error'
import { now } from '#shared/time'

interface CommunicationMailMarkParams {
  mail_id: string
  player_id: string
  was_read: boolean
}

/** Only the recipient tracks read state. */
export async function markCommunicationMail({
  mail_id,
  player_id,
  was_read,
}: CommunicationMailMarkParams): Promise<void> {
  return runCommand('communication:mail:mark', async () => {
    const repository = Factory.getRepository()

    const mail = await repository.mail.getById(mail_id)
    if (!mail.isVisibleToRecipient(player_id)) {
      throw new Error(CommunicationError.MAIL_NOT_OWNER)
    }

    await repository.mail.updateOne(mail.markAs({
      read: was_read,
      at: now()
    }))
  })
}
