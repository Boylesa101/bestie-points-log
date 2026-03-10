import { ActivityList } from '../components/ActivityList'
import { ChildHeader } from '../components/ChildHeader'
import { PresetGrid } from '../components/PresetGrid'
import { RewardProgress } from '../components/RewardProgress'
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
}: HomeScreenProps) => (
  <main className="screen">
    <header className="screen__header">
      <div>
        <p className="screen__eyebrow">Family helper</p>
        <h1 className="screen__title">Bestie mode</h1>
      </div>
      <div className="chip">📱 Local & offline</div>
    </header>

    <div className="home-stack">
      <ChildHeader
        onOpenSettings={onOpenSettings}
        profile={profile}
        totalPoints={totalPoints}
      />

      <PresetGrid
        onSelect={onPresetTap}
        presets={presets.add}
        title="Happy wins"
        tone="add"
      />

      <button className="type-points-button" onClick={onOpenPointsModal} type="button">
        <strong>TYPE POINTS</strong>
        <span>Custom amount, add or take away</span>
      </button>

      <PresetGrid
        onSelect={onPresetTap}
        presets={presets.remove}
        title="Oops moments"
        tone="remove"
      />

      <ActivityList entries={history} onViewAll={onOpenHistory} />

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Rewards</p>
            <h3>Stickers and treats</h3>
          </div>
          <button className="soft-button" onClick={onOpenRewards} type="button">
            Open
          </button>
        </div>

        <RewardProgress rewards={rewards.slice(0, 2)} totalPoints={totalPoints} />
      </section>

      <div className="quick-actions">
        <button className="quick-link" onClick={onOpenHistory} type="button">
          View all activity
          <small>See every point change in order.</small>
        </button>
        <button className="quick-link" onClick={onOpenRewards} type="button">
          Rewards & stickers
          <small>Check the next milestone and progress.</small>
        </button>
      </div>
    </div>
  </main>
)
