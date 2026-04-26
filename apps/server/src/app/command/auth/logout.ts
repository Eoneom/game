import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'

export interface LogoutAuthParams {
  token: string
}

export async function logoutAuth({ token }: LogoutAuthParams): Promise<void> {
  return runCommand('auth:logout', async () => {
    const repository = Factory.getRepository()

    let auth
    try {
      auth = await repository.auth.get({ token })
    } catch {
      return
    }

    await repository.auth.delete(auth.id)
  })
}
