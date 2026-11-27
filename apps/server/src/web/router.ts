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
import { technologyCancelQueuedHandler } from '#web/handler/technology/cancel-queued'
import { technologyListHandler } from '#web/handler/technology/list'
import { technologyResearchHandler } from '#web/handler/technology/research'
import { troopCancelHandler } from '#web/handler/troop/cancel'
import { troopListCityHandler } from '#web/handler/troop/list/city'
import { troopListOutpostHandler } from '#web/handler/troop/list/outpost'
import { troopListMovementHandler } from '#web/handler/troop/movement/list'
import { troopRecruitHandler } from '#web/handler/troop/recruit'
import { worldGetCellsHandler } from '#web/handler/world/get-cells'
import { technologyGetHandler } from '#web/handler/technology/get'
import { outpostListHandler } from '#web/handler/outpost/list'
import { outpostGetHandler } from '#web/handler/outpost/get'
import { outpostSetPermanentHandler } from '#web/handler/outpost/set-permanent'
import { outpostSetCombatStrategyHandler } from '#web/handler/outpost/set-combat-strategy'
import { citySetCombatStrategyHandler } from '#web/handler/city/set-combat-strategy'
import { communicationGetReportHandler } from '#web/handler/communication/report/get'
import { communicationCountUnreadReportHandler } from '#web/handler/communication/report/count-unread'
import { communicationMarkReportHandler } from '#web/handler/communication/report/mark'
import { communicationMarkAllReportsHandler } from '#web/handler/communication/report/mark-all'
import { logoutHandler } from '#web/handler/player/logout'
import { playerSearchHandler } from '#web/handler/player/search'
import { communicationSendMailHandler } from '#web/handler/communication/mail/send'
import { communicationListMailHandler } from '#web/handler/communication/mail/list'
import { communicationGetMailHandler } from '#web/handler/communication/mail/get'
import { communicationCountUnreadMailHandler } from '#web/handler/communication/mail/count-unread'
import { communicationMarkMailHandler } from '#web/handler/communication/mail/mark'
import { communicationDeleteMailHandler } from '#web/handler/communication/mail/delete'
import { communicationChatHistoryHandler } from '#web/handler/communication/chat/history'
import { communicationPostChatMessageHandler } from '#web/handler/communication/chat/post'
import { communicationBlockPlayerHandler } from '#web/handler/communication/block/create'
import { communicationUnblockPlayerHandler } from '#web/handler/communication/block/delete'
import { communicationListBlockHandler } from '#web/handler/communication/block/list'
import { communicationCreateAbuseReportHandler } from '#web/handler/communication/abuse-report/create'
import { troopGetMovementHandler } from '#web/handler/troop/movement/get'
import { troopEstimateMovementHandler } from '#web/handler/troop/movement/estimate'
import { troopCreateMovementHandler } from '#web/handler/troop/movement/create'
import { troopGetHandler } from '#web/handler/troop/get'
import { troopMovementCapacityHandler } from '#web/handler/troop/movement/capacity'
import { troopListIncomingMovementHandler } from '#web/handler/troop/movement/incoming'
import { troopCancelQueuedHandler } from '#web/handler/troop/cancel-queued'
import { citySettleHandler } from '#web/handler/city/settle'
import { defenseListHandler } from '#web/handler/defense/list'
import { defenseBuildHandler } from '#web/handler/defense/build'
import { defenseCancelHandler } from '#web/handler/defense/cancel'
import { defenseCancelQueuedHandler } from '#web/handler/defense/cancel-queued'
import { cityActivityHandler, outpostActivityHandler } from '#web/handler/location/activity'
import { healthGetHandler } from '#web/handler/health/get'
import { adminSystemPlayerObservabilityGetHandler } from '#web/handler/admin/system-player-observability/get'
import { adminForceSystemPlayerTickPostHandler } from '#web/handler/admin/system-player-tick/post'
import { adminCombatSimulatorPostHandler } from '#web/handler/admin/combat-simulator/post'
import { adminSystemPlayerStatsGetHandler } from '#web/handler/admin/system-player-stats/get'
import { adminMiddleware } from '#web/middleware/admin'
import {
  allianceCreateHandler,
  allianceDissolveHandler,
  allianceUpdateDescriptionHandler
} from '#web/handler/alliance/create'
import {
  allianceGetHandler,
  allianceMineHandler,
  allianceSearchHandler
} from '#web/handler/alliance/get'
import {
  allianceAcceptInvitationHandler,
  allianceInviteHandler,
  allianceListInvitationHandler,
  allianceRefuseInvitationHandler
} from '#web/handler/alliance/invitation'
import {
  allianceAcceptApplicationHandler,
  allianceApplyHandler,
  allianceListApplicationHandler,
  allianceRefuseApplicationHandler,
  allianceWithdrawApplicationHandler
} from '#web/handler/alliance/application'
import {
  allianceKickHandler,
  allianceLeaveHandler,
  allianceSetRoleHandler,
  allianceTransferLeadershipHandler
} from '#web/handler/alliance/member'
import {
  troopReinforcementAbroadHandler,
  troopReinforcementListHandler
} from '#web/handler/troop/reinforcement/list'

const CANONICAL_HEALTH_PATH = '/api/v1/health'

export const router = (): Router => {
  const r = Router()

  r.get(CANONICAL_HEALTH_PATH, healthGetHandler)
  r.get('/health', (_req, res) => {
    res.redirect(308, CANONICAL_HEALTH_PATH)
  })
  r.get('/', (_req, res) => {
    res.redirect(308, CANONICAL_HEALTH_PATH)
  })

  // Unauthenticated routes
  r.post('/player/login', loginHandler)
  r.post('/player/signup', signupHandler)
  r.post('/player/logout', logoutHandler)

  // Authenticated routes
  r.get('/player/search', authMiddleware, playerSearchHandler)

  r.get('/city', authMiddleware, cityListHandler)
  r.get('/city/:city_id', authMiddleware, cityGetHandler)
  r.get('/city/:city_id/activity', authMiddleware, cityActivityHandler)
  r.post('/city', authMiddleware, citySettleHandler)
  r.put('/city/:city_id/combat-strategy', authMiddleware, citySetCombatStrategyHandler)

  r.put('/building/cancel', authMiddleware, buildingCancelHandler)
  r.put('/building/queue/cancel', authMiddleware, buildingCancelQueuedHandler)
  r.put('/building/upgrade', authMiddleware, buildingUpgradeHandler)
  r.get('/city/:city_id/building', authMiddleware, buildingListHandler)
  r.get('/city/:city_id/building/:building_code', authMiddleware, buildingGetHandler)

  r.get('/technology', authMiddleware, technologyListHandler)
  r.put('/technology/cancel', authMiddleware, technologyCancelHandler)
  r.put('/technology/queue/cancel', authMiddleware, technologyCancelQueuedHandler)
  r.put('/technology/research', authMiddleware, technologyResearchHandler)
  r.get('/city/:city_id/technology/:technology_code', authMiddleware, technologyGetHandler)

  r.get('/troop/movement', authMiddleware, troopListMovementHandler)
  r.post('/troop/movement', authMiddleware, troopCreateMovementHandler)
  r.get('/troop/movement/capacity', authMiddleware, troopMovementCapacityHandler)
  r.get('/troop/movement/incoming', authMiddleware, troopListIncomingMovementHandler)
  r.get('/troop/movement/:movement_id', authMiddleware, troopGetMovementHandler)
  r.post('/troop/movement/estimate', authMiddleware, troopEstimateMovementHandler)

  r.get('/troop/reinforcement', authMiddleware, troopReinforcementListHandler)
  r.get('/troop/reinforcement/abroad', authMiddleware, troopReinforcementAbroadHandler)

  r.get('/troop/:troop_id', authMiddleware, troopGetHandler)
  r.put('/troop/cancel', authMiddleware, troopCancelHandler)
  r.put('/troop/queue/cancel', authMiddleware, troopCancelQueuedHandler)
  r.put('/troop/recruit', authMiddleware, troopRecruitHandler)
  r.get('/city/:city_id/troop', authMiddleware, troopListCityHandler)
  r.get('/outpost/:outpost_id/troop', authMiddleware, troopListOutpostHandler)

  r.get('/city/:city_id/defense', authMiddleware, defenseListHandler)
  r.put('/defense/build', authMiddleware, defenseBuildHandler)
  r.put('/defense/cancel', authMiddleware, defenseCancelHandler)
  r.put('/defense/queue/cancel', authMiddleware, defenseCancelQueuedHandler)

  r.get('/outpost', authMiddleware, outpostListHandler)
  r.get('/outpost/:outpost_id', authMiddleware, outpostGetHandler)
  r.get('/outpost/:outpost_id/activity', authMiddleware, outpostActivityHandler)
  r.put('/outpost/permanent', authMiddleware, outpostSetPermanentHandler)
  r.put('/outpost/:outpost_id/combat-strategy', authMiddleware, outpostSetCombatStrategyHandler)

  r.get('/world/cells', authMiddleware, worldGetCellsHandler)

  r.get('/communication/report', authMiddleware, communicationListReportHandler)
  r.put('/communication/report/mark', authMiddleware, communicationMarkReportHandler)
  r.put('/communication/report/mark-all', authMiddleware, communicationMarkAllReportsHandler)
  r.get('/communication/report/unread/count', authMiddleware, communicationCountUnreadReportHandler)
  r.get('/communication/report/:report_id', authMiddleware, communicationGetReportHandler)

  r.post('/communication/mail', authMiddleware, communicationSendMailHandler)
  r.get('/communication/mail', authMiddleware, communicationListMailHandler)
  r.get('/communication/mail/unread/count', authMiddleware, communicationCountUnreadMailHandler)
  r.put('/communication/mail/mark', authMiddleware, communicationMarkMailHandler)
  r.get('/communication/mail/:mail_id', authMiddleware, communicationGetMailHandler)
  r.delete('/communication/mail/:mail_id', authMiddleware, communicationDeleteMailHandler)

  r.get('/communication/chat/:channel', authMiddleware, communicationChatHistoryHandler)
  r.post('/communication/chat/:channel', authMiddleware, communicationPostChatMessageHandler)

  r.post('/communication/block', authMiddleware, communicationBlockPlayerHandler)
  r.get('/communication/block', authMiddleware, communicationListBlockHandler)
  r.delete('/communication/block/:player_id', authMiddleware, communicationUnblockPlayerHandler)

  r.post('/communication/abuse-report', authMiddleware, communicationCreateAbuseReportHandler)

  // Alliances (slice 033): static paths before `/alliance/:alliance_id`.
  r.post('/alliance', authMiddleware, allianceCreateHandler)
  r.get('/alliance', authMiddleware, allianceSearchHandler)
  r.delete('/alliance', authMiddleware, allianceDissolveHandler)
  r.get('/alliance/mine', authMiddleware, allianceMineHandler)
  r.put('/alliance/description', authMiddleware, allianceUpdateDescriptionHandler)
  r.post('/alliance/invitation', authMiddleware, allianceInviteHandler)
  r.get('/alliance/invitation', authMiddleware, allianceListInvitationHandler)
  r.put('/alliance/invitation/:invitation_id/accept', authMiddleware, allianceAcceptInvitationHandler)
  r.put('/alliance/invitation/:invitation_id/refuse', authMiddleware, allianceRefuseInvitationHandler)
  r.get('/alliance/application', authMiddleware, allianceListApplicationHandler)
  r.put('/alliance/application/:application_id/accept', authMiddleware, allianceAcceptApplicationHandler)
  r.put('/alliance/application/:application_id/refuse', authMiddleware, allianceRefuseApplicationHandler)
  r.delete('/alliance/application/:application_id', authMiddleware, allianceWithdrawApplicationHandler)
  r.put('/alliance/member/:player_id/role', authMiddleware, allianceSetRoleHandler)
  r.delete('/alliance/member/:player_id', authMiddleware, allianceKickHandler)
  r.put('/alliance/leader', authMiddleware, allianceTransferLeadershipHandler)
  r.post('/alliance/leave', authMiddleware, allianceLeaveHandler)
  r.get('/alliance/:alliance_id', authMiddleware, allianceGetHandler)
  r.post('/alliance/:alliance_id/application', authMiddleware, allianceApplyHandler)

  r.get('/admin/system-player-observability', authMiddleware, adminSystemPlayerObservabilityGetHandler)
  r.get('/admin/system-player-stats', authMiddleware, adminMiddleware, adminSystemPlayerStatsGetHandler)
  r.post('/admin/system-player-tick', authMiddleware, adminMiddleware, adminForceSystemPlayerTickPostHandler)
  r.post('/admin/combat-simulator', authMiddleware, adminMiddleware, adminCombatSimulatorPostHandler)

  return r
}
