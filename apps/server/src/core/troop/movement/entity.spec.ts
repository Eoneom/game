import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementKind } from '#core/troop/constant/movement-kind'
import { MovementEntity } from '#core/troop/movement/entity'

describe('MovementEntity.getKind (slice 045)', () => {
  const movement = (props: Partial<Parameters<typeof MovementEntity.create>[0]>) => MovementEntity.create({
    id: 'm1',
    player_id: 'p1',
    action: MovementAction.EXPLORE,
    origin: {
      x: 1,
      y: 1
    },
    destination: {
      x: 2,
      y: 2
    },
    ...props,
  })

  it('is outgoing by default (player orders, system AI movements, rows older than the migration)', () => {
    expect(movement({}).is_return).toBe(false)
    expect(movement({}).getKind()).toBe(MovementKind.OUTGOING)
    expect(movement({ action: MovementAction.ATTACK }).getKind()).toBe(MovementKind.OUTGOING)
  })

  it('is a return when flagged', () => {
    expect(movement({
      action: MovementAction.BASE,
      is_return: true
    }).getKind()).toBe(MovementKind.RETURN)
  })

  it('is a convoy for an exchange convoy and its carriers\' trip home, even flagged as a return', () => {
    expect(movement({
      action: MovementAction.EXCHANGE,
      exchange_trade_id: 't1'
    }).getKind()).toBe(MovementKind.CONVOY)
    expect(movement({
      action: MovementAction.BASE,
      exchange_trade_id: 't1',
      is_return: true
    }).getKind()).toBe(MovementKind.CONVOY)
  })
})
