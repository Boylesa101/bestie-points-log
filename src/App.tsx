import { useEffect, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PointsModal } from './components/PointsModal'
import { SplashScreen } from './components/SplashScreen'
import { useBestieApp } from './hooks/useBestieApp'
import type { PointActionType, Presets, Profile, Reward } from './types/app'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { RewardsScreen } from './screens/RewardsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

type Screen = 'home' | 'history' | 'rewards' | 'settings'

interface SettingsPayload {
  presets: Presets
  profile: Profile
  rewards: Reward[]
}

interface ConfirmState {
  action: () => void
  confirmLabel: string
  description: string
  tone?: 'danger' | 'primary'
  title: string
}

function App() {
  const {
    clearHistory,
    completeIntro,
    history,
    presets,
    profile,
    resetPoints,
    rewards,
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

  useEffect(() => {
    if (!settings.hasSeenIntro) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowSplash(false)
    }, 900)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [settings.hasSeenIntro])

  const handleSplashContinue = () => {
    completeIntro()
    setShowSplash(false)
  }

  const handlePresetTap = (
    label: string,
    points: number,
    type: PointActionType,
  ) => {
    trackPoints({
      amount: points,
      reason: label,
      type,
    })
  }

  const handleSaveSettings = ({ presets, profile, rewards }: SettingsPayload) => {
    saveProfile(profile)
    savePresets(presets)
    saveRewards(rewards)
    setScreen('home')
  }

  const recentEntries = history.slice(0, 5)

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
              onOpenSettings={() => setScreen('settings')}
              onPresetTap={handlePresetTap}
              presets={presets}
              profile={profile}
              rewards={rewards}
              totalPoints={totalPoints}
            />
          ) : null}

          {screen === 'history' ? (
            <HistoryScreen entries={history} onBack={() => setScreen('home')} />
          ) : null}

          {screen === 'rewards' ? (
            <RewardsScreen
              onBack={() => setScreen('home')}
              onOpenSettings={() => setScreen('settings')}
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
            />
          ) : null}

          {isPointsModalOpen ? (
            <PointsModal
              onClose={() => setIsPointsModalOpen(false)}
              onSave={({ amount, reason, type }) => {
                trackPoints({ amount, reason, type })
                setIsPointsModalOpen(false)
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
        </div>
      )}
    </div>
  )
}

export default App
