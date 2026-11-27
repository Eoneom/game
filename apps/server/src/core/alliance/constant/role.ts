/** Alliance roles (slice 033): exactly one `chef` per alliance. */
export enum AllianceRole {
  CHEF = 'chef',
  OFFICIER = 'officier',
  MEMBRE = 'membre',
}

export const isAllianceRole = (value: unknown): value is AllianceRole => {
  return Object.values(AllianceRole).includes(value as AllianceRole)
}
