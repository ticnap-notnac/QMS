import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { requirePermission } from '../middlewares/roleMiddleware.js'
import { requireApiKey } from '../middlewares/apiKeyMiddleware.js'
import {
  getApiKeys,
  createApiKey,
  updateApiKeyStatus,
  deleteApiKey,
  getWebhooks,
  createWebhook,
  removeWebhook,
  testWebhookPing,
  getInventoryRecords,
  importInventoryBatch,
  lookupInventoryForQddrAutofill,
  getIntegrationLogs,
  logClientDataExport,
  externalSyncInventory,
  externalListInventory,
  externalGetClosedQddrs,
  externalAcknowledgeQddr,
  externalSimulatorWebhookReceiver
} from '../controllers/integrationController.js'

// ─── 1. Internal / Admin Integration Router (/api/integrations) ──────────────
export const internalIntegrationRouter = Router()

internalIntegrationRouter.use(authMiddleware)

// Lookup & Export logging are accessible to any authenticated user filing or exporting a QDDR
internalIntegrationRouter.get('/lookup', lookupInventoryForQddrAutofill)
internalIntegrationRouter.post('/export-log', logClientDataExport)
internalIntegrationRouter.get('/inventory', getInventoryRecords)

// Admin-level integration management
const adminOrCategoryPerms = ['admin_panel', 'manage_users', 'manage_categories', 'manage_roles']

internalIntegrationRouter.get('/api-keys', requirePermission(adminOrCategoryPerms), getApiKeys)
internalIntegrationRouter.post('/api-keys', requirePermission(adminOrCategoryPerms), createApiKey)
internalIntegrationRouter.patch('/api-keys/:id', requirePermission(adminOrCategoryPerms), updateApiKeyStatus)
internalIntegrationRouter.delete('/api-keys/:id', requirePermission(adminOrCategoryPerms), deleteApiKey)

internalIntegrationRouter.get('/webhooks', requirePermission(adminOrCategoryPerms), getWebhooks)
internalIntegrationRouter.post('/webhooks', requirePermission(adminOrCategoryPerms), createWebhook)
internalIntegrationRouter.post('/webhooks/test', requirePermission(adminOrCategoryPerms), testWebhookPing)
internalIntegrationRouter.delete('/webhooks/:id', requirePermission(adminOrCategoryPerms), removeWebhook)

internalIntegrationRouter.post('/inventory/import', requirePermission(adminOrCategoryPerms), importInventoryBatch)
internalIntegrationRouter.get('/logs', requirePermission(adminOrCategoryPerms), getIntegrationLogs)

// ─── 2. External Public Gateway Router (/api/v1/external) ────────────────────
export const externalApiRouter = Router()

// Dedicated strict rate limiter for external API endpoints (60 requests/min)
const externalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'External API rate limit exceeded (max 60 requests per minute).' },
  standardHeaders: true,
  legacyHeaders: false
})

externalApiRouter.use(externalRateLimiter)

// Loopback webhook receiver for live defense demonstration
externalApiRouter.post('/simulator/webhook-receiver', externalSimulatorWebhookReceiver)

// Scoped API Key endpoints
externalApiRouter.post('/inventory/sync', requireApiKey('inventory:write'), externalSyncInventory)
externalApiRouter.get('/inventory', requireApiKey('inventory:read'), externalListInventory)
externalApiRouter.get('/qddr/closed', requireApiKey('qddr:read'), externalGetClosedQddrs)
externalApiRouter.post('/qddr/:id/acknowledge', requireApiKey('qddr:write'), externalAcknowledgeQddr)
