export function getRequestActor(req) {
  return req?.body?.userAuthId || req?.headers?.['x-user-auth-id'] || req?.query?.userAuthId || null
}

export default { getRequestActor }
