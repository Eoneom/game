import { Factory } from '#adapter/factory'
import { createBattleReports } from '#app/command/communication/report/create-battle'
import { runCommand } from '#command/run'
import { combat_loot_ratio } from '#core/combat/constant/loot'
import { combatRoleFor } from '#core/combat/troop-combat'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingService } from '#core/building/service'
import { BattleEntity } from '#core/combat/entity/battle'
import {
  BattleStack,
  isDefenseStack,
  isTroopStack,
  TroopBattleStack
} from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CityEntity } from '#core/city/entity'
import { militaryCredits } from '#core/ranking/military'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { CombatRole } from '#core/troop/constant/combat-role'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { Resource } from '#shared/resource'
import { id } from '#shared/identification'

export type BattleOutcomeFlags = {
  occupied: boolean
  destroyed_temp_outpost: boolean
  loot_applied: boolean
  attacker_retreated: boolean
}

function troopStacks(stacks: BattleStack[]): TroopBattleStack[] {
  return stacks.filter(isTroopStack)
}

function hasCombat(stacks: BattleStack[]): boolean {
  return troopStacks(stacks).some(s => s.count > 0 && combatRoleFor(s.code) === CombatRole.COMBAT)
}

/**
 * Troop survivors become troop rows again; defense survivors stay in their `defense` rows.
 * Reinforcement stacks go back to their owner (`stack.player_id`, slice 033), the others to `player_id`.
 */
function toEntities({
  stacks,
  player_id,
  cell_id,
}: {
  stacks: BattleStack[]
  player_id: string
  cell_id: string
}): TroopEntity[] {
  return troopStacks(stacks)
    .filter(s => s.count > 0)
    .map(s => TroopEntity.create({
      id: id(),
      player_id: s.player_id ?? player_id,
      cell_id,
      code: s.code,
      count: s.count,
      movement_id: null,
    }))
}

const NO_SHELTER: Resource = {
  plastic: 0,
  mushroom: 0,
  plasma: 0,
  water: 0,
}

/**
 * Carriers take `floor(max(0, stock − sheltered) × ratio)` of each resource, plastic → mushroom → plasma → water
 * (slice 035), until their capacity runs out. Only city targets have a shelter (slice 028).
 * Capacity counts units, not transport weight, as for plasma.
 */
function lootFromStock(stock: ResourceStockEntity, capacity: number, sheltered: Resource = NO_SHELTER): {
  loot: Resource
  stock: ResourceStockEntity
} {
  let remaining = capacity
  const loot: Resource = { ...NO_SHELTER }
  const keys = [
    'plastic',
    'mushroom',
    'plasma',
    'water',
  ] as const
  const next = {
    plastic: stock.plastic,
    mushroom: stock.mushroom,
    plasma: stock.plasma,
    water: stock.water,
  }

  for (const key of keys) {
    const unsheltered = Math.max(0, next[key] - sheltered[key])
    const lootable = Math.floor(unsheltered * combat_loot_ratio[key])
    const transfer = Math.min(lootable, remaining)
    loot[key] = transfer
    next[key] -= transfer
    remaining -= transfer
  }

  return {
    loot,
    stock: ResourceStockEntity.create({
      id: stock.id,
      cell_id: stock.cell_id,
      plastic: next.plastic,
      mushroom: next.mushroom,
      plasma: next.plasma,
      water: next.water,
      last_plastic_gather: stock.last_plastic_gather,
      last_mushroom_gather: stock.last_mushroom_gather,
      last_plasma_gather: stock.last_plasma_gather,
      last_water_gather: stock.last_water_gather,
    }),
  }
}

/** What the target city's `underground_shelter` protects; outposts and field stacks have none. */
async function shelterCapacityOfTarget(battle: BattleEntity): Promise<Resource> {
  if (battle.target_kind !== BattleTargetKind.CITY || !battle.target_id) {
    return NO_SHELTER
  }
  const level = await Factory.getRepository().building.getLevel({
    city_id: battle.target_id,
    code: BuildingCode.UNDERGROUND_SHELTER,
  })
  return BuildingService.getShelteredResources({ level })
}

/**
 * Credits `player.military_value` (slice 034) in the outcome transaction: the attacker with every defender loss,
 * the host and reinforcement owners with the attacker's losses split by raw attack. System players are skipped.
 */
async function creditMilitaryValue({
  battle,
  attacker_wins,
}: {
  battle: BattleEntity
  attacker_wins: boolean
}): Promise<void> {
  const repository = Factory.getRepository()
  const credits = militaryCredits({
    attacker_player_id: battle.attacker_player_id,
    defender_player_id: battle.defender_player_id,
    state_json: battle.state_json,
    // On an attacker win, whatever still stands on the defender side is destroyed with the capture.
    destroyed_defender_stacks: attacker_wins ? battle.state_json.defender_stacks : [],
  })
  if (credits.length === 0) {
    return
  }

  const players = await repository.player.listByIds(credits.map(credit => credit.player_id))
  const human_ids = new Set(players.filter(player => !player.system_controlled).map(player => player.id))
  for (const credit of credits) {
    if (human_ids.has(credit.player_id)) {
      await repository.player.addMilitaryValue(credit)
    }
  }
}

export type ApplyBattleOutcomesResult = {
  attacker_player_id: string
  defender_player_id: string
  attacker_report_id: string
  defender_report_id: string
  /** One `reinforcement` perspective report per reinforcement owner (slice 033). */
  reinforcement_reports: { player_id: string; report_id: string }[]
}

export async function applyBattleOutcomes({
  battle_id,
  winner,
  finished_at,
}: {
  battle_id: string
  winner: BattleWinner
  finished_at: number
}): Promise<ApplyBattleOutcomesResult> {
  return runCommand('combat:apply-outcomes', async () => {
    const repository = Factory.getRepository()
    const battle = await repository.battle.getById(battle_id)
    const movement = await repository.movement.getById(battle.movement_id)
    const origin_cell = await repository.cell.getCell({ coordinates: movement.origin })
    const destination_cell = await repository.cell.getCell({ coordinates: movement.destination })

    const outcome: BattleOutcomeFlags = {
      occupied: false,
      destroyed_temp_outpost: false,
      loot_applied: false,
      attacker_retreated: false,
    }
    let loot: Resource = { ...NO_SHELTER }
    let sheltered: Resource = {
      plastic: 0,
      mushroom: 0,
      plasma: 0,
      water: 0,
    }

    const troop_deletes: string[] = []
    const troop_updates: TroopEntity[] = []
    let stock_update: ResourceStockEntity | null = null

    // Every troop on the cell is rewritten from the battle state: survivors are re-created per owner
    // (host and reinforcements, slice 033); on an attacker win the reinforcements die with the garrison.
    const on_cell = await repository.troop.listAllInCell({ cell_id: destination_cell.id })
    for (const t of on_cell) {
      troop_deletes.push(t.id)
    }
    const movement_troops = await repository.troop.listByMovement({ movement_id: battle.movement_id })
    troop_deletes.push(...movement_troops.map(t => t.id))

    const attacker_stacks = battle.state_json.attacker_stacks
    const defender_stacks = battle.state_json.defender_stacks

    const attacker_wins = winner === BattleWinner.ATTACKER && hasCombat(attacker_stacks)
    const retreat_attackers =
      winner === BattleWinner.DEFENDER
      || (winner === BattleWinner.DRAW && attacker_stacks.some(s => s.count > 0))

    if (attacker_wins) {
      troop_updates.push(...toEntities({
        stacks: attacker_stacks,
        player_id: battle.attacker_player_id,
        cell_id: destination_cell.id,
      }))
      outcome.occupied = true

      const carriers = troopStacks(attacker_stacks).filter(
        s => s.count > 0 && combatRoleFor(s.code) === CombatRole.CARRIER
      )
      const capacity = TroopService.getTotalTransportCapacity({ troops: carriers })
      if (capacity > 0) {
        try {
          const stock = await repository.resource_stock.getByCellId({ cell_id: destination_cell.id })
          const city_sheltered = await shelterCapacityOfTarget(battle)
          sheltered = {
            plastic: Math.min(stock.plastic, city_sheltered.plastic),
            mushroom: Math.min(stock.mushroom, city_sheltered.mushroom),
            plasma: Math.min(stock.plasma, city_sheltered.plasma),
            water: Math.min(stock.water, city_sheltered.water),
          }
          const result = lootFromStock(stock, capacity, city_sheltered)
          if (result.loot.plastic + result.loot.mushroom + result.loot.plasma + result.loot.water > 0) {
            loot = result.loot
            stock_update = result.stock
            outcome.loot_applied = true
          }
        } catch {
          // no warehouse stock
        }
      }

      if (battle.target_kind === BattleTargetKind.CITY && battle.target_id) {
        const city = await repository.city.get(battle.target_id)
        // Every remaining defense is destroyed, and the fortification batch and queue go with the old owner (slice 029).
        await Promise.all([
          repository.defense.deleteByCity({ city_id: city.id }),
          repository.defense_build_queue.deleteByCity({ city_id: city.id }),
          Factory.getJobQueue().cancelDefenseBuildProgress({ city_id: city.id }),
        ])
        await repository.city.updateOne(CityEntity.create({
          ...city,
          player_id: battle.attacker_player_id,
        }))
        // Waiting recruitment batches belonged to the previous owner.
        await repository.troop_recruit_queue.deleteByCity({ city_id: city.id })
      }

      if (battle.target_kind === BattleTargetKind.OUTPOST && battle.target_id) {
        const outpost = await repository.outpost.getById(battle.target_id)
        if (outpost.type === OutpostType.TEMPORARY) {
          await repository.outpost.delete(outpost.id)
          outcome.destroyed_temp_outpost = true
        } else {
          await repository.outpost.updateOne(OutpostEntity.create({
            ...outpost,
            player_id: battle.attacker_player_id,
          }))
        }
      }
    } else if (retreat_attackers) {
      troop_updates.push(...toEntities({
        stacks: attacker_stacks,
        player_id: battle.attacker_player_id,
        cell_id: origin_cell.id,
      }))
      outcome.attacker_retreated = true
      troop_updates.push(...toEntities({
        stacks: defender_stacks,
        player_id: battle.defender_player_id,
        cell_id: destination_cell.id,
      }))
    } else {
      troop_updates.push(...toEntities({
        stacks: defender_stacks,
        player_id: battle.defender_player_id,
        cell_id: destination_cell.id,
      }))
    }

    if (!attacker_wins && battle.target_kind === BattleTargetKind.CITY && battle.target_id) {
      // Defender win or draw: surviving defenses stay, lost units are removed (units built meanwhile are kept).
      const city_id = battle.target_id
      const defense_losses = battle.state_json.cumulative_defender_losses.filter(isDefenseStack)
      await Promise.all(defense_losses.map(line => repository.defense.removeCount({
        city_id,
        code: line.code,
        count: line.count,
      })))
    }

    const finished_battle = battle.finish({
      winner,
      state_json: battle.state_json,
      finished_at,
    })

    await repository.battle.update(finished_battle)
    await repository.movement.delete(battle.movement_id)
    await creditMilitaryValue({
      battle: finished_battle,
      attacker_wins,
    })

    const promises: Promise<unknown>[] = [
      ...troop_deletes.map(tid => repository.troop.delete(tid)),
      ...troop_updates.map(t => repository.troop.updateOne(t, { upsert: true })),
    ]
    if (stock_update) {
      promises.push(repository.resource_stock.updateOne(stock_update))
    }
    await Promise.all(promises)

    const {
      attacker_report_id,
      defender_report_id,
      reinforcement_reports,
    } = await createBattleReports({
      battle: finished_battle,
      movement,
      outcome,
      loot,
      sheltered,
      finished_at,
    })

    return {
      attacker_player_id: battle.attacker_player_id,
      defender_player_id: battle.defender_player_id,
      attacker_report_id,
      defender_report_id,
      reinforcement_reports,
    }
  })
}
