export interface Lock {
  has(key: string): boolean
  set(key: string): void
  delete(key: string): void
  /**
   * Runs `fn` once every earlier holder of `key` is done: holders of one key run one at a time, in arrival order
   * (faction exchange market lock, slice 035). Run it outside the command transaction so the next holder sees
   * the committed state.
   */
  runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T>
}
