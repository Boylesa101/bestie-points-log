export type PointActionType = 'add' | 'remove'

export interface Profile {
  childName: string
  photoDataUrl: string | null
}

export interface PresetAction {
  id: string
  label: string
  points: number
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
  id: string
  title: string
  milestone: number
  description: string
}

export interface AppSettings {
  hasCompletedSetup: boolean
  hasSeenIntro: boolean
}

export interface PointsActionInput {
  amount: number
  reason: string
  type: PointActionType
}
