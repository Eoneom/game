type WsEventHandler<T = unknown> = (payload: T) => void

class WsClient {
  private ws: WebSocket | null = null
  private handlers: Map<string, Array<WsEventHandler>> = new Map()

  connect(token: string): void {
    if (this.ws) {
      this.ws.close()
    }

    this.ws = new WebSocket(`ws://localhost:3000?token=${token}`)

    this.ws.onmessage = (event) => {
      try {
        const { type, ...payload } = JSON.parse(event.data as string)
        this.handlers.get(type)?.forEach((handler) => handler(payload))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onerror = () => {
      this.ws = null
    }

    this.ws.onclose = () => {
      this.ws = null
    }
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }

  /** Returns a function that removes the handler (for component-scoped listeners). */
  on<T = unknown>(type: string, handler: WsEventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, [])
    }
    this.handlers.get(type)?.push(handler as WsEventHandler)

    return () => {
      const handlers = this.handlers.get(type)
      if (!handlers) return
      this.handlers.set(type, handlers.filter(candidate => candidate !== handler))
    }
  }
}

export const wsClient = new WsClient()
