import { OUTPOST_COUNT_LIMIT } from '#core/outpost/constant/limit'

export class OutpostService {
  static getCountLimit(): number {
    return OUTPOST_COUNT_LIMIT
  }

  static isLimitReached({ existing_outposts_count }: { existing_outposts_count: number }): boolean {
    return existing_outposts_count >= OUTPOST_COUNT_LIMIT
  }

  static shouldBuildTemporaryOutpost({
    city_exists,
    outpost_exists
  }: {
    city_exists: boolean,
    outpost_exists: boolean
  }): boolean {
    return !city_exists && !outpost_exists
  }
}
