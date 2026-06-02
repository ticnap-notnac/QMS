import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import userRoutes from './routes/userRoutes.js'
import roleRoutes from './routes/roleRoutes.js'
import departmentRoutes from './routes/departmentRoutes.js'
import locationRoutes from './routes/locationRoutes.js'
import productTypeRoutes from './routes/productTypeRoutes.js'
import logRoutes from './routes/logRoutes.js'
import debugRoutes from './routes/debugRoutes.js'
import ncrRoutes from './routes/ncrRoutes.js'
import suggestionRoutes from './routes/suggestionRoutes.js'
import carRoutes from './routes/carRoutes.js'
import qddrRoutes from './routes/qddrRoutes.js'
import { authMiddleware } from './middlewares/authMiddleware.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/users', authMiddleware, userRoutes)
app.use('/api/roles', authMiddleware, roleRoutes)
app.use('/api/departments', authMiddleware, departmentRoutes)
app.use('/api', authMiddleware, locationRoutes)
app.use('/api', authMiddleware, productTypeRoutes)
app.use('/api/logs', authMiddleware, logRoutes)
app.use('/api/debug', authMiddleware, debugRoutes)
app.use('/api', authMiddleware, ncrRoutes)
app.use('/api/suggestions', authMiddleware, suggestionRoutes)
app.use('/api', authMiddleware, carRoutes)
app.use('/api', authMiddleware, qddrRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
