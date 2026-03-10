import { RewardProgress } from '../components/RewardProgress'
import type { Reward } from '../types/app'

interface RewardsScreenProps {
  onBack: () => void
  onOpenSettings: () => void
  rewards: Reward[]
  totalPoints: number
}

export const RewardsScreen = ({
  onBack,
  onOpenSettings,
  rewards,
  totalPoints,
}: RewardsScreenProps) => (
  <main className="screen">
    <header className="subscreen__header">
      <div>
        <p className="subscreen__eyebrow">Milestones</p>
        <h1 className="subscreen__title">Rewards</h1>
        <p className="subscreen__lead">
          Watch the progress bar fill up and plan the next sticker or treat.
        </p>
      </div>

      <button className="back-button" onClick={onBack} type="button">
        ←
      </button>
    </header>

    <div className="subscreen-stack">
      <section className="info-card">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Current total</p>
            <h3>{totalPoints} points</h3>
          </div>
          <div className="chip">🎁 Reward time</div>
        </div>
        <p className="card__hint">
          Rewards are milestone targets. They stay local to this phone and work offline.
        </p>
      </section>

      <RewardProgress rewards={rewards} totalPoints={totalPoints} />

      <button className="quick-link" onClick={onOpenSettings} type="button">
        Edit rewards in settings
        <small>Change milestones, names, and descriptions.</small>
      </button>
    </div>
  </main>
)
