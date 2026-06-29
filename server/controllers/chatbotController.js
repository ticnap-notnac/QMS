import { getRequestActor } from '../lib/requestUtils.js'
import logger from '../utils/logger.js'
import { processChatbotRequest } from '../services/chatbotService.js'

export async function handleChat(req, res) {
  const { message } = req.body
  const actorAuthId = getRequestActor(req)

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' })
  }

  logger.info('Chatbot request received', { actorAuthId })

  const { success, reply, error } = await processChatbotRequest(message, actorAuthId)

  if (!success) {
    logger.error('Chatbot processing error', { error })
    return res.status(500).json({ error: error || 'Assistant is currently unavailable.' })
  }

  return res.json({ reply })
}
