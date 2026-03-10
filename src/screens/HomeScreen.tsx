import { ActivityList } from '../components/ActivityList'
import { ChildHeader } from '../components/ChildHeader'
import { PresetGrid } from '../components/PresetGrid'
import type { HistoryEntry, PointActionType, Presets, Profile, Reward } from '../types/app'

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
  totalPoints,
}: HomeScreenProps) => {
  const nextReward = rewards.find((reward) => reward.milestone > totalPoints)

  return (
    <main className="screen screen--home">
      <div className="home-stack home-stack--mock">
        <ChildHeader
          onOpenSettings={onOpenSettings}
          profile={profile}
          totalPoints={totalPoints}
        />

        <PresetGrid
          onSelect={onPresetTap}
          presets={presets.add}
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
          presets={presets.remove}
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
