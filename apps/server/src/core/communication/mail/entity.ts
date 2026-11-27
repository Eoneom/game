import { BaseEntity } from '#core/type/base/entity'

type MailEntityProps = BaseEntity & {
  sender_id: string
  recipient_id: string
  subject: string
  body: string
  in_reply_to: string | null
  delivered: boolean
  sent_at: number
  read_at: number | null
  deleted_by_sender: boolean
  deleted_by_recipient: boolean
}

/** A Letter: private message with a subject, from one Player to another (slice 032). */
export class MailEntity extends BaseEntity {
  readonly sender_id: string
  readonly recipient_id: string
  readonly subject: string
  readonly body: string
  readonly in_reply_to: string | null
  /** False when the recipient had blocked the sender: the letter stays in the sent box only. */
  readonly delivered: boolean
  readonly sent_at: number
  readonly read_at: number | null
  readonly deleted_by_sender: boolean
  readonly deleted_by_recipient: boolean

  private constructor(props: MailEntityProps) {
    super({ id: props.id })

    this.sender_id = props.sender_id
    this.recipient_id = props.recipient_id
    this.subject = props.subject
    this.body = props.body
    this.in_reply_to = props.in_reply_to
    this.delivered = props.delivered
    this.sent_at = props.sent_at
    this.read_at = props.read_at
    this.deleted_by_sender = props.deleted_by_sender
    this.deleted_by_recipient = props.deleted_by_recipient
  }

  static create(props: MailEntityProps): MailEntity {
    return new MailEntity(props)
  }

  isVisibleToSender(player_id: string): boolean {
    return this.sender_id === player_id && !this.deleted_by_sender
  }

  isVisibleToRecipient(player_id: string): boolean {
    return this.recipient_id === player_id && this.delivered && !this.deleted_by_recipient
  }

  isVisibleTo(player_id: string): boolean {
    return this.isVisibleToSender(player_id) || this.isVisibleToRecipient(player_id)
  }

  markAs({
    read, at 
  }: { read: boolean, at: number }): MailEntity {
    return MailEntity.create({
      ...this,
      read_at: read ? (this.read_at ?? at) : null
    })
  }

  /** Soft delete for one side; a caller who is both sides cannot exist (no letter to self). */
  deleteFor(player_id: string): MailEntity {
    return MailEntity.create({
      ...this,
      deleted_by_sender: this.deleted_by_sender || this.sender_id === player_id,
      deleted_by_recipient: this.deleted_by_recipient || this.recipient_id === player_id,
    })
  }
}
