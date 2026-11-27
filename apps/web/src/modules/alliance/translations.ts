import { AllianceRole } from '@eoneom/api-client'

export const AllianceRoleLabels: Record<AllianceRole, string> = {
  [AllianceRole.CHEF]: 'Chef',
  [AllianceRole.OFFICIER]: 'Officier',
  [AllianceRole.MEMBRE]: 'Membre',
}

/** `[TAG] Name` label used on map markers, reports, chat and alliance lists (slice 033). */
export const allianceDisplayName = (name: string, tag: string | null | undefined): string =>
  tag ? `[${tag}] ${name}` : name

/** Officers and the chef handle invitations and applications. */
export const canManageMembers = (role: AllianceRole): boolean =>
  role === AllianceRole.CHEF || role === AllianceRole.OFFICIER

/** The chef kicks anyone else; an officer kicks `membre` only. */
export const canKick = ({ viewer, target }: { viewer: AllianceRole; target: AllianceRole }): boolean =>
  viewer === AllianceRole.CHEF
    ? target !== AllianceRole.CHEF
    : viewer === AllianceRole.OFFICIER && target === AllianceRole.MEMBRE
