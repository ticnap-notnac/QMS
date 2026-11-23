import boss from '../utils/queue.js'
import logger from '../utils/logger.js'
import { generateAiSuggestionFromText } from '../services/suggestionService.js'

export const registerWorkers = async () => {
  // Ensure queue exists before worker attaches (required in pg-boss v9+)
  await boss.createQueue('cbr-suggestion-text')

  // Worker for CAR & QDDR text CBR + RAG generation
  await boss.work('cbr-suggestion-text', async (jobs) => {
    const job = Array.isArray(jobs) ? jobs[0] : jobs
    const { description, rootCause = '', rcaMethod = '', issueType, deptName, reportType = 'CAR' } = job.data
    logger.info(`Processing text CBR job for reportType: ${reportType}, issueType: ${issueType}`)
    try {
      const result = await generateAiSuggestionFromText({
        description,
        rootCause,
        rcaMethod,
        issueType,
        deptName,
        reportType
      })
      logger.info(`Successfully completed text CBR job`)
      return result
    } catch (error) {
      logger.error(`Failed text CBR job: ${error.message}\n${error.stack}`)
      throw error
    }
  })
}
