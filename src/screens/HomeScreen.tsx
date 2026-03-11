import { ActivityList } from '../components/ActivityList'
import { ChildHeader } from '../components/ChildHeader'
import { PresetGrid } from '../components/PresetGrid'
import type {
  HistoryEntry,
  PointActionType,
  Presets,
  Profile,
  Reward,
  SyncSession,
} from '../types/app'

interface HomeScreenProps {
  history: HistoryEntry[]
  onOpenHistory: () => void
  onOpenPointsModal: () => void
  onOpenRewards: () => void
  onOpenSettings: () => void
  onPresetTap: (label: string, points: number, type: PointActionType) => void
  presets: Presets
  profile: Profile
  rewards: Reward[]
  syncSession: SyncSession
  totalPoints: number
}

export const HomeScreen = ({
  history,
  onOpenHistory,
  onOpenPointsModal,
  onOpenRewards,
  onOpenSettings,
  onPresetTap,
  presets,
  profile,
  rewards,
  syncSession,
  totalPoints,
}: HomeScreenProps) => {
  const nextReward = rewards.find((reward) => reward.milestone > totalPoints)
  const visibleAddPresets = presets.add.filter((preset) => preset.visibleOnHome)
  const visibleRemovePresets = presets.remove.filter((preset) => preset.visibleOnHome)
  const displayedAddPresets = visibleAddPresets.slice(0, 6)
  const displayedRemovePresets = visibleRemovePresets.slice(0, 6)
  const hiddenAddCount = Math.max(visibleAddPresets.length - displayedAddPresets.length, 0)
  const hiddenRemoveCount = Math.max(
    visibleRemovePresets.length - displayedRemovePresets.length,
    0,
  )

  return (
    <main className="screen screen--home">
      <div className="home-stack home-stack--mock">
        <ChildHeader
          onOpenSettings={onOpenSettings}
          profile={profile}
          syncSession={syncSession}
          totalPoints={totalPoints}
        />

        <PresetGrid
          onSelect={onPresetTap}
          presets={displayedAddPresets}
          summary={
            hiddenAddCount > 0 ? `+${hiddenAddCount} more in settings` : 'Good jobs'
          }
          title="Win points"
          tone="add"
        />

        <button className="type-points-button" onClick={onOpenPointsModal} type="button">
          <div className="type-points-button__icon">⌨️</div>
          <div className="type-points-button__copy">
            <strong>TYPE POINTS</strong>
            <span>Add or take away any number</span>
          </div>
        </button>

        <PresetGrid
          onSelect={onPresetTap}
          presets={displayedRemovePresets}
          summary={
            hiddenRemoveCount > 0 ? `+${hiddenRemoveCount} more in settings` : 'Oopsies'
          }
          title="Lose points"
          tone="remove"
        />

        <ActivityList entries={history} onViewAll={onOpenHistory} />

        <button className="rewards-launch" onClick={onOpenRewards} type="button">
          <span>🎁 Rewards & stickers</span>
          <small>
            {nextReward
              ? `Next reward at ${nextReward.milestone} points`
              : rewards.length
                ? 'Every reward has been reached already'
                : `${totalPoints} points saved on this phone`}
          </small>
        </button>
      </div>
    </main>
  )
}
