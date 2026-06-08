import assert from 'assert'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  OutpostListDataResponse,
  OutpostListResponse
} from '@eoneom/api-client/src/endpoints/outpost/list'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  OutpostListQuery,
  OutpostListQueryResponse
} from '#query/outpost/list'

export const outpostListHandler = async (
  req: Request,
  res: Response<OutpostListResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new OutpostListQuery().run({ player_id })
    const response = response_mapper(result)

    return res.json({
      status: 'ok',
      data: response
    })
  } catch (err) {
    next(err)
  }
}

const response_mapper = ({
  outposts,
  cells,
  resource_stocks,
  count_limit
}: OutpostListQueryResponse): OutpostListDataResponse => {
  const outposts_response: OutpostListDataResponse['outposts'] = outposts.map(outpost => {
    const cell = cells.find(c => c.id === outpost.cell_id)
    assert(cell)
    const stock = resource_stocks.find(s => s.cell_id === outpost.cell_id)
    assert(stock)

    return {
      id: outpost.id,
      coordinates: cell.coordinates,
      type: outpost.type,
      plastic: stock.plastic,
      mushroom: stock.mushroom,
      plasma: stock.plasma
    }
  })

  return {
    outposts: outposts_response,
    count_limit
  }
}
