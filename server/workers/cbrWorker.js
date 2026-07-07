import boss from '../utils/queue.js'
import logger from '../utils/logger.js'
import { generateAiSuggestion } from '../services/suggestionService.js'

export const registerWorkers = async () => {
  // Ensure queues exist before workers attach (required in newer pg-boss versions)
  await boss.createQueue('cbr-suggestion')
  await boss.createQueue('cbr-suggestion-text')

  // Worker for NCR CBR generation
  await boss.work('cbr-suggestion', async (jobs) => {
    // pg-boss v9+ passes an array of jobs. Since batch size is 1 by default, we take the first.
    const job = Array.isArray(jobs) ? jobs[0] : jobs
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
  await boss.work('cbr-suggestion-text', async (jobs) => {
    const job = Array.isArray(jobs) ? jobs[0] : jobs
    const { description, issueType, deptName } = job.data
    logger.info(`Processing text CBR job for issueType: ${issueType}`)
    try {
      const { generateAiSuggestionFromText } = await import('../services/suggestionService.js')
      const result = await generateAiSuggestionFromText({ description, issueType, deptName })
      logger.info(`Successfully completed text CBR job`)
      return result
    } catch (error) {
      logger.error(`Failed text CBR job: ${error.message}\n${error.stack}`)
      throw error
    }
  })
}
