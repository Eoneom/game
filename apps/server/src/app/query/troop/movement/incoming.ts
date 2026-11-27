import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { stacksToBattleStacks } from '#app/command/troop/movement/attack-target'
import { GenericQuery } from '#query/generic'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import {
  DETECTION_LEVEL_ALERT,
  IntelService,
} from '#core/intel/service'
import {
  IncomingAttack,
  IncomingAttackView,
} from '#core/intel/type'
import { TechnologyCode } from '#core/technology/constant/code'
import { Coordinates } from '#core/world/value/coordinates'

interface TroopMovementIncomingQueryRequest {
  player_id: string
}

interface TroopMovementIncomingQueryResponse {
  movements: IncomingAttackView[]
}

/**
 * Incoming attacks visible to the player (slice 030), filtered by their `detection` level read on each call.
 * Arrived attacks (no pending finish job) are hidden, as in the movement list; spy movements are never listed.
 */
export class TroopMovementIncomingQuery extends GenericQuery<TroopMovementIncomingQueryRequest, TroopMovementIncomingQueryResponse> {
  constructor() {
    super({ name: 'troop:movement:incoming' })
  }

  protected async get({ player_id }: TroopMovementIncomingQueryRequest): Promise<TroopMovementIncomingQueryResponse> {
    const levels = await AppService.getTechnologyLevels({
      player_id,
      codes: [ TechnologyCode.DETECTION ]
    })
    const detection_level = levels[TechnologyCode.DETECTION]
    if (detection_level < DETECTION_LEVEL_ALERT) {
      return { movements: [] }
    }

    const movements = await this.repository.movement.listIncomingAttacks({ player_id })
    const job_queue = Factory.getJobQueue()

    const views = await Promise.all(movements.map(async (movement) => {
      const arrive_at = await resolveMovementArriveAt({
        movement_id: movement.id,
        job_queue,
      })
      if (arrive_at === null) {
        return null
      }

      const [
        troops,
        attacker,
        target,
      ] = await Promise.all([
        this.repository.troop.listByMovement({ movement_id: movement.id }),
        this.repository.player.get(movement.player_id),
        this.resolveTarget({
          player_id,
          coordinates: movement.destination,
        }),
      ])

      return IntelService.toIncomingAttackView({
        detection_level,
        attack: {
          id: movement.id,
          target,
          arrive_at,
          attacker: {
            name: attacker.name,
            faction_code: attacker.faction_code,
          },
          troops: stacksToBattleStacks(troops),
        },
      })
    }))

    return {
      movements: views
        .filter((view): view is IncomingAttackView => view !== null)
        .sort((left, right) => left.arrive_at - right.arrive_at),
    }
  }

  private async resolveTarget({
    player_id,
    coordinates,
  }: {
    player_id: string
    coordinates: Coordinates
  }): Promise<IncomingAttack['target']> {
    const cell = await this.repository.cell.getCell({ coordinates })

    const city = await this.repository.city.searchByCell({ cell_id: cell.id })
    if (city?.isOwnedBy(player_id)) {
      return {
        kind: BattleTargetKind.CITY,
        id: city.id,
        name: city.name,
        coordinates,
      }
    }

    const outpost = await this.repository.outpost.searchByCell({ cell_id: cell.id })
    if (outpost?.isOwnedBy(player_id)) {
      return {
        kind: BattleTargetKind.OUTPOST,
        id: outpost.id,
        name: null,
        coordinates,
      }
    }

    return {
      kind: BattleTargetKind.FIELD,
      id: null,
      name: null,
      coordinates,
    }
  }
}
