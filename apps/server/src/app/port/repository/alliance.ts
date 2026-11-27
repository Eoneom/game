import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import {
  AllianceApplication,
  AllianceInvitation,
  AllianceMember,
} from '#core/alliance/type'
import { FactionCode } from '#core/faction/constant/code'

/** Alliance tag of a member (for `[TAG] Name` labels). */
export type AllianceTagEntry = {
  player_id: string
  alliance_id: string
  tag: string
}

/** Alliances, members, invitations and applications (slice 033). */
export type AllianceRepository = {
  create(alliance: AllianceEntity): Promise<void>
  get(id: string): Promise<AllianceEntity>
  findById(id: string): Promise<AllianceEntity | null>
  updateDescription(args: { alliance_id: string, description: string }): Promise<void>
  /** Cascades to members, invitations and applications. */
  delete(id: string): Promise<void>
  existsName(name_normalized: string): Promise<boolean>
  existsTag(tag: string): Promise<boolean>
  /** Alliances of `faction_code` whose name or tag starts with `prefix` (case-insensitive), sorted by name. */
  search(args: { faction_code: FactionCode, prefix: string, limit: number }): Promise<AllianceEntity[]>

  addMember(member: AllianceMember): Promise<void>
  removeMember(player_id: string): Promise<void>
  updateMemberRole(args: { player_id: string, role: AllianceRole }): Promise<void>
  findMembership(player_id: string): Promise<AllianceMember | null>
  listMembers(alliance_id: string): Promise<AllianceMember[]>
  countMembers(alliance_id: string): Promise<number>
  listTagsByPlayerIds(player_ids: string[]): Promise<AllianceTagEntry[]>

  createInvitation(invitation: AllianceInvitation): Promise<void>
  findInvitation(id: string): Promise<AllianceInvitation | null>
  /** Invitations to the player that have not expired, newest first. */
  listPendingInvitationsForPlayer(args: { player_id: string, now: number }): Promise<AllianceInvitation[]>
  findPendingInvitation(args: { alliance_id: string, player_id: string, now: number }): Promise<AllianceInvitation | null>
  deleteInvitation(id: string): Promise<void>
  deleteInvitationsForPlayer(player_id: string): Promise<void>

  createApplication(application: AllianceApplication): Promise<void>
  findApplication(id: string): Promise<AllianceApplication | null>
  findApplicationByPlayer(args: { alliance_id: string, player_id: string }): Promise<AllianceApplication | null>
  listApplicationsForAlliance(alliance_id: string): Promise<AllianceApplication[]>
  listApplicationsForPlayer(player_id: string): Promise<AllianceApplication[]>
  deleteApplication(id: string): Promise<void>
  deleteApplicationsForPlayer(player_id: string): Promise<void>
}
