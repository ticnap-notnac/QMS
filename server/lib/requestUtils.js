export function getRequestActor(req) {
  return req?.user?.id || null
}

export default { getRequestActor }
