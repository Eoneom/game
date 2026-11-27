import type { MockInstance } from 'vitest'
import { Factory } from '#adapter/factory'
import { AppEventBus } from '#app/event-bus'
import { AllianceRepository } from '#app/port/repository/alliance'
import { Repository } from '#app/port/repository/generic'
import { createAlliance } from '#app/command/alliance/create'
import { inviteToAlliance } from '#app/command/alliance/invite'
import {
  acceptAllianceInvitation,
  refuseAllianceInvitation
} from '#app/command/alliance/answer-invitation'
import {
  applyToAlliance,
  withdrawAllianceApplication
} from '#app/command/alliance/apply'
import {
  acceptAllianceApplication,
  refuseAllianceApplication
} from '#app/command/alliance/answer-application'
import {
  setAllianceMemberRole,
  transferAllianceLeadership
} from '#app/command/alliance/roles'
import {
  dissolveAlliance,
  kickAllianceMember,
  leaveAlliance
} from '#app/command/alliance/depart'
import { updateAllianceDescription } from '#app/command/alliance/update-description'
import {
  ALLIANCE_INVITATION_TTL_MS,
  ALLIANCE_LEAVE_COOLDOWN_MS
} from '#core/alliance/constant/limits'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceApplication,
  AllianceInvitation,
  AllianceMember
} from '#core/alliance/type'
import { AppEvent } from '#core/events'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import { PlayerError } from '#core/player/error'
import * as time from '#shared/time'
import * as returnHome from '#app/command/troop/reinforcement/return-home'

/** In-memory alliance tables (same semantics as the Postgres repository). */
function createAllianceStore(): AllianceRepository & {
  alliances: AllianceEntity[]
  members: AllianceMember[]
  invitations: AllianceInvitation[]
  applications: AllianceApplication[]
  } {
  const store = {
    alliances: [] as AllianceEntity[],
    members: [] as AllianceMember[],
    invitations: [] as AllianceInvitation[],
    applications: [] as AllianceApplication[],
  }
  const alliance = (id: string) => store.alliances.find(candidate => candidate.id === id) ?? null
  return Object.assign(store, {
    create: async (entity: AllianceEntity) => {
      store.alliances.push(entity)
    },
    findById: async (id: string) => alliance(id),
    get: async (id: string) => {
      const found = alliance(id)
      if (!found) throw new Error(AllianceError.NOT_FOUND)
      return found
    },
    updateDescription: async ({
      alliance_id, description
    }: { alliance_id: string, description: string }) => {
      store.alliances = store.alliances.map(candidate => candidate.id === alliance_id ? candidate.withDescription(description) : candidate)
    },
    delete: async (id: string) => {
      store.alliances = store.alliances.filter(candidate => candidate.id !== id)
      store.members = store.members.filter(candidate => candidate.alliance_id !== id)
      store.invitations = store.invitations.filter(candidate => candidate.alliance_id !== id)
      store.applications = store.applications.filter(candidate => candidate.alliance_id !== id)
    },
    existsName: async (key: string) => store.alliances.some(candidate => candidate.name.toLowerCase() === key),
    existsTag: async (tag: string) => store.alliances.some(candidate => candidate.tag === tag),
    search: async () => store.alliances,
    addMember: async (member: AllianceMember) => {
      if (store.members.some(candidate => candidate.player_id === member.player_id)) throw new Error('unique violation')
      store.members.push(member)
    },
    removeMember: async (player_id: string) => {
      store.members = store.members.filter(candidate => candidate.player_id !== player_id)
    },
    updateMemberRole: async ({
      player_id, role
    }: { player_id: string, role: AllianceRole }) => {
      store.members = store.members.map(candidate => candidate.player_id === player_id
        ? {
          ...candidate,
          role
        }
        : candidate)
    },
    findMembership: async (player_id: string) => store.members.find(candidate => candidate.player_id === player_id) ?? null,
    listMembers: async (alliance_id: string) => store.members.filter(candidate => candidate.alliance_id === alliance_id),
    countMembers: async (alliance_id: string) => store.members.filter(candidate => candidate.alliance_id === alliance_id).length,
    listTagsByPlayerIds: async (ids: string[]) => store.members
      .filter(candidate => ids.includes(candidate.player_id))
      .map(candidate => ({
        player_id: candidate.player_id,
        alliance_id: candidate.alliance_id,
        tag: alliance(candidate.alliance_id)?.tag ?? ''
      })),
    createInvitation: async (invitation: AllianceInvitation) => {
      store.invitations.push(invitation)
    },
    findInvitation: async (id: string) => store.invitations.find(candidate => candidate.id === id) ?? null,
    listPendingInvitationsForPlayer: async ({
      player_id, now
    }: { player_id: string, now: number }) => store.invitations.filter(candidate => candidate.player_id === player_id && candidate.expires_at > now),
    findPendingInvitation: async ({
      alliance_id, player_id, now
    }: { alliance_id: string, player_id: string, now: number }) => store.invitations.find(candidate => candidate.alliance_id === alliance_id && candidate.player_id === player_id && candidate.expires_at > now) ?? null,
    deleteInvitation: async (id: string) => {
      store.invitations = store.invitations.filter(candidate => candidate.id !== id)
    },
    deleteInvitationsForPlayer: async (player_id: string) => {
      store.invitations = store.invitations.filter(candidate => candidate.player_id !== player_id)
    },
    createApplication: async (application: AllianceApplication) => {
      store.applications.push(application)
    },
    findApplication: async (id: string) => store.applications.find(candidate => candidate.id === id) ?? null,
    findApplicationByPlayer: async ({
      alliance_id, player_id
    }: { alliance_id: string, player_id: string }) => store.applications.find(candidate => candidate.alliance_id === alliance_id && candidate.player_id === player_id) ?? null,
    listApplicationsForAlliance: async (alliance_id: string) => store.applications.filter(candidate => candidate.alliance_id === alliance_id),
    listApplicationsForPlayer: async (player_id: string) => store.applications.filter(candidate => candidate.player_id === player_id),
    deleteApplication: async (id: string) => {
      store.applications = store.applications.filter(candidate => candidate.id !== id)
    },
    deleteApplicationsForPlayer: async (player_id: string) => {
      store.applications = store.applications.filter(candidate => candidate.player_id !== player_id)
    },
  })
}

describe('alliance lifecycle (slice 033)', () => {
  const player = (name: string, faction_code = FactionCode.THE_CONFEDERATION, system_controlled = false) => PlayerEntity.initPlayer({
    name,
    faction_code,
    system_controlled
  })

  let players: PlayerEntity[]
  let alice: PlayerEntity
  let bob: PlayerEntity
  let carol: PlayerEntity
  let dave: PlayerEntity
  let stranger: PlayerEntity
  let horde: PlayerEntity
  let store: ReturnType<typeof createAllianceStore>
  let clock: number
  let emit: MockInstance
  let setAllianceLeftAt: MockInstance
  let deleteByChannel: MockInstance

  beforeEach(() => {
    alice = player('Alice')
    bob = player('Bob')
    carol = player('Carol')
    dave = player('Dave')
    stranger = player('Zed', FactionCode.THE_ASH_LITURGY)
    horde = player('Horde', FactionCode.THE_CONFEDERATION, true)
    players = [
      alice,
      bob,
      carol,
      dave,
      stranger,
      horde 
    ]
    store = createAllianceStore()
    clock = 1_000_000_000
    emit = vi.fn()
    setAllianceLeftAt = vi.fn(async ({
      player_id, left_at
    }: { player_id: string, left_at: number }) => {
      players = players.map(candidate => candidate.id === player_id
        ? PlayerEntity.create({
          ...candidate,
          alliance_left_at: left_at
        })
        : candidate)
    })
    deleteByChannel = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(time, 'now').mockImplementation(() => clock)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn(async (id: string) => {
          const found = players.find(candidate => candidate.id === id)
          if (!found) throw new Error(PlayerError.NOT_FOUND)
          return found
        }),
        getByName: vi.fn(async (name: string) => {
          const found = players.find(candidate => candidate.name === name)
          if (!found) throw new Error(PlayerError.NOT_FOUND)
          return found
        }),
        setAllianceLeftAt,
      },
      alliance: store,
      chat_message: { deleteByChannel },
      // No stationed troops: reinforcement returns are covered by return-home.spec.ts.
      city: { list: vi.fn().mockResolvedValue([]) },
      troop: { listStationedAbroad: vi.fn().mockResolvedValue([]) },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const found = async (chef = alice) => {
    const { alliance_id } = await createAlliance({
      player_id: chef.id,
      name: 'Les Veilleurs',
      tag: 'veil',
      description: 'Ensemble'
    })
    return alliance_id
  }

  const join = async (alliance_id: string, recruit: PlayerEntity, chef = alice) => {
    await inviteToAlliance({
      player_id: chef.id,
      player_name: recruit.name
    })
    const invitation = store.invitations.find(candidate => candidate.player_id === recruit.id && candidate.alliance_id === alliance_id)
    await acceptAllianceInvitation({
      player_id: recruit.id,
      invitation_id: invitation!.id
    })
  }

  const roleOf = (target: PlayerEntity) => store.members.find(candidate => candidate.player_id === target.id)?.role

  describe('create', () => {
    it('makes the creator chef of an alliance of their faction', async () => {
      const alliance_id = await found()

      expect(store.alliances[0]).toMatchObject({
        id: alliance_id,
        name: 'Les Veilleurs',
        tag: 'VEIL',
        description: 'Ensemble',
        faction_code: FactionCode.THE_CONFEDERATION
      })
      expect(roleOf(alice)).toBe(AllianceRole.CHEF)
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceJoined, {
        player_id: alice.id,
        alliance_id
      })
    })

    it('rejects a taken name (case-insensitive) or tag', async () => {
      await found()
      await expect(createAlliance({
        player_id: bob.id,
        name: 'LES VEILLEURS',
        tag: 'OTHER'
      })).rejects.toThrow(AllianceError.NAME_TAKEN)
      await expect(createAlliance({
        player_id: bob.id,
        name: 'Autre nom',
        tag: 'VEIL'
      })).rejects.toThrow(AllianceError.TAG_TAKEN)
    })

    it('rejects a member and a system player', async () => {
      await found()
      await expect(createAlliance({
        player_id: alice.id,
        name: 'Deuxième',
        tag: 'TWO'
      })).rejects.toThrow(AllianceError.ALREADY_MEMBER)
      await expect(createAlliance({
        player_id: horde.id,
        name: 'La Horde',
        tag: 'HRD'
      })).rejects.toThrow(AllianceError.SYSTEM_PLAYER)
    })
  })

  describe('invitations', () => {
    it('lets an officer invite, the player accept, and cancels their other pending invitations and applications', async () => {
      const alliance_id = await found()
      store.alliances.push(AllianceEntity.create({
        id: 'other',
        name: 'Les Autres',
        tag: 'AUTR',
        description: '',
        faction_code: FactionCode.THE_CONFEDERATION,
        created_at: 0
      }))
      store.members.push({
        alliance_id: 'other',
        player_id: dave.id,
        role: AllianceRole.CHEF,
        joined_at: 0
      })
      await inviteToAlliance({
        player_id: dave.id,
        player_name: 'Bob'
      })
      await applyToAlliance({
        player_id: bob.id,
        alliance_id: 'other'
      })

      const { invitation_id } = await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Bob'
      })
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceInvitationReceived, {
        player_id: bob.id,
        invitation_id,
        alliance_id
      })
      expect(store.invitations.find(candidate => candidate.id === invitation_id)?.expires_at).toBe(clock + ALLIANCE_INVITATION_TTL_MS)

      await acceptAllianceInvitation({
        player_id: bob.id,
        invitation_id
      })

      expect(roleOf(bob)).toBe(AllianceRole.MEMBRE)
      expect(store.invitations.filter(candidate => candidate.player_id === bob.id)).toEqual([])
      expect(store.applications.filter(candidate => candidate.player_id === bob.id)).toEqual([])
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceJoined, {
        player_id: bob.id,
        alliance_id
      })
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceUpdated, {
        alliance_id,
        player_ids: [
          alice.id,
          bob.id 
        ]
      })
    })

    it('returns the pending invitation when inviting twice', async () => {
      await found()
      const first = await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Bob'
      })
      const second = await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Bob'
      })
      expect(second.invitation_id).toBe(first.invitation_id)
      expect(store.invitations).toHaveLength(1)
    })

    it('rejects an invitation from a membre, to another faction, to a system player or to an unknown name', async () => {
      const alliance_id = await found()
      await join(alliance_id, bob)

      await expect(inviteToAlliance({
        player_id: bob.id,
        player_name: 'Carol'
      })).rejects.toThrow(AllianceError.FORBIDDEN)
      await expect(inviteToAlliance({
        player_id: alice.id,
        player_name: 'Zed'
      })).rejects.toThrow(AllianceError.FACTION_MISMATCH)
      await expect(inviteToAlliance({
        player_id: alice.id,
        player_name: 'Horde'
      })).rejects.toThrow(AllianceError.SYSTEM_PLAYER)
      await expect(inviteToAlliance({
        player_id: alice.id,
        player_name: 'Personne'
      })).rejects.toThrow(PlayerError.NOT_FOUND)
      await expect(inviteToAlliance({
        player_id: carol.id,
        player_name: 'Dave'
      })).rejects.toThrow(AllianceError.NOT_MEMBER)
    })

    it('expires after 7 days', async () => {
      await found()
      const { invitation_id } = await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Bob'
      })
      clock += ALLIANCE_INVITATION_TTL_MS

      await expect(acceptAllianceInvitation({
        player_id: bob.id,
        invitation_id
      })).rejects.toThrow(AllianceError.INVITATION_NOT_FOUND)
    })

    it('can only be answered by the invited player, and refusing deletes it', async () => {
      await found()
      const { invitation_id } = await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Bob'
      })
      await expect(acceptAllianceInvitation({
        player_id: carol.id,
        invitation_id
      })).rejects.toThrow(AllianceError.INVITATION_NOT_FOUND)

      await refuseAllianceInvitation({
        player_id: bob.id,
        invitation_id
      })
      expect(store.invitations).toEqual([])
      expect(roleOf(bob)).toBeUndefined()
    })

    it('checks membership again at accept time', async () => {
      const alliance_id = await found()
      const { invitation_id } = await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Bob'
      })
      store.members.push({
        alliance_id: 'elsewhere',
        player_id: bob.id,
        role: AllianceRole.MEMBRE,
        joined_at: 0
      })
      await expect(acceptAllianceInvitation({
        player_id: bob.id,
        invitation_id
      })).rejects.toThrow(AllianceError.ALREADY_MEMBER)
      expect(store.members.filter(candidate => candidate.alliance_id === alliance_id)).toHaveLength(1)
    })
  })

  describe('applications', () => {
    it('notifies the chef and officers, and an officer accepts', async () => {
      const alliance_id = await found()
      await join(alliance_id, carol)
      await setAllianceMemberRole({
        player_id: alice.id,
        target_player_id: carol.id,
        role: AllianceRole.OFFICIER
      })

      const { application_id } = await applyToAlliance({
        player_id: bob.id,
        alliance_id,
        message: ' Bonjour '
      })
      expect(store.applications[0].message).toBe('Bonjour')
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceApplicationReceived, {
        player_ids: [
          alice.id,
          carol.id 
        ],
        application_id,
        alliance_id
      })

      await acceptAllianceApplication({
        player_id: carol.id,
        application_id
      })
      expect(roleOf(bob)).toBe(AllianceRole.MEMBRE)
      expect(store.applications).toEqual([])
    })

    it('rejects another faction, a long message, a membre handling it, and lets the applicant withdraw', async () => {
      const alliance_id = await found()
      await join(alliance_id, carol)

      await expect(applyToAlliance({
        player_id: stranger.id,
        alliance_id
      })).rejects.toThrow(AllianceError.FACTION_MISMATCH)
      await expect(applyToAlliance({
        player_id: bob.id,
        alliance_id,
        message: 'x'.repeat(501)
      })).rejects.toThrow(AllianceError.MESSAGE_INVALID)

      const { application_id } = await applyToAlliance({
        player_id: bob.id,
        alliance_id
      })
      await expect(acceptAllianceApplication({
        player_id: carol.id,
        application_id
      })).rejects.toThrow(AllianceError.FORBIDDEN)
      await expect(withdrawAllianceApplication({
        player_id: carol.id,
        application_id
      })).rejects.toThrow(AllianceError.APPLICATION_NOT_FOUND)

      await withdrawAllianceApplication({
        player_id: bob.id,
        application_id
      })
      expect(store.applications).toEqual([])
    })

    it('refuses an application', async () => {
      const alliance_id = await found()
      const { application_id } = await applyToAlliance({
        player_id: bob.id,
        alliance_id
      })
      await refuseAllianceApplication({
        player_id: alice.id,
        application_id
      })
      expect(store.applications).toEqual([])
      expect(roleOf(bob)).toBeUndefined()
    })
  })

  describe('roles', () => {
    it('keeps exactly one chef through a leadership transfer', async () => {
      const alliance_id = await found()
      await join(alliance_id, bob)

      await expect(transferAllianceLeadership({
        player_id: bob.id,
        target_player_id: alice.id
      })).rejects.toThrow(AllianceError.FORBIDDEN)

      await transferAllianceLeadership({
        player_id: alice.id,
        target_player_id: bob.id
      })
      expect(roleOf(bob)).toBe(AllianceRole.CHEF)
      expect(roleOf(alice)).toBe(AllianceRole.OFFICIER)
      expect(store.members.filter(candidate => candidate.role === AllianceRole.CHEF)).toHaveLength(1)
    })

    it('lets only the chef promote, demote and edit the description', async () => {
      const alliance_id = await found()
      await join(alliance_id, bob)
      await join(alliance_id, carol)

      await setAllianceMemberRole({
        player_id: alice.id,
        target_player_id: bob.id,
        role: AllianceRole.OFFICIER
      })
      await expect(setAllianceMemberRole({
        player_id: bob.id,
        target_player_id: carol.id,
        role: AllianceRole.OFFICIER
      })).rejects.toThrow(AllianceError.FORBIDDEN)
      await expect(setAllianceMemberRole({
        player_id: alice.id,
        target_player_id: carol.id,
        role: AllianceRole.CHEF
      })).rejects.toThrow(AllianceError.ROLE_INVALID)
      await expect(updateAllianceDescription({
        player_id: bob.id,
        description: 'Prise de pouvoir'
      })).rejects.toThrow(AllianceError.FORBIDDEN)

      await updateAllianceDescription({
        player_id: alice.id,
        description: 'Nouvelle description'
      })
      expect(store.alliances[0].description).toBe('Nouvelle description')
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceUpdated, {
        alliance_id,
        player_ids: [
          alice.id,
          bob.id,
          carol.id 
        ]
      })
    })
  })

  describe('departures and cooldown', () => {
    it('starts the 24 h cooldown on a voluntary leave', async () => {
      const alliance_id = await found()
      await join(alliance_id, bob)

      await leaveAlliance({ player_id: bob.id })

      expect(roleOf(bob)).toBeUndefined()
      expect(setAllianceLeftAt).toHaveBeenCalledWith({
        player_id: bob.id,
        left_at: clock
      })
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceLeft, {
        player_id: bob.id,
        alliance_id,
        reason: 'leave'
      })
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceUpdated, {
        alliance_id,
        player_ids: [ alice.id ]
      })

      const { invitation_id } = await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Bob'
      })
      await expect(acceptAllianceInvitation({
        player_id: bob.id,
        invitation_id
      })).rejects.toThrow(AllianceError.COOLDOWN)
      await expect(createAlliance({
        player_id: bob.id,
        name: 'Les Partis',
        tag: 'PART'
      })).rejects.toThrow(AllianceError.COOLDOWN)

      clock += ALLIANCE_LEAVE_COOLDOWN_MS
      await acceptAllianceInvitation({
        player_id: bob.id,
        invitation_id
      })
      expect(roleOf(bob)).toBe(AllianceRole.MEMBRE)
    })

    it('sends reinforcements between the leaver and the remaining members home', async () => {
      const alliance_id = await found()
      await join(alliance_id, bob)
      const between = vi.spyOn(returnHome, 'returnReinforcementsBetween').mockResolvedValue([
        {
          host_player_id: alice.id,
          city_id: 'alice-city',
          owner_player_id: bob.id,
          movement_id: 'return-movement'
        },
      ])

      await leaveAlliance({ player_id: bob.id })

      expect(between).toHaveBeenCalledWith({
        player_id: bob.id,
        other_player_ids: [ alice.id ],
        at: clock
      })
      expect(emit).toHaveBeenCalledWith(AppEvent.ReinforcementRecalled, {
        player_id: alice.id,
        city_id: 'alice-city',
        owner_player_id: bob.id,
        movement_id: 'return-movement'
      })
    })

    it('forbids the chef from leaving', async () => {
      await found()
      await expect(leaveAlliance({ player_id: alice.id })).rejects.toThrow(AllianceError.FORBIDDEN)
    })

    it('kicks without cooldown, officers kicking members only', async () => {
      const alliance_id = await found()
      await join(alliance_id, bob)
      await join(alliance_id, carol)
      await join(alliance_id, dave)
      await setAllianceMemberRole({
        player_id: alice.id,
        target_player_id: bob.id,
        role: AllianceRole.OFFICIER
      })
      await setAllianceMemberRole({
        player_id: alice.id,
        target_player_id: dave.id,
        role: AllianceRole.OFFICIER
      })

      await expect(kickAllianceMember({
        player_id: bob.id,
        target_player_id: dave.id
      })).rejects.toThrow(AllianceError.FORBIDDEN)
      await expect(kickAllianceMember({
        player_id: carol.id,
        target_player_id: bob.id
      })).rejects.toThrow(AllianceError.FORBIDDEN)
      await expect(kickAllianceMember({
        player_id: alice.id,
        target_player_id: stranger.id
      })).rejects.toThrow(AllianceError.NOT_MEMBER)

      await kickAllianceMember({
        player_id: bob.id,
        target_player_id: carol.id
      })
      expect(roleOf(carol)).toBeUndefined()
      expect(setAllianceLeftAt).not.toHaveBeenCalled()
      expect(emit).toHaveBeenCalledWith(AppEvent.AllianceLeft, {
        player_id: carol.id,
        alliance_id,
        reason: 'kick'
      })

      // No cooldown: Carol can join again right away.
      await join(alliance_id, carol)
      expect(roleOf(carol)).toBe(AllianceRole.MEMBRE)
    })

    it('dissolves: everyone leaves without cooldown, pending invitations, applications and chat are deleted', async () => {
      const alliance_id = await found()
      await join(alliance_id, bob)
      await inviteToAlliance({
        player_id: alice.id,
        player_name: 'Carol'
      })
      await applyToAlliance({
        player_id: dave.id,
        alliance_id
      })

      await expect(dissolveAlliance({ player_id: bob.id })).rejects.toThrow(AllianceError.FORBIDDEN)
      await dissolveAlliance({ player_id: alice.id })

      expect(store.alliances).toEqual([])
      expect(store.members).toEqual([])
      expect(store.invitations).toEqual([])
      expect(store.applications).toEqual([])
      expect(deleteByChannel).toHaveBeenCalledWith(`alliance:${alliance_id}`)
      expect(setAllianceLeftAt).not.toHaveBeenCalled()
      for (const member of [
        alice,
        bob 
      ]) {
        expect(emit).toHaveBeenCalledWith(AppEvent.AllianceLeft, {
          player_id: member.id,
          alliance_id,
          reason: 'dissolve'
        })
      }

      await found(bob)
      expect(roleOf(bob)).toBe(AllianceRole.CHEF)
    })
  })
})
