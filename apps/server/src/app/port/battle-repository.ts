import { BattleEntity } from '#core/combat/entity/battle'

export interface BattleRepository {
  create(battle: BattleEntity): Promise<string>
  update(battle: BattleEntity): Promise<void>
  getById(id: string): Promise<BattleEntity>
  getByMovementId(movement_id: string): Promise<BattleEntity | null>
  /** Battles that targeted this city or outpost since `since` (ms), any status. */
  countByTargetSince(query: { target_id: string, since: number }): Promise<number>
}
