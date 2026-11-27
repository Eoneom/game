import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  addAllianceMember,
  emitAllianceJoined,
  getMembershipOrThrow,
  listMemberIds
} from '#app/command/alliance/shared'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceAction,
  AllianceService
} from '#core/alliance/service'
import { AllianceApplication } from '#core/alliance/type'
import { now } from '#shared/time'

/** An application to the officer's or chef's own alliance. */
async function getHandledApplication({
  player_id,
  application_id,
}: {
  player_id: string
  application_id: string
}): Promise<AllianceApplication> {
  const membership = await getMembershipOrThrow(player_id)
  AllianceService.assertCan({
    role: membership.role,
    action: AllianceAction.HANDLE_APPLICATION
  })
  const application = await Factory.getRepository().alliance.findApplication(application_id)
  if (!application || application.alliance_id !== membership.alliance_id) {
    throw new Error(AllianceError.APPLICATION_NOT_FOUND)
  }
  return application
}

export async function acceptAllianceApplication({
  player_id,
  application_id,
}: {
  player_id: string
  application_id: string
}): Promise<void> {
  const {
    alliance_id, applicant_id, member_ids
  } = await runCommand('alliance:application:accept', async () => {
    const repository = Factory.getRepository()
    const accepted_at = now()

    const application = await getHandledApplication({
      player_id,
      application_id,
    })
    const [
      alliance,
      applicant,
      membership
    ] = await Promise.all([
      repository.alliance.get(application.alliance_id),
      repository.player.get(application.player_id),
      repository.alliance.findMembership(application.player_id),
    ])
    AllianceService.assertCanJoin({
      player: applicant,
      alliance,
      membership,
      now: accepted_at
    })

    await addAllianceMember({
      alliance,
      player_id: applicant.id,
      role: AllianceRole.MEMBRE,
      now: accepted_at,
    })

    return {
      alliance_id: alliance.id,
      applicant_id: applicant.id,
      member_ids: await listMemberIds(alliance.id),
    }
  })

  emitAllianceJoined({
    alliance_id,
    player_id: applicant_id,
    member_ids,
  })
}

export async function refuseAllianceApplication({
  player_id,
  application_id,
}: {
  player_id: string
  application_id: string
}): Promise<void> {
  await runCommand('alliance:application:refuse', async () => {
    const application = await getHandledApplication({
      player_id,
      application_id,
    })
    await Factory.getRepository().alliance.deleteApplication(application.id)
  })
}
