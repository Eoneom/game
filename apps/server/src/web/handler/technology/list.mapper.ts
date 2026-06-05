import {
  TechnologyListDataResponse
} from '@eoneom/api-client/src/endpoints/technology/list'
import { TechnologyListQueryResponse } from '#query/technology/list'

export const technologyListResponseMapper = ({
  technologies
}: TechnologyListQueryResponse): TechnologyListDataResponse => {
  return {
    technologies: technologies.map(technology => {
      if ('research_at' in technology) {
        return {
          id: technology.id,
          code: technology.code,
          level: technology.level,
          research_at: technology.research_at,
          research_started_at: technology.research_started_at
        }
      }
      return {
        id: technology.id,
        code: technology.code,
        level: technology.level
      }
    })
  }
}
