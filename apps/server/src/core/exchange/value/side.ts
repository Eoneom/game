export enum ExchangeSide {
  BUY = 'buy',
  SELL = 'sell',
}

export const isExchangeSide = (value: unknown): value is ExchangeSide => Object.values(ExchangeSide).includes(value as ExchangeSide)
