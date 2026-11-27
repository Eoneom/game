import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CommunicationError } from '#core/communication/error'

interface CommunicationMailDeleteParams {
  mail_id: string
  player_id: string
}

/** Soft delete for the caller's side only; the cleanup job purges letters both sides deleted. */
export async function deleteCommunicationMail({
  mail_id,
  player_id,
}: CommunicationMailDeleteParams): Promise<void> {
  return runCommand('communication:mail:delete', async () => {
    const repository = Factory.getRepository()

    const mail = await repository.mail.getById(mail_id)
    if (!mail.isVisibleTo(player_id)) {
      throw new Error(CommunicationError.MAIL_NOT_OWNER)
    }

    await repository.mail.updateOne(mail.deleteFor(player_id))
  })
}
