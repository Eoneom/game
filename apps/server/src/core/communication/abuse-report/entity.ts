import { BaseEntity } from '#core/type/base/entity'
import { AbuseReportKind } from '#core/communication/abuse-report/kind'

type AbuseReportEntityProps = BaseEntity & {
  reporter_id: string
  author_id: string
  kind: AbuseReportKind
  message_id: string
  /** Snapshot of the reported content, kept after chat cleanup or mail purge. */
  content: string
  reason: string | null
  created_at: number
}

export class AbuseReportEntity extends BaseEntity {
  readonly reporter_id: string
  readonly author_id: string
  readonly kind: AbuseReportKind
  readonly message_id: string
  readonly content: string
  readonly reason: string | null
  readonly created_at: number

  private constructor(props: AbuseReportEntityProps) {
    super({ id: props.id })

    this.reporter_id = props.reporter_id
    this.author_id = props.author_id
    this.kind = props.kind
    this.message_id = props.message_id
    this.content = props.content
    this.reason = props.reason
    this.created_at = props.created_at
  }

  static create(props: AbuseReportEntityProps): AbuseReportEntity {
    return new AbuseReportEntity(props)
  }
}
