import { Fetcher } from '../../fetcher'
import {
  LoginRequest,
  LoginResponse
} from './login'
import { LogoutResponse } from './logout'
import {
  PlayerSearchRequest,
  PlayerSearchResponse
} from './search'
import {
  SignupRequest,
  SignupResponse
} from './signup'

export class PlayerEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  login(body: LoginRequest): Promise<LoginResponse> {
    return this.fetcher.post('/player/login', { body })
  }

  signup(body: SignupRequest): Promise<SignupResponse> {
    return this.fetcher.post('/player/signup', { body })
  }

  logout(token: string): Promise<LogoutResponse> {
    return this.fetcher.post('/player/logout', { token })
  }

  search(token: string, { q }: PlayerSearchRequest): Promise<PlayerSearchResponse> {
    return this.fetcher.get('/player/search', {
      token,
      searchParams: { q }
    })
  }
}
