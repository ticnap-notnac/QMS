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

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/users', userRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api', locationRoutes)
app.use('/api', productTypeRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/debug', debugRoutes)
app.use('/api', ncrRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
