import { runCommand } from '#command/run'
import { bootstrapPlayer } from '#command/player/bootstrap'
import { FactionService } from '#core/faction/service'

export interface SignupAuthParams {
  city_name: string
  player_name: string
  faction_code: string
}

export interface SignupAuthResult {
  player_id: string
  city_id: string
}

export async function signupAuth({
  player_name,
  city_name,
  faction_code,
}: SignupAuthParams): Promise<SignupAuthResult> {
  return runCommand('auth:signup', async () => {
    FactionService.assertPlayable(faction_code)

    return bootstrapPlayer({
      player_name,
      city_name,
      faction_code,
      system_controlled: false
    })
  })
}
