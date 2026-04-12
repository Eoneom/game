import { TechnologyCode } from '#core/technology/constant/code'
import { id } from '#shared/identification'
import { now } from '#shared/time'
import { BaseEntity } from '#core/type/base/entity'
import { TechnologyError } from '#core/technology/error'

type TechnologyEntityProps = BaseEntity & {
  code: TechnologyCode
  player_id: string
  level: number
  research_at?: number
  research_started_at?: number | null
}

export class TechnologyEntity extends BaseEntity {
  readonly code: TechnologyCode
  readonly player_id: string
  readonly level: number
  readonly research_at: number | null
  readonly research_started_at: number | null

  private constructor({
    id,
    code,
    player_id,
    level,
    research_at,
    research_started_at
  }: TechnologyEntityProps) {
    super({ id })
    this.code = code
    this.player_id = player_id
    this.level = level
    this.research_at = research_at ?? null
    this.research_started_at = research_started_at ?? null
  }

  static create(props: TechnologyEntityProps): TechnologyEntity {
    return new TechnologyEntity(props)
  }

  static init({
    player_id,
    code
  }: { player_id: string, code: TechnologyCode }): TechnologyEntity {
    return new TechnologyEntity({
      id: id(),
      code,
      player_id,
      level: 0,
      research_started_at: undefined,
    })
  }


  launchResearch({
    is_technology_in_progress,
    duration
  }: {
    is_technology_in_progress: boolean,
    duration: number
  }): TechnologyEntity {
    if (is_technology_in_progress) {
      throw new Error(TechnologyError.ALREADY_IN_PROGRESS)
    }

    const started = now()
    return new TechnologyEntity({
      ...this,
      research_at: started + duration * 1000,
      research_started_at: started
    })
  }

  finishResearch(): TechnologyEntity {
    return new TechnologyEntity({
      ...this,
      level: this.level + 1,
      research_at: undefined,
      research_started_at: undefined
    })
  }

  cancel(): TechnologyEntity {
    return new TechnologyEntity({
      ...this,
      research_at: undefined,
      research_started_at: undefined
    })
  }
}
