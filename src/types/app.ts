export type AppMode = 'local' | 'synced'
export type HistorySyncStatus = 'error' | 'pending' | 'synced'
export type MutationKind = 'point-event' | 'presets' | 'profile' | 'rewards'
export type PointActionType = 'add' | 'remove'
export type PresetSource = 'custom' | 'default'
export type SyncStatus = 'error' | 'local' | 'offline' | 'revoked' | 'synced' | 'syncing'

export interface ParentLockSettings {
  enabled: boolean
  isLocked: boolean
  pin: string | null
}

export interface Profile {
  childName: string
  photoDataUrl: string | null
  photoKey: string | null
  updatedAt: string
  updatedByDeviceId: string | null
}

export interface PresetAction {
  deletedAt: string | null
  icon: string | null
  id: string
  label: string
  points: number
  sortOrder: number
  source: PresetSource
  updatedAt: string
  updatedByDeviceId: string | null
  visibleOnHome: boolean
}

export interface Presets {
  add: PresetAction[]
  remove: PresetAction[]
}

export interface HistoryEntry {
  actorName: string
  createdLocallyAt: string
  deviceId: string
  id: string
  points: number
  reason: string
  syncedAt: string | null
  syncStatus: HistorySyncStatus
  timestamp: string
  type: PointActionType
}

export interface Reward {
  claimedAt: string | null
  deletedAt: string | null
  description: string
  id: string
  isClaimed: boolean
  milestone: number
  sortOrder: number
  title: string
  updatedAt: string
  updatedByDeviceId: string | null
}

export interface AppSettings {
  deviceName: string
  hasCompletedSetup: boolean
  hasSeenIntro: boolean
  parentDisplayName: string
  parentLock: ParentLockSettings
  soundEnabled: boolean
}

export interface AppMetadata {
  lastExportedAt: string | null
  lastImportedAt: string | null
  lastImportedSchemaVersion: number | null
  lastMigratedToSyncAt: string | null
  schemaVersion: number
}

export interface LinkedDevice {
  createdAt: string
  deviceName: string
  id: string
  isPrimary: boolean
  lastSeenAt: string | null
  parentName: string
  revokedAt: string | null
}

export interface PairingCodeState {
  code: string
  createdAt: string
  expiresAt: string
}

export interface SyncSession {
  activePairingCode: PairingCodeState | null
  cursor: number
  deviceId: string | null
  deviceToken: string | null
  familyId: string | null
  lastSyncAt: string | null
  lastError: string | null
  linkedDevices: LinkedDevice[]
  mode: AppMode
  pairedAt: string | null
  primaryDeviceId: string | null
  retryCount: number
  revokedAt: string | null
  status: SyncStatus
}

interface QueuedMutationBase {
  attempts: number
  createdAt: string
  id: string
  kind: MutationKind
  lastAttemptAt: string | null
}

export interface ProfileMutationPayload {
  profile: Profile
}

export interface PresetsMutationPayload {
  presets: Presets
}

export interface RewardsMutationPayload {
  rewards: Reward[]
}

export interface PointEventMutationPayload {
  event: HistoryEntry
}

export interface ProfileMutation extends QueuedMutationBase {
  kind: 'profile'
  payload: ProfileMutationPayload
}

export interface PresetsMutation extends QueuedMutationBase {
  kind: 'presets'
  payload: PresetsMutationPayload
}

export interface RewardsMutation extends QueuedMutationBase {
  kind: 'rewards'
  payload: RewardsMutationPayload
}

export interface PointEventMutation extends QueuedMutationBase {
  kind: 'point-event'
  payload: PointEventMutationPayload
}

export type QueuedMutation =
  | PointEventMutation
  | PresetsMutation
  | ProfileMutation
  | RewardsMutation

export interface AppDataSnapshot {
  history: HistoryEntry[]
  metadata: AppMetadata
  mutationQueue: QueuedMutation[]
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
  syncSession: SyncSession
  totalPoints: number
}

export interface PointsActionInput {
  amount: number
  reason: string
  type: PointActionType
}

export interface SharedFamilySnapshot {
  activePairingCode: PairingCodeState | null
  cursor: number
  devices: LinkedDevice[]
  familyId: string
  history: HistoryEntry[]
  presets: Presets
  profile: Profile
  rewards: Reward[]
  totalPoints: number
}

export interface SyncPushRequest {
  mutations: QueuedMutation[]
}

export interface SyncPushResponse {
  acceptedMutationIds: string[]
  cursor: number
}

export interface SyncPullResponse {
  changed: boolean
  snapshot: SharedFamilySnapshot | null
}

export interface CreateFamilyInput {
  deviceName: string
  parentName: string
  snapshot: AppDataSnapshot
}

export interface CreateFamilyResponse {
  deviceId: string
  deviceToken: string
  snapshot: SharedFamilySnapshot
}

export interface JoinFamilyInput {
  code: string
  deviceName: string
  parentName: string
}

export interface JoinFamilyResponse {
  deviceId: string
  deviceToken: string
  snapshot: SharedFamilySnapshot
}

export interface PairCodeResponse {
  pairingCode: PairingCodeState
}

export interface DevicesResponse {
  devices: LinkedDevice[]
}
