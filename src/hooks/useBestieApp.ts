import { useRef, useState } from 'react'
import {
  createId,
  sanitizePresets,
  sanitizeProfile,
  sanitizeRewards,
} from '../lib/defaults'
import {
  readHistory,
  readPresets,
  readProfile,
  readRewards,
  readSettings,
  readTotalPoints,
  writeHistory,
  writePresets,
  writeProfile,
  writeRewards,
  writeSettings,
  writeTotalPoints,
} from '../lib/storage'
import type { PointsActionInput, Presets, Profile, Reward } from '../types/app'

interface AppState {
  history: ReturnType<typeof readHistory>
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: ReturnType<typeof readSettings>
  totalPoints: number
}

const loadInitialState = (): AppState => ({
  history: readHistory(),
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

  const persistState = (nextState: AppState) => {
    const results = [
      writeProfile(nextState.profile),
      writeTotalPoints(nextState.totalPoints),
      writePresets(nextState.presets),
      writeHistory(nextState.history),
      writeRewards(nextState.rewards),
      writeSettings(nextState.settings),
    ]

    const failedWrite = results.find((result) => !result.ok)
    setStorageMessage(failedWrite?.message ?? null)
  }

  const commit = (updater: (currentState: AppState) => AppState) => {
    const nextState = updater(appStateRef.current)
    appStateRef.current = nextState
    setAppState(nextState)
    persistState(nextState)
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
        settings: {
          ...currentState.settings,
          hasSeenIntro: true,
        },
      })),
    completeSetup: (nextProfile: Profile) =>
      commit((currentState) => ({
        ...currentState,
        profile: sanitizeProfile(nextProfile),
        settings: {
          ...currentState.settings,
          hasCompletedSetup: true,
          hasSeenIntro: true,
        },
      })),
    history: appState.history,
    presets: appState.presets,
    profile: appState.profile,
    resetPoints,
    rewards: appState.rewards,
    savePresets: (nextPresets: Presets) =>
      commit((currentState) => ({
        ...currentState,
        presets: sanitizePresets(nextPresets),
      })),
    saveProfile: (nextProfile: Profile) =>
      commit((currentState) => ({
        ...currentState,
        profile: sanitizeProfile(nextProfile),
      })),
    saveRewards: (nextRewards: Reward[]) =>
      commit((currentState) => ({
        ...currentState,
        rewards: sanitizeRewards(nextRewards),
      })),
    settings: appState.settings,
    storageMessage,
    totalPoints: appState.totalPoints,
    trackPoints,
  }
}
