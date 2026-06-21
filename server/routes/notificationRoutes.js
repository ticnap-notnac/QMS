import express from 'express'
import { sendNotificationEmail } from '../services/emailService.js'
import logger from '../utils/logger.js'

const router = express.Router()

router.post('/send-email', async (req, res) => {
  const { userId, title, message } = req.body

  if (!userId || !title || !message) {
    return res.status(400).json({ error: 'Missing required fields: userId, title, message' })
  }

  try {
    // Fire and forget email sending
    sendNotificationEmail(userId, title, message)
      .catch((err) => logger.error(`Background email send failed: ${err.message}`))
    
    res.status(200).json({ success: true, message: 'Email dispatch queued.' })
  } catch (error) {
    logger.error(`Error queuing email: ${error.message}`)
    res.status(500).json({ error: 'Failed to queue email dispatch.' })
  }
})

export default router
