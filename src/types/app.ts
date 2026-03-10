export type PointActionType = 'add' | 'remove'
export type PresetSource = 'custom' | 'default'

export interface ParentLockSettings {
  enabled: boolean
  isLocked: boolean
  pin: string | null
}

export interface Profile {
  childName: string
  photoDataUrl: string | null
}

export interface PresetAction {
  id: string
  label: string
  points: number
  sortOrder: number
  source: PresetSource
  visibleOnHome: boolean
}

export interface Presets {
  add: PresetAction[]
  remove: PresetAction[]
}

export interface HistoryEntry {
  id: string
  timestamp: string
  type: PointActionType
  points: number
  reason: string
}

export interface Reward {
  claimedAt: string | null
  id: string
  isClaimed: boolean
  title: string
  milestone: number
  description: string
}

export interface AppSettings {
  hasCompletedSetup: boolean
  hasSeenIntro: boolean
  parentLock: ParentLockSettings
  soundEnabled: boolean
}

export interface AppMetadata {
  lastExportedAt: string | null
  lastImportedAt: string | null
  lastImportedSchemaVersion: number | null
  schemaVersion: number
}

export interface PointsActionInput {
  amount: number
  reason: string
  type: PointActionType
}
