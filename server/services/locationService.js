import { getRequestActor } from '../lib/requestUtils.js'
import {
  fetchAllLocations,
  createLocation,
  deleteLocation,
} from '../services/locationService.js'

// GET /locations
export async function getLocations(_req, res) {
  const { data, error } = await fetchAllLocations()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
}

// POST /locations
export async function postLocation(req, res) {
  const rawName = req.body?.locationName ?? req.body?.location_name
  const actorAuthId = getRequestActor(req)

  const { data, error, existed, validationError } = await createLocation({ rawName, actorAuthId })

  if (validationError) return res.status(400).json({ error: validationError })
  if (error)           return res.status(500).json({ error: error.message })
  if (existed)         return res.status(200).json(data)

  return res.status(201).json(data)
}

// DELETE /locations/:id
export async function removeLocation(req, res) {
  const { id } = req.params
  const actorAuthId = getRequestActor(req)

  const { success, notFound, error } = await deleteLocation({ id, actorAuthId })

  if (error)    return res.status(500).json({ error: error.message })
  if (notFound) return res.status(404).json({ error: 'Location not found.' })
  if (success)  return res.json({ success: true })
}