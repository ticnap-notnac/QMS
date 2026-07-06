import boss from '../utils/queue.js'
import logger from '../utils/logger.js'
import { generateAiSuggestion } from '../services/suggestionService.js'

export const registerWorkers = async () => {
  // Worker for NCR CBR generation
  await boss.work('cbr-suggestion', async (job) => {
    const { ncrId, deptName, previousSuggestions } = job.data
    logger.info(`Processing CBR job for NCR: ${ncrId}`)
    try {
      const result = await generateAiSuggestion({ ncrId, deptName, previousSuggestions })
      logger.info(`Successfully completed CBR job for NCR: ${ncrId}`)
      return result
    } catch (error) {
      logger.error(`Failed CBR job for NCR ${ncrId}: ${error.message}`)
      throw error // This tells pg-boss the job failed so it can retry
    }
  })

  // Worker for general text CBR generation
  await boss.work('cbr-suggestion-text', async (job) => {
    const { description, issueType, deptName } = job.data
    logger.info(`Processing text CBR job for issueType: ${issueType}`)
    try {
      // Assuming generateAiSuggestionFromText exists and works similar to generateAiSuggestion
      const { generateAiSuggestionFromText } = await import('../services/suggestionService.js')
      const result = await generateAiSuggestionFromText({ description, issueType, deptName })
      logger.info(`Successfully completed text CBR job`)
      return result
    } catch (error) {
      logger.error(`Failed text CBR job: ${error.message}`)
      throw error
    }
  })
}
