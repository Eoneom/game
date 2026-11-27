import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import {
  ResolvedAttackTarget,
  stacksToBattleStacks,
} from '#app/command/troop/movement/attack-target'
import { resolveSpyTarget } from '#app/command/troop/movement/spy-target'
import { createReturnBaseTrip } from '#app/command/troop/movement/shared'
import { SpyReportEntry } from '#app/port/repository/report'
import { runCommand } from '#command/run'
import { CombatError } from '#core/combat/error'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { resolveDefaultCombatStrategy } from '#core/combat/value/combat-strategy'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { IntelError } from '#core/intel/error'
import { IntelService } from '#core/intel/service'
import {
  ReportSpyMetadata,
  SpyIntel,
  SpyTarget,
} from '#core/intel/type'
import { PlayerEntity } from '#core/player/entity'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { id } from '#shared/identification'

interface FinishTroopSpyMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
  /** Uniform [0, 1) source for the failure roll; injectable for tests. */
  random?: () => number
}

type FinishTroopSpyMovementResult =
  | { outcome: 'success' | 'aborted', base_movement: MovementEntity, base_arrive_at: number }
  | { outcome: 'failure' }

/** Errors meaning the target vanished or changed to a same-faction owner: no roll, scouts return. */
const ABORTING_TARGET_ERRORS = new Set<string>([
  IntelError.NO_VALID_TARGET,
  CombatError.SAME_FACTION_ATTACK,
])

/** Resolves a `spy` movement on arrival (slice 030). */
export async function finishTroopSpyMovement({
  player_id,
  movement_id,
  arrived_at,
  random = Math.random,
}: FinishTroopSpyMovementParams): Promise<FinishTroopSpyMovementResult> {
  return runCommand('troop:finish:spy', async () => {
    const repository = Factory.getRepository()

    const movement = await repository.movement.getById(movement_id)
    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
    }

    const [
      troops,
      spy_owner,
    ] = await Promise.all([
      repository.troop.listByMovement({ movement_id }),
      repository.player.get(player_id),
    ])
    const scout_count = troops.reduce((sum, troop) => sum + troop.count, 0)

    let target: ResolvedAttackTarget | null = null
    try {
      target = await resolveSpyTarget({
        spy_player_id: player_id,
        spy_faction_code: spy_owner.faction_code,
        destination: movement.destination,
      })
    } catch (err) {
      if (!ABORTING_TARGET_ERRORS.has((err as Error).message)) {
        throw err
      }
    }

    if (!target) {
      const metadata: ReportSpyMetadata = {
        success: false,
        aborted: true,
        roll: null,
        p_success: null,
        tier: 0,
        target: {
          kind: null,
          id: null,
          name: null,
          owner_name: null,
          faction_code: null,
          coordinates: movement.destination,
        },
        scouts_lost: 0,
      }
      await repository.report.createSpyReports([
        spyOwnerReportEntry({
          movement,
          troops,
          arrived_at,
          target_player_id: null,
          metadata 
        }) 
      ])
      const {
        base_movement, base_arrive_at 
      } = await createReturnBaseTrip({
        inbound_movement: movement,
        troops,
        arrived_at,
        schedule: 'if_future',
      })
      return {
        outcome: 'aborted',
        base_movement,
        base_arrive_at 
      }
    }

    const [
      spy_levels,
      target_levels,
      target_owner,
    ] = await Promise.all([
      AppService.getTechnologyLevels({
        player_id,
        codes: [ TechnologyCode.ESPIONAGE ] 
      }),
      AppService.getTechnologyLevels({
        player_id: target.defender_player_id,
        codes: [ TechnologyCode.DETECTION ] 
      }),
      repository.player.get(target.defender_player_id),
    ])

    const gap = IntelService.getGap({
      espionage_level: spy_levels[TechnologyCode.ESPIONAGE],
      detection_level: target_levels[TechnologyCode.DETECTION],
    })
    const p_success = IntelService.getSpySuccessProbability({
      gap,
      scout_count 
    })
    const roll = random()
    const success = IntelService.isSpySuccess({
      roll,
      p_success 
    })

    const spy_target = await describeSpyTarget({
      target,
      target_owner,
      movement 
    })

    if (!success) {
      // All scouts are destroyed; troops go first (`troop.movement_id` is set null on movement delete).
      await Promise.all(troops.map(troop => repository.troop.delete(troop.id)))
      await repository.movement.delete(movement.id)

      await repository.report.createSpyReports([
        spyOwnerReportEntry({
          movement,
          troops,
          arrived_at,
          target_player_id: target.defender_player_id,
          metadata: {
            success: false,
            aborted: false,
            roll,
            p_success,
            tier: 0,
            target: spy_target,
            scouts_lost: scout_count,
          },
        }),
        {
          report: ReportEntity.create({
            id: id(),
            type: ReportType.SPY_DETECTED,
            was_read: false,
            player_id: target.defender_player_id,
            troops: [],
            recorded_at: arrived_at,
            origin: movement.origin,
            destination: movement.destination,
          }),
          movement_id: movement.id,
          spy_player_id: player_id,
          target_player_id: target.defender_player_id,
          metadata: {
            spy_owner: {
              name: spy_owner.name,
              faction_code: spy_owner.faction_code,
            },
            target: spy_target,
            scouts_destroyed: scout_count,
          },
        },
      ])

      return { outcome: 'failure' }
    }

    const tier = IntelService.getSpyReportTier({ gap })
    const intel = await collectSpyIntel({
      target,
      tier 
    })

    const exploration = await repository.exploration.get({ player_id })
    await repository.exploration.updateOne(exploration.exploreCells([ target.destination_cell_id ]))

    await repository.report.createSpyReports([
      spyOwnerReportEntry({
        movement,
        troops,
        arrived_at,
        target_player_id: target.defender_player_id,
        metadata: {
          ...intel,
          success: true,
          aborted: false,
          roll,
          p_success,
          tier,
          target: spy_target,
          scouts_lost: 0,
        },
      }),
    ])

    const {
      base_movement, base_arrive_at 
    } = await createReturnBaseTrip({
      inbound_movement: movement,
      troops,
      arrived_at,
      schedule: 'if_future',
    })

    return {
      outcome: 'success',
      base_movement,
      base_arrive_at 
    }
  })
}

function spyOwnerReportEntry({
  movement,
  troops,
  arrived_at,
  target_player_id,
  metadata,
}: {
  movement: MovementEntity
  troops: TroopEntity[]
  arrived_at: number
  target_player_id: string | null
  metadata: ReportSpyMetadata
}): SpyReportEntry {
  return {
    report: ReportEntity.create({
      id: id(),
      type: ReportType.SPY,
      was_read: false,
      player_id: movement.player_id,
      // Scouts sent on the mission.
      troops: troops.map(troop => ({
        code: troop.code,
        count: troop.count,
      })),
      recorded_at: arrived_at,
      origin: movement.origin,
      destination: movement.destination,
    }),
    movement_id: movement.id,
    spy_player_id: movement.player_id,
    target_player_id,
    metadata,
  }
}

async function describeSpyTarget({
  target,
  target_owner,
  movement,
}: {
  target: ResolvedAttackTarget
  target_owner: PlayerEntity
  movement: MovementEntity
}): Promise<SpyTarget> {
  const repository = Factory.getRepository()
  const name = target.target_kind === BattleTargetKind.CITY && target.target_id
    ? (await repository.city.get(target.target_id)).name
    : null

  return {
    kind: target.target_kind,
    id: target.target_id,
    name,
    owner_name: target_owner.name,
    faction_code: target_owner.faction_code,
    coordinates: movement.destination,
  }
}

/** Snapshot of the target at arrival, limited to what the tier reveals for its kind. */
async function collectSpyIntel({
  target,
  tier,
}: {
  target: ResolvedAttackTarget
  tier: number
}): Promise<SpyIntel> {
  const repository = Factory.getRepository()
  const scope = IntelService.getSpyIntelScope({
    tier,
    target_kind: target.target_kind 
  })
  const intel: SpyIntel = {}

  if (scope.troops) {
    const cell_troops = await repository.troop.listAllInCell({ cell_id: target.destination_cell_id })
    intel.troops = stacksToBattleStacks(cell_troops.filter(troop => troop.player_id === target.defender_player_id && troop.movement_id === null))
  }

  if (target.target_kind === BattleTargetKind.CITY && target.target_id) {
    const city = await repository.city.get(target.target_id)

    if (scope.defenses) {
      const defenses = await repository.defense.listByCity({ city_id: city.id })
      intel.defenses = defenses
        .filter(defense => defense.count > 0)
        .map(defense => ({
          code: defense.code,
          count: defense.count,
        }))
    }
    if (scope.default_strategy) {
      intel.default_strategy = resolveDefaultCombatStrategy(city.default_combat_strategy)
    }
    if (scope.buildings) {
      const buildings = await repository.building.list({ city_id: city.id })
      intel.buildings = buildings
        .filter(building => building.level > 0)
        .map(building => ({
          code: building.code,
          level: building.level,
        }))
    }
    if (scope.technologies) {
      const technologies = await repository.technology.list({ player_id: target.defender_player_id })
      intel.technologies = technologies
        .filter(technology => technology.level > 0)
        .map(technology => ({
          code: technology.code,
          level: technology.level,
        }))
    }
  }

  if (target.target_kind === BattleTargetKind.OUTPOST && target.target_id) {
    const outpost = await repository.outpost.getById(target.target_id)

    if (scope.default_strategy) {
      intel.default_strategy = resolveDefaultCombatStrategy(outpost.default_combat_strategy)
    }
    if (scope.outpost_type) {
      intel.outpost_type = outpost.type
    }
  }

  if (scope.resources) {
    const stock = await repository.resource_stock.getByCellId({ cell_id: target.destination_cell_id })
    intel.resources = {
      plastic: Math.floor(stock.plastic),
      mushroom: Math.floor(stock.mushroom),
      plasma: Math.floor(stock.plasma),
      water: Math.floor(stock.water),
    }
  }

  return intel
}
