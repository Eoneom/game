import { GenericQuery } from '#query/generic'
import { AllianceEntity } from '#core/alliance/entity'
import {
  AllianceAction,
  AllianceService
} from '#core/alliance/service'
import { AllianceApplication } from '#core/alliance/type'

interface AllianceApplicationListQueryRequest {
  player_id: string
}

type AllianceReceivedApplication = {
  application: AllianceApplication
  player_name: string
}

type AllianceSentApplication = {
  application: AllianceApplication
  alliance: AllianceEntity
}

interface AllianceApplicationListQueryResponse {
  /** Pending applications to the caller's alliance (officers and chef only, empty otherwise). */
  received: AllianceReceivedApplication[]
  /** The caller's own pending applications. */
  sent: AllianceSentApplication[]
}

export class AllianceApplicationListQuery extends GenericQuery<AllianceApplicationListQueryRequest, AllianceApplicationListQueryResponse> {
  constructor() {
    super({ name: 'alliance:application:list' })
  }

  protected async get({ player_id }: AllianceApplicationListQueryRequest): Promise<AllianceApplicationListQueryResponse> {
    const [
      membership,
      own_applications
    ] = await Promise.all([
      this.repository.alliance.findMembership(player_id),
      this.repository.alliance.listApplicationsForPlayer(player_id),
    ])

    const can_handle = membership !== null && AllianceService.can({
      role: membership.role,
      action: AllianceAction.HANDLE_APPLICATION
    })
    const received_applications = can_handle && membership
      ? await this.repository.alliance.listApplicationsForAlliance(membership.alliance_id)
      : []

    const [
      applicants,
      alliances
    ] = await Promise.all([
      this.repository.player.listByIds(received_applications.map(application => application.player_id)),
      Promise.all(own_applications.map(application => this.repository.alliance.findById(application.alliance_id))),
    ])
    const applicant_name = new Map(applicants.map(applicant => [
      applicant.id,
      applicant.name
    ]))

    return {
      received: received_applications.map(application => ({
        application,
        player_name: applicant_name.get(application.player_id) ?? '',
      })),
      sent: own_applications.flatMap((application, index): AllianceSentApplication[] => {
        const alliance = alliances[index]
        return alliance
          ? [
            {
              application,
              alliance
            }
          ]
          : []
      }),
    }
  }
}
