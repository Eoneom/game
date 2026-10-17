import type { SystemTickCategory } from '#core/player/system/tick-category'

export type SystemPlayerTickAttempt = {
  category: SystemTickCategory
  result: 'skipped' | 'success'
}
