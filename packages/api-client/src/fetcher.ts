export class Fetcher {
  private base_url: string

  constructor({ base_url }: { base_url: string}) {
    this.base_url = base_url
  }

  public async get<T>(
    path: string,
    { token, searchParams }: { token: string; searchParams?: Record<string, string | number> }
  ): Promise<T> {
    return this.request({
      method: 'GET',
      path,
      token,
      searchParams
    })
  }

  public async post<T>(path: string, {
    body,
    token
  }: {
    body?: unknown
    token?: string
  }): Promise<T> {
    return this.request({
      method: 'POST',
      path,
      body,
      token
    })
  }

  public async put<T>(path: string, {
    body,
    token
  }: {
    body?: unknown
    token?: string
  }): Promise<T> {
    return this.request({
      method: 'PUT',
      path,
      body,
      token
    })
  }

  public async delete<T>(path: string, {
    token
  }: {
    token?: string
  }): Promise<T> {
    return this.request({
      method: 'DELETE',
      path,
      token
    })
  }

  private async request<T>({
    method,
    path,
    body,
    token,
    searchParams
  }: {
    method: string,
    path: string,
    body?: unknown
    token?: string
    searchParams?: Record<string, string | number>
  }): Promise<T> {
    const url = this.getUrl(path, searchParams)
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (token) {
      headers.append('Authorization', token)
    }
    return fetch(url, {
      method,
      headers,
      body: JSON.stringify(body)
    }).then(data => data.json())
  }

  private getUrl(path: string, searchParams?: Record<string, string | number>) {
    const base = `${this.base_url}${path}`
    if (!searchParams || Object.keys(searchParams).length === 0) {
      return base
    }
    const query = new URLSearchParams(
      Object.entries(searchParams).map(([key, value]) => [key, String(value)])
    ).toString()
    return `${base}?${query}`
  }
}
