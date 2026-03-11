import type {
  CreateFamilyInput,
  JoinFamilyInput,
  SyncPushRequest,
} from '../../src/types/app'
import {
  createOptionsResponse,
  createToken,
  errorResponse,
  getAllowedOrigin,
  json,
  requireAuth,
  requireJsonBody,
  sha256,
  withCors,
  type WorkerEnv,
} from './lib/auth'
import {
  buildFamilySnapshot,
  createFamilyWithSnapshot,
  createPairingCode,
  listDevices,
  pullSnapshot,
  pushMutations,
  redeemPairingCode,
  revokeDevice,
} from './lib/db'

const handleRequest = async (request: Request, env: WorkerEnv) => {
  const url = new URL(request.url)
  const origin = getAllowedOrigin(request, env)

  if (request.method === 'OPTIONS') {
    return createOptionsResponse(origin)
  }

  try {
    if (request.method === 'POST' && url.pathname === '/api/family/create') {
      const body = await requireJsonBody<CreateFamilyInput>(request)

      if (!body.parentName?.trim()) {
        return errorResponse('Parent display name is required.', 400, origin)
      }

      if (!body.snapshot?.profile?.childName?.trim()) {
        return errorResponse('Child name is required.', 400, origin)
      }

      const familyId = crypto.randomUUID()
      const deviceId = crypto.randomUUID()
      const deviceToken = createToken()
      const response = await createFamilyWithSnapshot(env, {
        deviceId,
        deviceName: body.deviceName?.trim() || 'Phone',
        deviceTokenHash: await sha256(deviceToken),
        deviceTokenPlain: deviceToken,
        familyId,
        parentName: body.parentName.trim(),
        snapshot: body.snapshot,
      })

      return withCors(json(response), origin)
    }

    if (request.method === 'POST' && url.pathname === '/api/pair-code/create') {
      const auth = await requireAuth(request, env)

      if (!auth.isPrimary) {
        return errorResponse('Only the primary device can create a new sync code.', 403, origin)
      }

      const pairingCode = await createPairingCode(env, auth)
      return withCors(json({ pairingCode }), origin)
    }

    if (request.method === 'POST' && url.pathname === '/api/pair-code/redeem') {
      const body = await requireJsonBody<JoinFamilyInput>(request)

      if (!body.code?.trim() || !body.parentName?.trim()) {
        return errorResponse('Sync code and parent display name are required.', 400, origin)
      }

      const deviceToken = createToken()
      const response = await redeemPairingCode(env, {
        code: body.code.trim(),
        deviceId: crypto.randomUUID(),
        deviceName: body.deviceName?.trim() || 'Phone',
        deviceTokenHash: await sha256(deviceToken),
        deviceTokenPlain: deviceToken,
        parentName: body.parentName.trim(),
      })

      return withCors(json(response), origin)
    }

    if (request.method === 'POST' && url.pathname === '/api/sync/push') {
      const auth = await requireAuth(request, env)
      const body = await requireJsonBody<SyncPushRequest>(request)
      const response = await pushMutations(env, auth, body.mutations ?? [])
      return withCors(json(response), origin)
    }

    if (request.method === 'GET' && url.pathname === '/api/sync/pull') {
      const auth = await requireAuth(request, env)
      const since = Number.parseInt(url.searchParams.get('since') ?? '0', 10) || 0
      const response = await pullSnapshot(env, auth, since)
      return withCors(json(response), origin)
    }

    if (request.method === 'GET' && url.pathname === '/api/devices') {
      const auth = await requireAuth(request, env)
      const devices = await listDevices(env, auth.familyId)
      return withCors(json({ devices }), origin)
    }

    if (request.method === 'POST' && url.pathname === '/api/device/revoke') {
      const auth = await requireAuth(request, env)

      if (!auth.isPrimary) {
        return errorResponse('Only the primary device can revoke linked devices.', 403, origin)
      }

      const body = await requireJsonBody<{ deviceId: string }>(request)

      if (!body.deviceId?.trim()) {
        return errorResponse('A device id is required.', 400, origin)
      }

      const devices = await revokeDevice(env, auth, body.deviceId.trim())
      return withCors(json({ devices }), origin)
    }

    if (request.method === 'GET' && url.pathname === '/api/family') {
      const auth = await requireAuth(request, env)
      const snapshot = await buildFamilySnapshot(env, auth.familyId)
      return withCors(json({ snapshot }), origin)
    }

    return errorResponse('Not found.', 404, origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected sync error.'
    const status = message.includes('required') ? 400 : message.includes('valid') ? 401 : 500
    return errorResponse(message, status, origin)
  }
}

export default {
  fetch: handleRequest,
}
