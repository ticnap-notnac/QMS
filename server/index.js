import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import userRoutes from './routes/userRoutes.js'
import roleRoutes from './routes/roleRoutes.js'
import departmentRoutes from './routes/departmentRoutes.js'
import locationRoutes from './routes/locationRoutes.js'
import productTypeRoutes from './routes/productTypeRoutes.js'
import issueTypeRoutes from './routes/issueTypeRoutes.js'
import logRoutes from './routes/logRoutes.js'
import debugRoutes from './routes/debugRoutes.js'
import ncrRoutes from './routes/ncrRoutes.js'
import suggestionRoutes from './routes/suggestionRoutes.js'
import carRoutes from './routes/carRoutes.js'
import qddrRoutes from './routes/qddrRoutes.js'
import complianceRoutes from './routes/complianceRoutes.js'
import siteRoutes from './routes/siteRoutes.js'
import auditChecklistRoutes from './routes/auditChecklistRoutes.js'
import { authMiddleware } from './middlewares/authMiddleware.js'
import { errorHandler } from './middlewares/errorMiddleware.js'

const app = express()

import logger from './utils/logger.js'

app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`)
  next()
})

app.use(helmet())
app.disable('x-powered-by')

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 5000, // 5000 requests in dev to avoid hot-reload blocking
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

app.use(express.json())

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }))

app.use('/api/users', authMiddleware, userRoutes)
app.use('/api/roles', authMiddleware, roleRoutes)
app.use('/api/departments', authMiddleware, departmentRoutes)
app.use('/api', authMiddleware, locationRoutes)
app.use('/api', authMiddleware, productTypeRoutes)
app.use('/api', authMiddleware, issueTypeRoutes)
app.use('/api/logs', authMiddleware, logRoutes)
app.use('/api/debug', authMiddleware, debugRoutes)
app.use('/api', authMiddleware, ncrRoutes)
app.use('/api/suggestions', authMiddleware, suggestionRoutes)
app.use('/api', authMiddleware, carRoutes)
app.use('/api', authMiddleware, qddrRoutes)
app.use('/api/compliance', authMiddleware, complianceRoutes)
app.use('/api', authMiddleware, siteRoutes)
app.use('/api', authMiddleware, auditChecklistRoutes)

app.use(errorHandler)

export default app
