import { TechnologyEntity } from '#core/technology/entity'
import { GenericRepository } from '#app/port/repository/generic'
import { TechnologyCode } from '#core/technology/constant/code'

export type TechnologyRepository = GenericRepository<TechnologyEntity> & {
  get(query: { player_id: string, code: TechnologyCode }): Promise<TechnologyEntity>
  getById(id: string): Promise<TechnologyEntity>
  getLevel(query: { player_id: string, code: TechnologyCode }): Promise<number>

  list(query: {
    player_id: string,
    codes?: TechnologyCode[]
  }): Promise<TechnologyEntity[]>
}
