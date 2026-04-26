import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'

export interface AuthorizeAuthParams {
  token: string
  action_at: number
}

export interface AuthorizeAuthResult {
  player_id: string
}

export async function authorizeAuth({
  token,
  action_at,
}: AuthorizeAuthParams): Promise<AuthorizeAuthResult> {
  return runCommand('auth:authorize', async () => {
    const repository = Factory.getRepository()

    const auth = await repository.auth.get({ token })
    const updated_auth = auth.updateLastAction(action_at)

    await repository.auth.updateOne(updated_auth)

    return { player_id: updated_auth.player_id }
  })
}
