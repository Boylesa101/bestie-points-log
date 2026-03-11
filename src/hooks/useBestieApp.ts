import { useRef, useState } from 'react'
import {
  DEFAULT_METADATA,
  createId,
  sanitizeHistory,
  sanitizeSettings,
  sanitizeMetadata,
  sanitizePresets,
  sanitizeProfile,
  sanitizeRewards,
  sanitizeTotalPoints,
} from '../lib/defaults'
import {
  readHistory,
  readMetadata,
  readPresets,
  readProfile,
  readRewards,
  readSettings,
  readTotalPoints,
  writeHistory,
  writeMetadata,
  writePresets,
  writeProfile,
  writeRewards,
  writeSettings,
  writeTotalPoints,
} from '../lib/storage'
import type {
  AppDataSnapshot,
  AppMetadata,
  AppSettings,
  PointsActionInput,
  Presets,
  Profile,
  Reward,
} from '../types/app'

const loadInitialState = (): AppDataSnapshot => ({
  history: readHistory(),
  metadata: readMetadata(),
  presets: readPresets(),
  profile: readProfile(),
  rewards: readRewards(),
  settings: readSettings(),
  totalPoints: readTotalPoints(),
})

export const useBestieApp = () => {
  const [appState, setAppState] = useState(loadInitialState)
  const [storageMessage, setStorageMessage] = useState<string | null>(null)
  const appStateRef = useRef(appState)

  const persistState = (nextState: AppDataSnapshot) => {
    const results = [
      writeProfile(nextState.profile),
      writeTotalPoints(nextState.totalPoints),
      writePresets(nextState.presets),
      writeHistory(nextState.history),
      writeMetadata(nextState.metadata),
      writeRewards(nextState.rewards),
      writeSettings(nextState.settings),
    ]

    const failedWrite = results.find((result) => !result.ok)
    setStorageMessage(failedWrite?.message ?? null)
  }

  const commit = (updater: (currentState: AppDataSnapshot) => AppDataSnapshot) => {
    const nextState = updater(appStateRef.current)
    appStateRef.current = nextState
    setAppState(nextState)
    persistState(nextState)
  }

  const exportSnapshot = () => {
    const exportedAt = new Date().toISOString()
    let exportedSnapshot: AppDataSnapshot | null = null

    commit((currentState) => {
      const nextMetadata = sanitizeMetadata({
        ...currentState.metadata,
        lastExportedAt: exportedAt,
        schemaVersion: DEFAULT_METADATA.schemaVersion,
      })
      const nextState = {
        ...currentState,
        metadata: nextMetadata,
      }

      exportedSnapshot = nextState

      return nextState
    })

    return {
      exportedAt,
      snapshot: exportedSnapshot ?? appStateRef.current,
    }
  }

  const importSnapshot = (
    nextSnapshot: AppDataSnapshot,
    importedSchemaVersion: number,
  ) => {
    const importedAt = new Date().toISOString()

    commit((currentState) => ({
      history: sanitizeHistory(nextSnapshot.history),
      metadata: sanitizeImportedMetadata(
        nextSnapshot.metadata,
        currentState.metadata,
        importedAt,
        importedSchemaVersion,
      ),
      presets: sanitizePresets(nextSnapshot.presets),
      profile: sanitizeProfile(nextSnapshot.profile),
      rewards: sanitizeRewards(nextSnapshot.rewards),
      settings: sanitizeSettings(nextSnapshot.settings),
      totalPoints: sanitizeTotalPoints(nextSnapshot.totalPoints),
    }))
  }

  const trackPoints = ({ amount, reason, type }: PointsActionInput) => {
    const cleanAmount = Math.max(1, Math.round(amount))
    const cleanReason = reason.trim() || (type === 'add' ? 'Bonus points' : 'Points taken away')

    commit((currentState) => ({
      ...currentState,
      history: [
        {
          id: createId(),
          timestamp: new Date().toISOString(),
          type,
          points: cleanAmount,
          reason: cleanReason,
        },
        ...currentState.history,
      ].slice(0, 300),
      totalPoints: Math.max(
        0,
        currentState.totalPoints + (type === 'add' ? cleanAmount : -cleanAmount),
      ),
    }))
  }

  const resetPoints = () => {
    commit((currentState) => ({
      ...currentState,
      history:
        currentState.totalPoints > 0
          ? [
              {
                id: createId(),
                timestamp: new Date().toISOString(),
                type: 'remove' as const,
                points: currentState.totalPoints,
                reason: 'Parent reset points',
              },
              ...currentState.history,
            ].slice(0, 300)
          : currentState.history,
      totalPoints: 0,
    }))
  }

  return {
    clearHistory: () =>
      commit((currentState) => ({
        ...currentState,
        history: [],
      })),
    completeIntro: () =>
      commit((currentState) => ({
        ...currentState,
        metadata: {
          ...currentState.metadata,
          schemaVersion: DEFAULT_METADATA.schemaVersion,
        },
        settings: {
          ...currentState.settings,
          hasSeenIntro: true,
        },
      })),
    completeSetup: (nextProfile: Profile) =>
      commit((currentState) => ({
        ...currentState,
        metadata: {
          ...currentState.metadata,
          schemaVersion: DEFAULT_METADATA.schemaVersion,
        },
        profile: sanitizeProfile(nextProfile),
        settings: {
          ...currentState.settings,
          hasCompletedSetup: true,
          hasSeenIntro: true,
        },
      })),
    history: appState.history,
    importSnapshot,
    metadata: appState.metadata,
    presets: appState.presets,
    profile: appState.profile,
    resetPoints,
    rewards: appState.rewards,
    savePresets: (nextPresets: Presets) =>
      commit((currentState) => ({
        ...currentState,
        metadata: sanitizeMetadata(currentState.metadata),
        presets: sanitizePresets(nextPresets),
      })),
    saveProfile: (nextProfile: Profile) =>
      commit((currentState) => ({
        ...currentState,
        metadata: sanitizeMetadata(currentState.metadata),
        profile: sanitizeProfile(nextProfile),
      })),
    saveAppSettings: (nextSettings: AppSettings) =>
      commit((currentState) => ({
        ...currentState,
        metadata: sanitizeMetadata(currentState.metadata),
        settings: sanitizeSettings(nextSettings),
      })),
    saveRewards: (nextRewards: Reward[]) =>
      commit((currentState) => ({
        ...currentState,
        metadata: sanitizeMetadata(currentState.metadata),
        rewards: sanitizeRewards(nextRewards),
      })),
    settings: appState.settings,
    storageMessage,
    totalPoints: appState.totalPoints,
    trackPoints,
    exportSnapshot,
  }
}

const sanitizeImportedMetadata = (
  importedMetadata: AppMetadata,
  currentMetadata: AppMetadata,
  importedAt: string,
  importedSchemaVersion: number,
) =>
  sanitizeMetadata({
    ...currentMetadata,
    ...importedMetadata,
    lastImportedAt: importedAt,
    lastImportedSchemaVersion: importedSchemaVersion,
    schemaVersion: DEFAULT_METADATA.schemaVersion,
  })
