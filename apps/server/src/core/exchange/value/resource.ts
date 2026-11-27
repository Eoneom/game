/** Resources traded for water on the faction exchange (slice 035): one book per resource. */
export enum ExchangeResource {
  PLASTIC = 'plastic',
  MUSHROOM = 'mushroom',
  PLASMA = 'plasma',
}

export const isExchangeResource = (value: unknown): value is ExchangeResource => Object.values(ExchangeResource).includes(value as ExchangeResource)
