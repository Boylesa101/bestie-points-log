import type {
  CreateFamilyInput,
  CreateFamilyResponse,
  DevicesResponse,
  JoinFamilyInput,
  JoinFamilyResponse,
  PairCodeResponse,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from '../../types/app'

const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_SYNC_API_BASE_URL

  if (!configuredBaseUrl) {
    throw new Error(
      'Sync is not configured yet. Add VITE_SYNC_API_BASE_URL before using synced family mode.',
    )
  }

  return configuredBaseUrl.replace(/\/$/, '')
}

const buildHeaders = (deviceToken?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (deviceToken) {
    headers.Authorization = `Bearer ${deviceToken}`
  }

  return headers
}

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, options)

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(
      typeof errorBody?.error === 'string' ? errorBody.error : 'Sync request failed.',
    )
  }

  return response.json() as Promise<T>
}

export const createFamily = (payload: CreateFamilyInput) =>
  request<CreateFamilyResponse>('/api/family/create', {
    body: JSON.stringify(payload),
    method: 'POST',
    headers: buildHeaders(),
  })

export const createPairCode = (deviceToken: string) =>
  request<PairCodeResponse>('/api/pair-code/create', {
    method: 'POST',
    headers: buildHeaders(deviceToken),
  })

export const redeemPairCode = (payload: JoinFamilyInput) =>
  request<JoinFamilyResponse>('/api/pair-code/redeem', {
    body: JSON.stringify(payload),
    method: 'POST',
    headers: buildHeaders(),
  })

export const pushSyncMutations = (
  deviceToken: string,
  payload: SyncPushRequest,
) =>
  request<SyncPushResponse>('/api/sync/push', {
    body: JSON.stringify(payload),
    method: 'POST',
    headers: buildHeaders(deviceToken),
  })

export const pullSyncSnapshot = (
  deviceToken: string,
  cursor: number,
) =>
  request<SyncPullResponse>(`/api/sync/pull?since=${cursor}`, {
    method: 'GET',
    headers: buildHeaders(deviceToken),
  })

export const fetchLinkedDevices = (deviceToken: string) =>
  request<DevicesResponse>('/api/devices', {
    method: 'GET',
    headers: buildHeaders(deviceToken),
  })

export const revokeLinkedDevice = (deviceToken: string, deviceId: string) =>
  request<DevicesResponse>('/api/device/revoke', {
    body: JSON.stringify({ deviceId }),
    method: 'POST',
    headers: buildHeaders(deviceToken),
  })
