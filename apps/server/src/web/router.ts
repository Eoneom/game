import { Router } from 'express'
import { authMiddleware } from '#web/middleware/auth'
import { buildingCancelHandler } from '#web/handler/building/cancel'
import { buildingCancelQueuedHandler } from '#web/handler/building/cancel-queued'
import { buildingGetHandler } from '#web/handler/building/get'
import { buildingListHandler } from '#web/handler/building/list'
import { buildingUpgradeHandler } from '#web/handler/building/upgrade'
import { cityGetHandler } from '#web/handler/city/get'
import { cityListHandler } from '#web/handler/city/list'
import { communicationListReportHandler } from '#web/handler/communication/report/list'
import { loginHandler } from '#web/handler/player/login'
import { signupHandler } from '#web/handler/player/signup'
import { technologyCancelHandler } from '#web/handler/technology/cancel'
import { technologyListHandler } from '#web/handler/technology/list'
import { technologyResearchHandler } from '#web/handler/technology/research'
import { troopCancelHandler } from '#web/handler/troop/cancel'
import { troopListCityHandler } from '#web/handler/troop/list/city'
import { troopListOutpostHandler } from '#web/handler/troop/list/outpost'
import { troopListMovementHandler } from '#web/handler/troop/movement/list'
import { troopRecruitHandler } from '#web/handler/troop/recruit'
import { worldGetSectorHandler } from '#web/handler/world/get-sector'
import { technologyGetHandler } from '#web/handler/technology/get'
import { outpostListHandler } from '#web/handler/outpost/list'
import { outpostGetHandler } from '#web/handler/outpost/get'
import { outpostSetPermanentHandler } from '#web/handler/outpost/set-permanent'
import { communicationGetReportHandler } from '#web/handler/communication/report/get'
import { communicationCountUnreadReportHandler } from '#web/handler/communication/report/count-unread'
import { communicationMarkReportHandler } from '#web/handler/communication/report/mark'
import { communicationMarkAllReportsHandler } from '#web/handler/communication/report/mark-all'
import { logoutHandler } from '#web/handler/player/logout'
import { troopGetMovementHandler } from '#web/handler/troop/movement/get'
import { troopEstimateMovementHandler } from '#web/handler/troop/movement/estimate'
import { troopCreateMovementHandler } from '#web/handler/troop/movement/create'
import { troopGetHandler } from '#web/handler/troop/get'
import { citySettleHandler } from '#web/handler/city/settle'

export const router = (): Router => {
  const r = Router()

  r.get('/', (req, res) => {
    res.send({ status: 'ok' })
  })

  // Unauthenticated routes
  r.post('/player/login', loginHandler)
  r.post('/player/signup', signupHandler)
  r.post('/player/logout', logoutHandler)

  // Authenticated routes
  r.get('/city', authMiddleware, cityListHandler)
  r.get('/city/:city_id', authMiddleware, cityGetHandler)
  r.post('/city', authMiddleware, citySettleHandler)

  r.put('/building/cancel', authMiddleware, buildingCancelHandler)
  r.put('/building/queue/cancel', authMiddleware, buildingCancelQueuedHandler)
  r.put('/building/upgrade', authMiddleware, buildingUpgradeHandler)
  r.get('/city/:city_id/building', authMiddleware, buildingListHandler)
  r.get('/city/:city_id/building/:building_code', authMiddleware, buildingGetHandler)

  r.get('/technology', authMiddleware, technologyListHandler)
  r.put('/technology/cancel', authMiddleware, technologyCancelHandler)
  r.put('/technology/research', authMiddleware, technologyResearchHandler)
  r.get('/city/:city_id/technology/:technology_code', authMiddleware, technologyGetHandler)

  r.get('/troop/movement', authMiddleware, troopListMovementHandler)
  r.post('/troop/movement', authMiddleware, troopCreateMovementHandler)
  r.get('/troop/movement/:movement_id', authMiddleware, troopGetMovementHandler)
  r.post('/troop/movement/estimate', authMiddleware, troopEstimateMovementHandler)

  r.get('/troop/:troop_id', authMiddleware, troopGetHandler)
  r.put('/troop/cancel', authMiddleware, troopCancelHandler)
  r.put('/troop/recruit', authMiddleware, troopRecruitHandler)
  r.get('/city/:city_id/troop', authMiddleware, troopListCityHandler)
  r.get('/outpost/:outpost_id/troop', authMiddleware, troopListOutpostHandler)

  r.get('/outpost', authMiddleware, outpostListHandler)
  r.get('/outpost/:outpost_id', authMiddleware, outpostGetHandler)
  r.put('/outpost/permanent', authMiddleware, outpostSetPermanentHandler)

  r.get('/sector/:sector', authMiddleware, worldGetSectorHandler)

  r.get('/communication/report', authMiddleware, communicationListReportHandler)
  r.put('/communication/report/mark', authMiddleware, communicationMarkReportHandler)
  r.put('/communication/report/mark-all', authMiddleware, communicationMarkAllReportsHandler)
  r.get('/communication/report/unread/count', authMiddleware, communicationCountUnreadReportHandler)
  r.get('/communication/report/:report_id', authMiddleware, communicationGetReportHandler)

  return r
}
