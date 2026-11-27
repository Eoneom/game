import {
  NextFunction,
  Request,
  Response
} from 'express'
import { AllianceGetResponse } from '@eoneom/api-client/src/endpoints/alliance/get'
import { AllianceMineResponse } from '@eoneom/api-client/src/endpoints/alliance/mine'
import { AllianceSearchResponse } from '@eoneom/api-client/src/endpoints/alliance/search'
import { getPlayerIdFromContext } from '#web/helpers'
import { allianceDetailsMapper } from '#web/handler/alliance/mapper'
import { AllianceGetQuery } from '#query/alliance/get'
import { AllianceMineQuery } from '#query/alliance/mine'
import { AllianceSearchQuery } from '#query/alliance/search'

export const allianceMineHandler = async (
  _req: Request,
  res: Response<AllianceMineResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const {
      alliance, cooldown_until
    } = await new AllianceMineQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: {
        alliance: alliance
          ? {
            ...allianceDetailsMapper(alliance.entity),
            viewer_role: alliance.viewer_role,
            members: alliance.members,
          }
          : null,
        cooldown_until,
        viewer_player_id: player_id,
      }
    })
  } catch (err) {
    next(err)
  }
}

export const allianceSearchHandler = async (
  req: Request,
  res: Response<AllianceSearchResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const q = typeof req.query.q === 'string' ? req.query.q : ''
    const items = await new AllianceSearchQuery().run({
      player_id,
      q
    })

    return res.json({
      status: 'ok',
      data: {
        alliances: items.map(({
          alliance, member_count
        }) => ({
          id: alliance.id,
          name: alliance.name,
          tag: alliance.tag,
          member_count,
        }))
      }
    })
  } catch (err) {
    next(err)
  }
}

export const allianceGetHandler = async (
  req: Request,
  res: Response<AllianceGetResponse>,
  next: NextFunction
) => {
  try {
    getPlayerIdFromContext(res)
    const {
      alliance, member_count, chef
    } = await new AllianceGetQuery().run({ alliance_id: String(req.params.alliance_id ?? '') })

    return res.json({
      status: 'ok',
      data: {
        ...allianceDetailsMapper(alliance),
        member_count,
        chef,
      }
    })
  } catch (err) {
    next(err)
  }
}
