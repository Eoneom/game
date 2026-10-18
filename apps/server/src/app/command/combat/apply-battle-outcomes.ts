import { Factory } from '#adapter/factory'
import { createBattleReports } from '#app/command/communication/report/create-battle'
import { runCommand } from '#command/run'
import { combatRoleFor } from '#core/combat/troop-combat'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CityEntity } from '#core/city/entity'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { CombatRole } from '#core/troop/constant/combat-role'
import { TroopCode } from '#core/troop/constant/code'
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

function hasCombat(stacks: { code: TroopCode; count: number }[]): boolean {
  return stacks.some(s => s.count > 0 && combatRoleFor(s.code) === CombatRole.COMBAT)
}

function toEntities({
  stacks,
  player_id,
  cell_id,
}: {
  stacks: { code: TroopCode; count: number }[]
  player_id: string
  cell_id: string
}): TroopEntity[] {
  return stacks
    .filter(s => s.count > 0)
    .map(s => TroopEntity.create({
      id: id(),
      player_id,
      cell_id,
      code: s.code,
      count: s.count,
      movement_id: null,
    }))
}

function lootFromStock(stock: ResourceStockEntity, capacity: number): {
  loot: Resource
  stock: ResourceStockEntity
} {
  let remaining = capacity
  const loot: Resource = { plastic: 0, mushroom: 0, plasma: 0 }
  const keys = ['plastic', 'mushroom', 'plasma'] as const
  const next = { plastic: stock.plastic, mushroom: stock.mushroom, plasma: stock.plasma }

  for (const key of keys) {
    const half = Math.floor(next[key] * 0.5)
    const transfer = Math.min(half, remaining)
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
      last_plastic_gather: stock.last_plastic_gather,
      last_mushroom_gather: stock.last_mushroom_gather,
      last_plasma_gather: stock.last_plasma_gather,
    }),
  }
}

export type ApplyBattleOutcomesResult = {
  attacker_player_id: string
  defender_player_id: string
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
    let loot: Resource = { plastic: 0, mushroom: 0, plasma: 0 }

    const troop_deletes: string[] = []
    const troop_updates: TroopEntity[] = []
    let stock_update: ResourceStockEntity | null = null

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

      const carriers = attacker_stacks.filter(
        s => s.count > 0 && combatRoleFor(s.code) === CombatRole.CARRIER
      )
      const capacity = TroopService.getTotalTransportCapacity({ troops: carriers })
      if (capacity > 0) {
        try {
          const stock = await repository.resource_stock.getByCellId({ cell_id: destination_cell.id })
          const result = lootFromStock(stock, capacity)
          if (result.loot.plastic + result.loot.mushroom + result.loot.plasma > 0) {
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
        await repository.city.updateOne(CityEntity.create({
          ...city,
          player_id: battle.attacker_player_id,
        }))
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

    const finished_battle = battle.finish({
      winner,
      state_json: battle.state_json,
      finished_at,
    })

    await repository.battle.update(finished_battle)
    await repository.movement.delete(battle.movement_id)

    const promises: Promise<unknown>[] = [
      ...troop_deletes.map(tid => repository.troop.delete(tid)),
      ...troop_updates.map(t => repository.troop.updateOne(t, { upsert: true })),
    ]
    if (stock_update) {
      promises.push(repository.resource_stock.updateOne(stock_update))
    }
    await Promise.all(promises)

    await createBattleReports({
      battle: finished_battle,
      movement,
      outcome,
      loot,
      finished_at,
    })

    return {
      attacker_player_id: battle.attacker_player_id,
      defender_player_id: battle.defender_player_id,
    }
  })
}
