import app from './index.js'
import logger from './utils/logger.js'

const PORT = process.env.PORT || 3000

// Catch unhandled promise rejections and uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})

// Catch server startup errors (like Port Already in Use)
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error
  }
  
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please check if another server is running.`)
  } else {
    logger.error(`Server error: ${error.message}`)
  }
  process.exit(1)
})
