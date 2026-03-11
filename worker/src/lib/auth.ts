export interface WorkerEnv {
  ALLOWED_ORIGIN?: string
  DB: D1Database
  PAIR_CODE_TTL_MINUTES?: string
  PHOTOS: R2Bucket
}

export interface AuthDevice {
  deviceId: string
  familyId: string
  isPrimary: boolean
  parentName: string
  revokedAt: string | null
}

const toHeaders = (headers?: HeadersInit) => new Headers(headers)

export const json = (body: unknown, init: ResponseInit = {}) => {
  const headers = toHeaders(init.headers)
  const origin = headers.get('Access-Control-Allow-Origin') ?? '*'

  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Content-Type', 'application/json')

  return Response.json(body, {
    ...init,
    headers,
  })
}

export const errorResponse = (
  error: string,
  status = 400,
  origin = '*',
) =>
  json({ error }, {
    headers: {
      'Access-Control-Allow-Origin': origin,
    },
    status,
  })

export const getAllowedOrigin = (request: Request, env: WorkerEnv) =>
  env.ALLOWED_ORIGIN || request.headers.get('Origin') || '*'

export const withCors = (response: Response, origin: string) => {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  return response
}

export const createOptionsResponse = (origin: string) =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Origin': origin,
    },
    status: 204,
  })

export const createToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export const sha256 = async (value: string) => {
  const input = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('')
}

export const requireJsonBody = async <T>(request: Request) => {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error('Request body must be valid JSON.')
  }
}

export const requireAuth = async (request: Request, env: WorkerEnv) => {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('A valid device token is required.')
  }

  const token = authorization.slice('Bearer '.length).trim()

  if (!token) {
    throw new Error('A valid device token is required.')
  }

  const tokenHash = await sha256(token)
  const device = await env.DB.prepare(
    `SELECT id, family_id, is_primary, parent_name, revoked_at
     FROM devices
     WHERE device_token_hash = ?1
     LIMIT 1`,
  )
    .bind(tokenHash)
    .first<{
      family_id: string
      id: string
      is_primary: number
      parent_name: string
      revoked_at: string | null
    }>()

  if (!device || device.revoked_at) {
    throw new Error('This device is no longer allowed to sync.')
  }

  await env.DB.prepare(
    'UPDATE devices SET last_seen_at = ?1 WHERE id = ?2',
  )
    .bind(new Date().toISOString(), device.id)
    .run()

  return {
    deviceId: device.id,
    familyId: device.family_id,
    isPrimary: device.is_primary === 1,
    parentName: device.parent_name,
    revokedAt: device.revoked_at,
  } satisfies AuthDevice
}
