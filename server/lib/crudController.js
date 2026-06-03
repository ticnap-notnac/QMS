import { getRequestActor } from './requestUtils.js'

export function createGetHandler(serviceFetchAllFn) {
  return async (_req, res) => {
    try {
      const { data, error } = await serviceFetchAllFn()
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

export function createPostHandler({ serviceCreateFn, bodyKey }) {
  return async (req, res) => {
    try {
      const rawValue = req.body?.[bodyKey] ?? req.body?.name ?? req.body?.value
      const actorAuthId = getRequestActor(req)

      const result = await serviceCreateFn({ [bodyKey]: rawValue, actorAuthId })

      if (result.validationError) {
        return res.status(400).json({ error: result.validationError })
      }
      if (result.error) {
        return res.status(500).json({ error: result.error.message })
      }
      if (result.existed) {
        return res.status(200).json(result.data)
      }

      return res.status(201).json(result.data)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

export function createDeleteHandler({ serviceDeleteFn }) {
  return async (req, res) => {
    try {
      const { id } = req.params
      const actorAuthId = getRequestActor(req)

      const result = await serviceDeleteFn({ id, actorAuthId })

      if (result.error) {
        return res.status(500).json({ error: result.error.message })
      }
      if (result.notFound) {
        return res.status(404).json({ error: 'Item not found.' })
      }

      return res.json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}
