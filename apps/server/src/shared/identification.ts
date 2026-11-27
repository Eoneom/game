import { v4 as uuidv4 } from 'uuid'

/** UUID string used as entity primary keys (Postgres). */
export const id = (): string => uuidv4()

export const generateToken = (): string => uuidv4()

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whether a client-supplied value can be an entity id (avoids Postgres uuid cast errors). */
export const isId = (value: unknown): value is string => typeof value === 'string' && ID_PATTERN.test(value)
