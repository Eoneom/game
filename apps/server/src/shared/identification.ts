import { v4 as uuidv4 } from 'uuid'

/** UUID string used as entity primary keys (Postgres). */
export const id = (): string => uuidv4()

export const FAKE_ID = 'fake'

export const generateToken = (): string => uuidv4()
