import { getRequestActor } from './requestUtils.js'

export function createGetHandler(serviceFetchAllFn) {
  return async (req, res, next) => {
    try {
      const { data, error } = await serviceFetchAllFn()
      if (error) throw error
      return res.json(data)
    } catch (err) {
      next(err)
    }
  }
}

export function createPostHandler({ serviceCreateFn, bodyKey }) {
  return async (req, res, next) => {
    try {
      const rawValue = req.body?.[bodyKey] ?? req.body?.name ?? req.body?.value
      const actorAuthId = getRequestActor(req)

      const result = await serviceCreateFn({ [bodyKey]: rawValue, actorAuthId })

      if (result.validationError) {
        return res.status(400).json({ error: result.validationError })
      }
      if (result.error) {
        throw result.error
      }
      if (result.existed) {
        return res.status(200).json(result.data)
      }

      return res.status(201).json(result.data)
    } catch (err) {
      if (err?.code === '23505' || (err?.message && err.message.includes('duplicate key value'))) {
        return res.status(400).json({ error: 'An item with this name already exists.' })
      }
      next(err)
    }
  }
}

export function createDeleteHandler({ serviceDeleteFn }) {
  return async (req, res, next) => {
    try {
      const { id } = req.params
      const actorAuthId = getRequestActor(req)

      const result = await serviceDeleteFn({ id, actorAuthId })

      if (result.error) {
        throw result.error
      }
      if (result.notFound) {
        return res.status(404).json({ error: 'Item not found.' })
      }

      return res.json({ success: true })
    } catch (err) {
      next(err)
    }
  }
}
