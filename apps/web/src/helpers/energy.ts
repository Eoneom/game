const ENERGY_WARN_RATIO = 0.7
const PHOTOVOLTAIC_EFFICIENCY_MULTIPLIER_PER_LEVEL = 1.15

export function formatPhotovoltaicCoeff(level: number): string {
  const value =
    level <= 0
      ? 1
      : Math.pow(PHOTOVOLTAIC_EFFICIENCY_MULTIPLIER_PER_LEVEL, level)
  const rounded = Math.round(value * 100) / 100
  return `×${rounded}`
}

export function getEnergyDisplayStatus(
  consumption: number,
  production: number
): 'success' | 'warn' | 'danger' {
  if (consumption > production) {
    return 'danger'
  }

  if (production > 0 && consumption >= production * ENERGY_WARN_RATIO) {
    return 'warn'
  }

  return 'success'
}

export function getEnergyUsagePercent(
  consumption: number,
  production: number
): number {
  if (production <= 0) {
    return consumption > 0 ? 100 : 0
  }

  return Math.min(100, Math.max(0, (consumption / production) * 100))
}
