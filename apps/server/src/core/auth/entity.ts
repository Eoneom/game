import {
  id, generateToken
} from '#shared/identification'
import { BaseEntity } from '#core/type/base/entity'
import { now } from '#shared/time'

type AuthEntityProps = BaseEntity & {
  player_id: string
  token: string
  last_action_at: number
}

export class AuthEntity extends BaseEntity {
  readonly player_id: string
  readonly token: string
  readonly last_action_at: number

  private constructor({
    id,
    player_id,
    token,
    last_action_at
  }: AuthEntityProps) {
    super({ id })

    this.player_id = player_id
    this.token = token
    this.last_action_at = last_action_at
  }

  updateLastAction(action_at: number): AuthEntity {
    return new AuthEntity({
      ...this,
      last_action_at: action_at
    })
  }

  static create(props: AuthEntityProps): AuthEntity {
    return new AuthEntity(props)
  }

  static generate({ player_id }: { player_id: string }): AuthEntity {
    return new AuthEntity({
      id: id(),
      player_id,
      token: generateToken(),
      last_action_at: now()
    })
  }
}
