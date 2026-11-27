import { BuildingEntity } from '#core/building/entity'
import { GenericRepository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'

export type BuildingRepository = GenericRepository<BuildingEntity> & {
  list(query: {
    city_id: string,
    codes?: BuildingCode[]
  }): Promise<BuildingEntity[]>

  get(query: { city_id: string, code: BuildingCode }): Promise<BuildingEntity>
  getById(id: string): Promise<BuildingEntity>
  getInCity(query: { city_id: string, code: BuildingCode }): Promise<BuildingEntity>
  getLevel(query: { city_id: string, code: BuildingCode }): Promise<number>

  getTotalLevels(query: { city_id: string }): Promise<number>

  /** Sum of one building code's levels over every city the player owns. */
  getTotalLevelForPlayer(query: { player_id: string, code: BuildingCode }): Promise<number>
}
