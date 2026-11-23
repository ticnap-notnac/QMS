import { generateAiSuggestionFromText, autoClassifyTags, generateEvidenceDescription, scanPalletLabel } from '../services/suggestionService.js'
import boss from '../utils/queue.js'

export async function generateSuggestionFromText(req, res, next) {
  try {
    const { description, rootCause = '', rcaMethod = '', issueType, deptName, reportType = 'CAR' } = req.body

    // Enqueue to pg-boss background worker
    const jobId = await boss.send('cbr-suggestion-text', {
      description,
      rootCause,
      rcaMethod,
      issueType,
      deptName,
      reportType
    })

    return res.status(202).json({ success: true, message: 'Text suggestion generation started in the background', jobId, queue: 'cbr-suggestion-text' })
  } catch (err) {
    next(err)
  }
}

export async function classifyTags(req, res, next) {
  try {
    const { description, reportType } = req.body
    const tags = await autoClassifyTags(description, reportType)
    return res.json({ tags })
  } catch (err) {
    next(err)
  }
}

export async function describeEvidence(req, res, next) {
  try {
    const {
      imageBase64,
      mimeType,
      productType,
      batchNumber,
      location,
      severity,
      department,
      issueType,
      reportType,
      materialDescription,
      materialCode,
      qty,
      discrepancyTypes,
    } = req.body || {}

    const isQddr = String(reportType || '').toUpperCase() === 'QDDR'
    if (!imageBase64 && !isQddr) {
      return res.status(400).json({ error: 'imageBase64 is required to inspect evidence.' })
    }

    const result = await generateEvidenceDescription({
      imageBase64,
      mimeType,
      productType,
      batchNumber,
      location,
      severity,
      department,
      issueType,
      reportType,
      materialDescription,
      materialCode,
      qty,
      discrepancyTypes,
    })

    return res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function scanLabel(req, res, next) {
  try {
    const { imageBase64, mimeType, rawBarcode } = req.body || {}
    if (!imageBase64 && !rawBarcode) {
      return res.status(400).json({ error: 'Please provide a barcode or label image to scan.' })
    }

    const result = await scanPalletLabel({ imageBase64, mimeType, rawBarcode })
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getJobStatus(req, res, next) {
  try {
    const { jobId } = req.params
    const queueName = req.query.queue
    const knownQueues = ['cbr-suggestion-text']
    const queuesToTry = queueName ? [queueName] : knownQueues

    let job = null
    for (const q of queuesToTry) {
      try {
        job = await boss.getJobById(q, jobId)
        if (job) break
      } catch {
        // Queue not found or job not in this queue — try next
      }
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    if (job.state === 'failed') {
      const logger = (await import('../utils/logger.js')).default
      logger.error(`Job ${jobId} failed. Output: ${JSON.stringify(job.output)}`)
    }

    return res.json({
      state: job.state,
      output: job.output,
      startedon: job.startedon,
      completedon: job.completedon
    })
  } catch (err) {
    next(err)
  }
}
