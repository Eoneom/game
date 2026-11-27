import { GenericRepository } from '#app/port/repository/generic'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'

export type TroopRepository = GenericRepository<TroopEntity> & {
  getById(id: string): Promise<TroopEntity>

  /** The player's own troops on a cell. */
  listInCell(query: { cell_id: string, player_id: string }): Promise<TroopEntity[]>
  /** Every player's troops on a cell, reinforcements included (battle snapshot, system AI scoring). */
  listAllInCell(query: { cell_id: string }): Promise<TroopEntity[]>
  /** The player's own stack of `code` on a cell (several players can hold the same code there, slice 033). */
  getInCell(query: { cell_id: string, player_id: string, code: TroopCode }): Promise<TroopEntity>

  /** Stationed troops (count > 0) of other players on the host's cell: reinforcements (slice 033). */
  listReinforcementsInCell(query: { cell_id: string, host_player_id: string }): Promise<TroopEntity[]>
  /** The player's stationed troops (count > 0) on cells holding a city owned by another player (slice 033). */
  listStationedAbroad(query: { player_id: string }): Promise<TroopEntity[]>

  listByMovement(query: { movement_id: string }): Promise<TroopEntity[]>
  /** Troops of several movements in one request (movements list, slice 045). */
  listByMovementIds(query: { movement_ids: string[] }): Promise<TroopEntity[]>
}
