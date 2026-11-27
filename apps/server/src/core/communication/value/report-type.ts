export enum ReportType {
  EXPLORATION = 'exploration',
  BASE = 'base',
  REBASE = 'rebase',
  TRANSPORT = 'transport',
  BATTLE = 'battle',
  SPY = 'spy',
  SPY_DETECTED = 'spy_detected',
  /** Arrival notice to the host when allied troops are stationed in their city (slice 033). */
  REINFORCEMENT = 'reinforcement',
  /** One per party on each faction exchange fill (slice 035). */
  TRADE = 'trade',
}
