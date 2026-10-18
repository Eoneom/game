import { Fetcher } from '../../fetcher'
import { AdminSystemPlayerObservabilityResponse } from './system-player-observability'
import { AdminSystemPlayerStatsResponse } from './system-player-stats'
import { AdminForceSystemPlayerTickResponse } from './system-player-tick'
import {
  AdminCombatSimulatorRequest,
  AdminCombatSimulatorResponse,
} from './combat-simulator'

export class AdminEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  getSystemPlayerObservability(token: string): Promise<AdminSystemPlayerObservabilityResponse> {
    return this.fetcher.get('/admin/system-player-observability', { token })
  }

  getSystemPlayerStats(token: string): Promise<AdminSystemPlayerStatsResponse> {
    return this.fetcher.get('/admin/system-player-stats', { token })
  }

  forceSystemPlayerTick(token: string): Promise<AdminForceSystemPlayerTickResponse> {
    return this.fetcher.post('/admin/system-player-tick', { token })
  }

  simulateCombat(
    token: string,
    body: AdminCombatSimulatorRequest,
  ): Promise<AdminCombatSimulatorResponse> {
    return this.fetcher.post('/admin/combat-simulator', { token, body })
  }
}
