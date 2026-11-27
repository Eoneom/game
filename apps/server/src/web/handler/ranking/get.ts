import {
  NextFunction,
  Request,
  Response
} from 'express'
import { RankingListResponse } from '@eoneom/api-client/src/endpoints/ranking/list'
import { RankingMeResponse } from '@eoneom/api-client/src/endpoints/ranking/me'
import { getPlayerIdFromContext } from '#web/helpers'
import { RankingListQuery } from '#query/ranking/list'
import { RankingMeQuery } from '#query/ranking/me'
import { RANKING_PAGE_SIZE } from '#core/ranking/constant/limits'
import {
  isRankingCategory,
  RankingCategory
} from '#core/ranking/value/category'
import {
  isRankingKind,
  RankingKind
} from '#core/ranking/value/kind'

const parsePage = (raw: Request['query']['page']): number => {
  const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(value) && value >= 1 ? value : 1
}

/** `GET /ranking?category=&kind=&page=`: unknown values fall back to `global`, `player` and page 1. */
export const rankingListHandler = async (
  req: Request,
  res: Response<RankingListResponse>,
  next: NextFunction
) => {
  try {
    getPlayerIdFromContext(res)
    const category = isRankingCategory(req.query.category) ? req.query.category : RankingCategory.GLOBAL
    const kind = isRankingKind(req.query.kind) ? req.query.kind : RankingKind.PLAYER
    const {
      computed_at, page, total, rows
    } = await new RankingListQuery().run({
      category,
      kind,
      page: parsePage(req.query.page)
    })

    return res.json({
      status: 'ok',
      data: {
        computed_at,
        category,
        kind,
        page,
        page_size: RANKING_PAGE_SIZE,
        total,
        rows,
      }
    })
  } catch (err) {
    next(err)
  }
}

export const rankingMeHandler = async (
  _req: Request,
  res: Response<RankingMeResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const {
      computed_at, positions
    } = await new RankingMeQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: {
        computed_at,
        positions
      }
    })
  } catch (err) {
    next(err)
  }
}
