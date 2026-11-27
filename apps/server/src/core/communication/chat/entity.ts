import { BaseEntity } from '#core/type/base/entity'

type ChatMessageEntityProps = BaseEntity & {
  /** Stored channel key (`global` or `faction:<faction_code>`). */
  channel: string
  author_id: string
  body: string
  created_at: number
}

export class ChatMessageEntity extends BaseEntity {
  readonly channel: string
  readonly author_id: string
  readonly body: string
  readonly created_at: number

  private constructor(props: ChatMessageEntityProps) {
    super({ id: props.id })

    this.channel = props.channel
    this.author_id = props.author_id
    this.body = props.body
    this.created_at = props.created_at
  }

  static create(props: ChatMessageEntityProps): ChatMessageEntity {
    return new ChatMessageEntity(props)
  }
}
