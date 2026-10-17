import type {
  SystemPlayerTickAttempt,
  SystemPlayerTickObservabilityMessage,
  SystemPlayerTickObservabilityOutcome,
} from '@eoneom/api-client'

export type { SystemPlayerTickAttempt, SystemPlayerTickObservabilityOutcome }

export type SystemPlayerObservabilityEvent = Omit<
  SystemPlayerTickObservabilityMessage,
  'type'
>
