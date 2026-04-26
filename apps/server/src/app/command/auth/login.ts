import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AuthEntity } from '#core/auth/entity'

export interface LoginAuthParams {
  player_name: string
}

export interface LoginAuthResult {
  token: string
}

export async function loginAuth({ player_name }: LoginAuthParams): Promise<LoginAuthResult> {
  return runCommand('auth:login', async () => {
    const repository = Factory.getRepository()

    const player = await repository.player.getByName(player_name)
    const auth = AuthEntity.generate({ player_id: player.id })

    await repository.auth.create(auth)

    return { token: auth.token }
  })
}
