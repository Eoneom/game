/**
 * City size hint on the map (slice 044): total building levels below 20 → 1, below 50 → 2, below 80 → 3, else 4.
 * The exact total is never sent.
 */
export const CITY_SIZE_LEVEL_THRESHOLDS = [
  20,
  50,
  80
] as const
