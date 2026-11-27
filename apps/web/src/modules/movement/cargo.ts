import type { Resource } from '@eoneom/api-client'

/** Cargo of a movement, e.g. "300 plastique · 12 eau pure"; empty when it carries nothing. */
export const formatCargo = (resources: Resource): string => [
  resources.plastic > 0 ? `${resources.plastic} plastique` : null,
  resources.mushroom > 0 ? `${resources.mushroom} champignon` : null,
  resources.plasma > 0 ? `${resources.plasma} plasma` : null,
  resources.water > 0 ? `${resources.water} eau pure` : null,
].filter(Boolean).join(' · ')
