import {
  TechnologyListDataResponse
} from '@eoneom/api-client/src/endpoints/technology/list'
import { TechnologyListQueryResponse } from '#query/technology/list'

export const technologyListResponseMapper = ({
  technologies,
  research_queue
}: TechnologyListQueryResponse): TechnologyListDataResponse => {
  return {
    technologies: technologies.map(technology => {
      const base = {
        id: technology.id,
        code: technology.code,
        level: technology.level,
        requirement: technology.requirement,
        ...(technology.research_cost
          ? {
            research_cost: {
              plastic: technology.research_cost.resource.plastic,
              mushroom: technology.research_cost.resource.mushroom,
              plasma: technology.research_cost.resource.plasma,
              duration: technology.research_cost.duration
            }
          }
          : {})
      }
      if ('research_at' in technology) {
        return {
          ...base,
          research_at: technology.research_at,
          research_started_at: technology.research_started_at
        }
      }
      return base
    }),
    research_queue
  }
}
