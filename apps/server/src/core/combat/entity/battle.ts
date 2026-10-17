import { BattleStateJson } from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { BaseEntity, BaseEntityProps } from '#core/type/base/entity'

export type BattleStatus = 'in_progress' | 'finished'

type BattleEntityProps = BaseEntityProps & {
  movement_id: string
  attacker_player_id: string
  defender_player_id: string
  cell_id: string
  target_kind: BattleTargetKind
  target_id: string | null
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
  current_round: number
  status: BattleStatus
  winner: BattleWinner | null
  state_json: BattleStateJson
  started_at: number
  finished_at: number | null
}

export class BattleEntity extends BaseEntity {
  readonly movement_id: string
  readonly attacker_player_id: string
  readonly defender_player_id: string
  readonly cell_id: string
  readonly target_kind: BattleTargetKind
  readonly target_id: string | null
  readonly attacker_strategy: CombatStrategy
  readonly defender_strategy: CombatStrategy
  readonly current_round: number
  readonly status: BattleStatus
  readonly winner: BattleWinner | null
  readonly state_json: BattleStateJson
  readonly started_at: number
  readonly finished_at: number | null

  private constructor(props: BattleEntityProps) {
    super({ id: props.id })
    this.movement_id = props.movement_id
    this.attacker_player_id = props.attacker_player_id
    this.defender_player_id = props.defender_player_id
    this.cell_id = props.cell_id
    this.target_kind = props.target_kind
    this.target_id = props.target_id
    this.attacker_strategy = props.attacker_strategy
    this.defender_strategy = props.defender_strategy
    this.current_round = props.current_round
    this.status = props.status
    this.winner = props.winner
    this.state_json = props.state_json
    this.started_at = props.started_at
    this.finished_at = props.finished_at
  }

  static create(props: BattleEntityProps): BattleEntity {
    return new BattleEntity(props)
  }

  withRoundAdvance({
    current_round,
    state_json,
  }: {
    current_round: number
    state_json: BattleStateJson
  }): BattleEntity {
    return BattleEntity.create({
      ...this,
      id: this.id,
      current_round,
      state_json,
    })
  }

  finish({
    winner,
    state_json,
    finished_at,
  }: {
    winner: BattleWinner
    state_json: BattleStateJson
    finished_at: number
  }): BattleEntity {
    return BattleEntity.create({
      ...this,
      id: this.id,
      status: 'finished',
      winner,
      state_json,
      finished_at,
      current_round: this.current_round,
    })
  }
}
