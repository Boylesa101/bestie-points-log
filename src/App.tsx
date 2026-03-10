import { useEffect, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ParentGateModal } from './components/ParentGateModal'
import { PointsModal } from './components/PointsModal'
import { SplashScreen } from './components/SplashScreen'
import { useBestieApp } from './hooks/useBestieApp'
import { playPointSound } from './lib/sound'
import type {
  AppSettings,
  PointActionType,
  PointsActionInput,
  Presets,
  Profile,
  Reward,
} from './types/app'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { RewardsScreen } from './screens/RewardsScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SettingsScreen } from './screens/SettingsScreen'

type Screen = 'home' | 'history' | 'rewards' | 'settings' | 'setup'

interface SettingsPayload {
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
}

interface ConfirmState {
  action: () => void
  confirmLabel: string
  description: string
  tone?: 'danger' | 'primary'
  title: string
}

interface PointReactionState {
  id: number
  type: PointActionType
}

function App() {
  const {
    clearHistory,
    completeSetup,
    completeIntro,
    history,
    presets,
    profile,
    resetPoints,
    rewards,
    saveAppSettings,
    savePresets,
    saveProfile,
    saveRewards,
    settings,
    storageMessage,
    totalPoints,
    trackPoints,
  } = useBestieApp()
  const [screen, setScreen] = useState<Screen>('home')
  const [showSplash, setShowSplash] = useState(true)
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [isParentGateOpen, setIsParentGateOpen] = useState(false)
  const [pointReaction, setPointReaction] = useState<PointReactionState | null>(null)

  useEffect(() => {
    if (!settings.hasSeenIntro) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setScreen(settings.hasCompletedSetup ? 'home' : 'setup')
      setShowSplash(false)
    }, 900)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [settings.hasCompletedSetup, settings.hasSeenIntro])

  const handleSplashContinue = () => {
    completeIntro()
    setScreen(settings.hasCompletedSetup ? 'home' : 'setup')
    setShowSplash(false)
  }

  const handlePresetTap = (
    label: string,
    points: number,
    type: PointActionType,
  ) => {
    handlePointsAction({
      amount: points,
      reason: label,
      type,
    })
  }

  const handleSaveSettings = ({ presets, profile, rewards, settings }: SettingsPayload) => {
    saveProfile(profile)
    savePresets(presets)
    saveRewards(rewards)
    saveAppSettings(settings)
    setScreen('home')
  }

  const handlePointsAction = ({ amount, reason, type }: PointsActionInput) => {
    trackPoints({ amount, reason, type })
    void playPointSound(type, settings.soundEnabled)
    const reactionId = Date.now()
    setPointReaction({ id: reactionId, type })
    window.setTimeout(() => {
      setPointReaction((currentReaction) =>
        currentReaction?.id === reactionId ? null : currentReaction,
      )
    }, 900)
  }

  const handleRequestOpenSettings = () => {
    const shouldRequirePin =
      settings.parentLock.enabled &&
      settings.parentLock.isLocked &&
      Boolean(settings.parentLock.pin)

    if (shouldRequirePin) {
      setIsParentGateOpen(true)
      return
    }

    setScreen('settings')
  }

  const recentEntries = history.slice(0, 3)

  return (
    <div className="app-shell">
      {showSplash ? (
        <SplashScreen
          isFirstLaunch={!settings.hasSeenIntro}
          onStart={handleSplashContinue}
        />
      ) : (
        <div className="mobile-shell">
          <div className="mobile-shell__glow mobile-shell__glow--top" />
          <div className="mobile-shell__glow mobile-shell__glow--bottom" />

          {storageMessage ? (
            <div className="storage-banner" role="status">
              {storageMessage}
            </div>
          ) : null}

          {screen === 'home' ? (
            <HomeScreen
              history={recentEntries}
              onOpenHistory={() => setScreen('history')}
              onOpenPointsModal={() => setIsPointsModalOpen(true)}
              onOpenRewards={() => setScreen('rewards')}
              onOpenSettings={handleRequestOpenSettings}
              onPresetTap={handlePresetTap}
              presets={presets}
              profile={profile}
              rewards={rewards}
              totalPoints={totalPoints}
            />
          ) : null}

          {screen === 'setup' ? (
            <SetupScreen
              onComplete={(profile) => {
                completeSetup(profile)
                setScreen('home')
              }}
              profile={profile}
            />
          ) : null}

          {screen === 'history' ? (
            <HistoryScreen entries={history} onBack={() => setScreen('home')} />
          ) : null}

          {screen === 'rewards' ? (
            <RewardsScreen
              onBack={() => setScreen('home')}
              onOpenSettings={handleRequestOpenSettings}
              rewards={rewards}
              totalPoints={totalPoints}
            />
          ) : null}

          {screen === 'settings' ? (
            <SettingsScreen
              isActive={screen === 'settings'}
              onBack={() => setScreen('home')}
              onRequestClearHistory={() =>
                setConfirmState({
                  action: () => {
                    clearHistory()
                    setConfirmState(null)
                    setScreen('home')
                  },
                  confirmLabel: 'Clear history',
                  description:
                    'All activity entries will be removed from this device.',
                  title: 'Clear the activity history?',
                  tone: 'danger',
                })
              }
              onRequestResetPoints={() =>
                setConfirmState({
                  action: () => {
                    resetPoints()
                    setConfirmState(null)
                    setScreen('home')
                  },
                  confirmLabel: 'Reset points',
                  description:
                    'The current total will go back to zero, but history stays unless you clear it too.',
                  title: 'Reset Henry’s points?',
                  tone: 'danger',
                })
              }
              onSave={handleSaveSettings}
              presets={presets}
              profile={profile}
              rewards={rewards}
              settings={settings}
            />
          ) : null}

          {isPointsModalOpen ? (
            <PointsModal
              onClose={() => setIsPointsModalOpen(false)}
              onSave={({ amount, reason, type }) => {
                handlePointsAction({ amount, reason, type })
                setIsPointsModalOpen(false)
              }}
            />
          ) : null}

          {isParentGateOpen ? (
            <ParentGateModal
              onClose={() => setIsParentGateOpen(false)}
              onUnlock={(pin) => {
                const isMatch = pin === settings.parentLock.pin

                if (isMatch) {
                  setIsParentGateOpen(false)
                  setScreen('settings')
                }

                return isMatch
              }}
            />
          ) : null}

          <ConfirmDialog
            confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
            description={confirmState?.description ?? ''}
            onCancel={() => setConfirmState(null)}
            onConfirm={() => {
              confirmState?.action()
            }}
            open={Boolean(confirmState)}
            title={confirmState?.title ?? ''}
            tone={confirmState?.tone}
          />

          {pointReaction ? (
            <div
              className={`point-reaction point-reaction--${pointReaction.type}`}
              key={pointReaction.id}
            >
              <div className="point-reaction__icon">
                {pointReaction.type === 'add' ? '⭐' : '☁️'}
              </div>
              <div className="point-reaction__text">
                {pointReaction.type === 'add' ? 'Yay!' : 'Aww'}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default App
