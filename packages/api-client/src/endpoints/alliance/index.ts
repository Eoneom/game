import { Fetcher } from '../../fetcher'
import {
  AllianceCreateRequest,
  AllianceCreateResponse,
  AllianceDissolveResponse,
  AllianceLeaveResponse,
  AllianceUpdateDescriptionRequest,
  AllianceUpdateDescriptionResponse
} from './create'
import { AllianceMineResponse } from './mine'
import {
  AllianceSearchRequest,
  AllianceSearchResponse
} from './search'
import {
  AllianceGetRequest,
  AllianceGetResponse
} from './get'
import {
  AllianceAnswerInvitationRequest,
  AllianceAnswerInvitationResponse,
  AllianceInvitationListResponse,
  AllianceInviteRequest,
  AllianceInviteResponse
} from './invitation'
import {
  AllianceApplicationActionResponse,
  AllianceApplicationListResponse,
  AllianceApplicationRequest,
  AllianceApplyRequest,
  AllianceApplyResponse
} from './application'
import {
  AllianceKickRequest,
  AllianceMemberActionResponse,
  AllianceSetRoleRequest,
  AllianceTransferLeadershipRequest
} from './member'

/** Alliances (slice 033). */
export class AllianceEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  create(token: string, body: AllianceCreateRequest): Promise<AllianceCreateResponse> {
    return this.fetcher.post('/alliance', {
      body,
      token
    })
  }

  mine(token: string): Promise<AllianceMineResponse> {
    return this.fetcher.get('/alliance/mine', { token })
  }

  search(token: string, { q }: AllianceSearchRequest): Promise<AllianceSearchResponse> {
    return this.fetcher.get('/alliance', {
      token,
      searchParams: { q }
    })
  }

  get(token: string, { alliance_id }: AllianceGetRequest): Promise<AllianceGetResponse> {
    return this.fetcher.get(`/alliance/${alliance_id}`, { token })
  }

  updateDescription(token: string, body: AllianceUpdateDescriptionRequest): Promise<AllianceUpdateDescriptionResponse> {
    return this.fetcher.put('/alliance/description', {
      body,
      token
    })
  }

  invite(token: string, body: AllianceInviteRequest): Promise<AllianceInviteResponse> {
    return this.fetcher.post('/alliance/invitation', {
      body,
      token
    })
  }

  listInvitations(token: string): Promise<AllianceInvitationListResponse> {
    return this.fetcher.get('/alliance/invitation', { token })
  }

  acceptInvitation(token: string, { invitation_id }: AllianceAnswerInvitationRequest): Promise<AllianceAnswerInvitationResponse> {
    return this.fetcher.put(`/alliance/invitation/${invitation_id}/accept`, { token })
  }

  refuseInvitation(token: string, { invitation_id }: AllianceAnswerInvitationRequest): Promise<AllianceAnswerInvitationResponse> {
    return this.fetcher.put(`/alliance/invitation/${invitation_id}/refuse`, { token })
  }

  apply(token: string, { alliance_id, message }: AllianceApplyRequest): Promise<AllianceApplyResponse> {
    return this.fetcher.post(`/alliance/${alliance_id}/application`, {
      body: { message },
      token
    })
  }

  listApplications(token: string): Promise<AllianceApplicationListResponse> {
    return this.fetcher.get('/alliance/application', { token })
  }

  acceptApplication(token: string, { application_id }: AllianceApplicationRequest): Promise<AllianceApplicationActionResponse> {
    return this.fetcher.put(`/alliance/application/${application_id}/accept`, { token })
  }

  refuseApplication(token: string, { application_id }: AllianceApplicationRequest): Promise<AllianceApplicationActionResponse> {
    return this.fetcher.put(`/alliance/application/${application_id}/refuse`, { token })
  }

  withdrawApplication(token: string, { application_id }: AllianceApplicationRequest): Promise<AllianceApplicationActionResponse> {
    return this.fetcher.delete(`/alliance/application/${application_id}`, { token })
  }

  setRole(token: string, { player_id, role }: AllianceSetRoleRequest): Promise<AllianceMemberActionResponse> {
    return this.fetcher.put(`/alliance/member/${player_id}/role`, {
      body: { role },
      token
    })
  }

  transferLeadership(token: string, body: AllianceTransferLeadershipRequest): Promise<AllianceMemberActionResponse> {
    return this.fetcher.put('/alliance/leader', {
      body,
      token
    })
  }

  kick(token: string, { player_id }: AllianceKickRequest): Promise<AllianceMemberActionResponse> {
    return this.fetcher.delete(`/alliance/member/${player_id}`, { token })
  }

  leave(token: string): Promise<AllianceLeaveResponse> {
    return this.fetcher.post('/alliance/leave', { token })
  }

  dissolve(token: string): Promise<AllianceDissolveResponse> {
    return this.fetcher.delete('/alliance', { token })
  }
}
