import {
  ALLIANCE_APPLICATION_MESSAGE_MAX_LENGTH,
  ALLIANCE_DESCRIPTION_MAX_LENGTH,
  ALLIANCE_INVITATION_TTL_MS,
  ALLIANCE_LEAVE_COOLDOWN_MS,
  ALLIANCE_NAME_MAX_LENGTH,
  ALLIANCE_NAME_MIN_LENGTH,
  ALLIANCE_TAG_PATTERN,
} from '#core/alliance/constant/limits'
import {
  AllianceRole,
  isAllianceRole,
} from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceInvitation,
  AllianceMember,
} from '#core/alliance/type'
import { PlayerEntity } from '#core/player/entity'

/** Actions gated by role (slice 033 permission matrix). Kicking also depends on the target's role. */
export enum AllianceAction {
  INVITE = 'invite',
  HANDLE_APPLICATION = 'handle-application',
  KICK = 'kick',
  SET_ROLE = 'set-role',
  EDIT_DESCRIPTION = 'edit-description',
  TRANSFER_LEADERSHIP = 'transfer-leadership',
  DISSOLVE = 'dissolve',
}

const PERMISSIONS: Record<AllianceAction, AllianceRole[]> = {
  [AllianceAction.INVITE]: [
    AllianceRole.CHEF,
    AllianceRole.OFFICIER
  ],
  [AllianceAction.HANDLE_APPLICATION]: [
    AllianceRole.CHEF,
    AllianceRole.OFFICIER
  ],
  [AllianceAction.KICK]: [
    AllianceRole.CHEF,
    AllianceRole.OFFICIER
  ],
  [AllianceAction.SET_ROLE]: [ AllianceRole.CHEF ],
  [AllianceAction.EDIT_DESCRIPTION]: [ AllianceRole.CHEF ],
  [AllianceAction.TRANSFER_LEADERSHIP]: [ AllianceRole.CHEF ],
  [AllianceAction.DISSOLVE]: [ AllianceRole.CHEF ],
}

export class AllianceService {
  /** Trimmed name, 3–30 characters. */
  static normalizeName(name: unknown): string {
    const value = typeof name === 'string' ? name.trim() : ''
    if (value.length < ALLIANCE_NAME_MIN_LENGTH || value.length > ALLIANCE_NAME_MAX_LENGTH) {
      throw new Error(AllianceError.NAME_INVALID)
    }
    return value
  }

  /** Case-insensitive uniqueness key of a name. */
  static nameKey(name: string): string {
    return name.trim().toLowerCase()
  }

  /** Uppercased tag, 3–5 characters `[A-Z0-9]`. */
  static normalizeTag(tag: unknown): string {
    const value = typeof tag === 'string' ? tag.trim().toUpperCase() : ''
    if (!ALLIANCE_TAG_PATTERN.test(value)) {
      throw new Error(AllianceError.TAG_INVALID)
    }
    return value
  }

  /** Kept as typed (line breaks matter), 0–1000 characters. */
  static normalizeDescription(description: unknown): string {
    if (description === undefined || description === null) {
      return ''
    }
    if (typeof description !== 'string' || description.length > ALLIANCE_DESCRIPTION_MAX_LENGTH) {
      throw new Error(AllianceError.DESCRIPTION_INVALID)
    }
    return description.trim().length === 0 ? '' : description
  }

  /** Optional application message, trimmed; empty means none; at most 500 characters. */
  static normalizeApplicationMessage(message: unknown): string | null {
    if (message === undefined || message === null) {
      return null
    }
    if (typeof message !== 'string') {
      throw new Error(AllianceError.MESSAGE_INVALID)
    }
    const value = message.trim()
    if (value.length > ALLIANCE_APPLICATION_MESSAGE_MAX_LENGTH) {
      throw new Error(AllianceError.MESSAGE_INVALID)
    }
    return value.length > 0 ? value : null
  }

  /** Promote / demote target: only `officier` or `membre` (the chef changes by transfer). */
  static normalizeAssignableRole(role: unknown): AllianceRole.OFFICIER | AllianceRole.MEMBRE {
    if (!isAllianceRole(role) || role === AllianceRole.CHEF) {
      throw new Error(AllianceError.ROLE_INVALID)
    }
    return role
  }

  static can({
    role,
    action
  }: {
    role: AllianceRole
    action: AllianceAction
  }): boolean {
    return PERMISSIONS[action].includes(role)
  }

  static assertCan({
    role,
    action
  }: {
    role: AllianceRole
    action: AllianceAction
  }): void {
    if (!this.can({
      role,
      action
    })) {
      throw new Error(AllianceError.FORBIDDEN)
    }
  }

  /** The chef kicks anyone but themselves; an officer kicks `membre` only. */
  static assertCanKick({
    actor,
    target
  }: {
    actor: AllianceMember
    target: AllianceMember
  }): void {
    this.assertCan({
      role: actor.role,
      action: AllianceAction.KICK
    })
    if (actor.player_id === target.player_id) {
      throw new Error(AllianceError.FORBIDDEN)
    }
    if (actor.role === AllianceRole.OFFICIER && target.role !== AllianceRole.MEMBRE) {
      throw new Error(AllianceError.FORBIDDEN)
    }
  }

  /** The chef leaves only after transferring leadership (or dissolves when alone). */
  static assertCanLeave({ member }: { member: AllianceMember }): void {
    if (member.role === AllianceRole.CHEF) {
      throw new Error(AllianceError.FORBIDDEN)
    }
  }

  static isCooldownActive({
    alliance_left_at,
    now
  }: {
    alliance_left_at: number | null
    now: number
  }): boolean {
    return alliance_left_at !== null && now < alliance_left_at + ALLIANCE_LEAVE_COOLDOWN_MS
  }

  /** Human player without an alliance, out of cooldown: may create an alliance. */
  static assertCanCreate({
    player,
    membership,
    now
  }: {
    player: PlayerEntity
    membership: AllianceMember | null
    now: number
  }): void {
    if (player.system_controlled) {
      throw new Error(AllianceError.SYSTEM_PLAYER)
    }
    if (membership) {
      throw new Error(AllianceError.ALREADY_MEMBER)
    }
    if (this.isCooldownActive({
      alliance_left_at: player.alliance_left_at,
      now
    })) {
      throw new Error(AllianceError.COOLDOWN)
    }
  }

  /** Accept-time checks: same faction, human, not already in an alliance, cooldown over. */
  static assertCanJoin({
    player,
    alliance,
    membership,
    now
  }: {
    player: PlayerEntity
    alliance: AllianceEntity
    membership: AllianceMember | null
    now: number
  }): void {
    if (player.system_controlled) {
      throw new Error(AllianceError.SYSTEM_PLAYER)
    }
    if (player.faction_code !== alliance.faction_code) {
      throw new Error(AllianceError.FACTION_MISMATCH)
    }
    if (membership) {
      throw new Error(AllianceError.ALREADY_MEMBER)
    }
    if (this.isCooldownActive({
      alliance_left_at: player.alliance_left_at,
      now
    })) {
      throw new Error(AllianceError.COOLDOWN)
    }
  }

  static invitationExpiresAt(created_at: number): number {
    return created_at + ALLIANCE_INVITATION_TTL_MS
  }

  static isInvitationPending({
    invitation,
    now
  }: {
    invitation: AllianceInvitation
    now: number
  }): boolean {
    return invitation.expires_at > now
  }

  /** `[TAG] Name`, or the bare name without an alliance. */
  static displayName({
    name,
    tag
  }: {
    name: string
    tag: string | null | undefined
  }): string {
    return tag ? `[${tag}] ${name}` : name
  }
}
