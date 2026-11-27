import {
  ALLIANCE_INVITATION_TTL_MS, ALLIANCE_LEAVE_COOLDOWN_MS 
} from '#core/alliance/constant/limits'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceAction,
  AllianceService
} from '#core/alliance/service'
import { AllianceMember } from '#core/alliance/type'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

const member = (role: AllianceRole, player_id: string = role): AllianceMember => ({
  alliance_id: 'a1',
  player_id,
  role,
  joined_at: 0,
})

describe('AllianceService', () => {
  describe('identity', () => {
    it('accepts names of 3 to 30 characters, trimmed', () => {
      expect(AllianceService.normalizeName('  Les Veilleurs ')).toBe('Les Veilleurs')
      expect(() => AllianceService.normalizeName('ab')).toThrow(AllianceError.NAME_INVALID)
      expect(() => AllianceService.normalizeName('x'.repeat(31))).toThrow(AllianceError.NAME_INVALID)
      expect(() => AllianceService.normalizeName(undefined)).toThrow(AllianceError.NAME_INVALID)
    })

    it('compares names case-insensitively', () => {
      expect(AllianceService.nameKey(' Les VEILLEURS')).toBe(AllianceService.nameKey('les veilleurs'))
    })

    it('stores tags uppercase, 3 to 5 characters [A-Z0-9]', () => {
      expect(AllianceService.normalizeTag('ve1l')).toBe('VE1L')
      expect(() => AllianceService.normalizeTag('AB')).toThrow(AllianceError.TAG_INVALID)
      expect(() => AllianceService.normalizeTag('ABCDEF')).toThrow(AllianceError.TAG_INVALID)
      expect(() => AllianceService.normalizeTag('AB-C')).toThrow(AllianceError.TAG_INVALID)
    })

    it('limits the description to 1000 characters and the application message to 500', () => {
      expect(AllianceService.normalizeDescription(undefined)).toBe('')
      expect(AllianceService.normalizeDescription('x'.repeat(1000))).toHaveLength(1000)
      expect(() => AllianceService.normalizeDescription('x'.repeat(1001))).toThrow(AllianceError.DESCRIPTION_INVALID)
      expect(AllianceService.normalizeApplicationMessage('  ')).toBeNull()
      expect(AllianceService.normalizeApplicationMessage(' Bonjour ')).toBe('Bonjour')
      expect(() => AllianceService.normalizeApplicationMessage('x'.repeat(501))).toThrow(AllianceError.MESSAGE_INVALID)
    })

    it('only assigns officier or membre roles', () => {
      expect(AllianceService.normalizeAssignableRole(AllianceRole.OFFICIER)).toBe(AllianceRole.OFFICIER)
      expect(() => AllianceService.normalizeAssignableRole(AllianceRole.CHEF)).toThrow(AllianceError.ROLE_INVALID)
      expect(() => AllianceService.normalizeAssignableRole('admin')).toThrow(AllianceError.ROLE_INVALID)
    })

    it('prefixes names with the tag', () => {
      expect(AllianceService.displayName({
        name: 'Alice',
        tag: 'VEIL'
      })).toBe('[VEIL] Alice')
      expect(AllianceService.displayName({
        name: 'Alice',
        tag: null
      })).toBe('Alice')
    })
  })

  describe('permission matrix', () => {
    it.each([
      [
        AllianceAction.INVITE,
        [
          true,
          true,
          false 
        ] 
      ],
      [
        AllianceAction.HANDLE_APPLICATION,
        [
          true,
          true,
          false 
        ] 
      ],
      [
        AllianceAction.KICK,
        [
          true,
          true,
          false 
        ] 
      ],
      [
        AllianceAction.SET_ROLE,
        [
          true,
          false,
          false 
        ] 
      ],
      [
        AllianceAction.EDIT_DESCRIPTION,
        [
          true,
          false,
          false 
        ] 
      ],
      [
        AllianceAction.TRANSFER_LEADERSHIP,
        [
          true,
          false,
          false 
        ] 
      ],
      [
        AllianceAction.DISSOLVE,
        [
          true,
          false,
          false 
        ] 
      ],
    ] as const)('%s: chef / officier / membre = %o', (action, expected) => {
      expect([
        AllianceRole.CHEF,
        AllianceRole.OFFICIER,
        AllianceRole.MEMBRE
      ].map(role => AllianceService.can({
        role,
        action
      }))).toEqual(expected)
      if (!expected[2]) {
        expect(() => AllianceService.assertCan({
          role: AllianceRole.MEMBRE,
          action
        })).toThrow(AllianceError.FORBIDDEN)
      }
    })

    it('lets the chef kick anyone else and an officer kick members only', () => {
      const chef = member(AllianceRole.CHEF)
      const officer = member(AllianceRole.OFFICIER)
      const other_officer = member(AllianceRole.OFFICIER, 'officier-2')
      const simple = member(AllianceRole.MEMBRE)

      expect(() => AllianceService.assertCanKick({
        actor: chef,
        target: officer
      })).not.toThrow()
      expect(() => AllianceService.assertCanKick({
        actor: officer,
        target: simple
      })).not.toThrow()
      expect(() => AllianceService.assertCanKick({
        actor: officer,
        target: other_officer
      })).toThrow(AllianceError.FORBIDDEN)
      expect(() => AllianceService.assertCanKick({
        actor: officer,
        target: chef
      })).toThrow(AllianceError.FORBIDDEN)
      expect(() => AllianceService.assertCanKick({
        actor: simple,
        target: member(AllianceRole.MEMBRE, 'other')
      })).toThrow(AllianceError.FORBIDDEN)
      expect(() => AllianceService.assertCanKick({
        actor: chef,
        target: chef
      })).toThrow(AllianceError.FORBIDDEN)
    })

    it('keeps the chef until leadership is transferred', () => {
      expect(() => AllianceService.assertCanLeave({ member: member(AllianceRole.CHEF) })).toThrow(AllianceError.FORBIDDEN)
      expect(() => AllianceService.assertCanLeave({ member: member(AllianceRole.OFFICIER) })).not.toThrow()
      expect(() => AllianceService.assertCanLeave({ member: member(AllianceRole.MEMBRE) })).not.toThrow()
    })
  })

  describe('joining', () => {
    const alliance = AllianceEntity.create({
      id: 'a1',
      name: 'Les Veilleurs',
      tag: 'VEIL',
      description: '',
      faction_code: FactionCode.THE_CONFEDERATION,
      created_at: 0,
    })
    const player = (overrides: Partial<Parameters<typeof PlayerEntity.create>[0]> = {}) => PlayerEntity.create({
      id: 'p1',
      name: 'Bob',
      faction_code: FactionCode.THE_CONFEDERATION,
      system_controlled: false,
      ...overrides,
    })
    const now = 10 * ALLIANCE_LEAVE_COOLDOWN_MS

    it('accepts a human of the same faction without alliance', () => {
      expect(() => AllianceService.assertCanJoin({
        player: player(),
        alliance,
        membership: null,
        now
      })).not.toThrow()
    })

    it.each([
      [
        { faction_code: FactionCode.THE_ASH_LITURGY },
        null,
        AllianceError.FACTION_MISMATCH 
      ],
      [
        { system_controlled: true },
        null,
        AllianceError.SYSTEM_PLAYER 
      ],
      [
        {},
        member(AllianceRole.MEMBRE, 'p1'),
        AllianceError.ALREADY_MEMBER 
      ],
      [
        { alliance_left_at: now - ALLIANCE_LEAVE_COOLDOWN_MS + 1 },
        null,
        AllianceError.COOLDOWN 
      ],
    ])('rejects %o / %o with %s', (overrides, membership, error) => {
      expect(() => AllianceService.assertCanJoin({
        player: player(overrides),
        alliance,
        membership,
        now
      })).toThrow(error)
    })

    it('ends the cooldown 24 h after leaving', () => {
      expect(AllianceService.isCooldownActive({
        alliance_left_at: now - ALLIANCE_LEAVE_COOLDOWN_MS,
        now
      })).toBe(false)
      expect(AllianceService.isCooldownActive({
        alliance_left_at: null,
        now
      })).toBe(false)
    })

    it('blocks creation during the cooldown or inside an alliance', () => {
      expect(() => AllianceService.assertCanCreate({
        player: player({ alliance_left_at: now - 1000 }),
        membership: null,
        now
      })).toThrow(AllianceError.COOLDOWN)
      expect(() => AllianceService.assertCanCreate({
        player: player(),
        membership: member(AllianceRole.MEMBRE, 'p1'),
        now
      })).toThrow(AllianceError.ALREADY_MEMBER)
      expect(() => AllianceService.assertCanCreate({
        player: player({ system_controlled: true }),
        membership: null,
        now
      })).toThrow(AllianceError.SYSTEM_PLAYER)
    })

    it('expires invitations after 7 days', () => {
      const expires_at = AllianceService.invitationExpiresAt(1000)
      expect(expires_at).toBe(1000 + ALLIANCE_INVITATION_TTL_MS)
      const invitation = {
        id: 'i1',
        alliance_id: 'a1',
        player_id: 'p1',
        invited_by: 'p0',
        created_at: 1000,
        expires_at
      }
      expect(AllianceService.isInvitationPending({
        invitation,
        now: expires_at - 1
      })).toBe(true)
      expect(AllianceService.isInvitationPending({
        invitation,
        now: expires_at
      })).toBe(false)
    })
  })
})
