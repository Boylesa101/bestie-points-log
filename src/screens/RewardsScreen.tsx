import { RewardProgress } from '../components/RewardProgress'
import type { Reward } from '../types/app'

interface RewardsScreenProps {
  onBack: () => void
  onOpenParentDetails: (reward: Reward) => void
  onRedeemReward: (reward: Reward) => void
  onOpenSettings: () => void
  rewards: Reward[]
  totalPoints: number
}

export const RewardsScreen = ({
  onBack,
  onOpenParentDetails,
  onRedeemReward,
  onOpenSettings,
  rewards,
  totalPoints,
}: RewardsScreenProps) => {
  const claimedCount = rewards.filter((reward) => reward.isClaimed).length
  const readyCount = rewards.filter(
    (reward) => !reward.isClaimed && totalPoints >= reward.milestone,
  ).length

  return (
    <main className="screen">
      <header className="subscreen__header">
        <div>
          <p className="subscreen__eyebrow">Milestones</p>
          <h1 className="subscreen__title">Rewards</h1>
          <p className="subscreen__lead">
            Watch the progress fill up and unlock stickers, treats, home rewards, and day out surprises.
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
          <div className="reward-summary">
            <span className="chip chip--reward">🏅 {claimedCount} claimed</span>
            <span className="chip chip--reward">✨ {readyCount} ready now</span>
          </div>
          <p className="card__hint">
            Locked rewards stay locked, unlocked rewards can be redeemed, and redeemed rewards keep their badge.
          </p>
        </section>

        <RewardProgress
          onRedeemReward={onRedeemReward}
          onOpenParentDetails={onOpenParentDetails}
          rewards={rewards}
          totalPoints={totalPoints}
        />

        <button className="quick-link" onClick={onOpenSettings} type="button">
          Edit rewards in settings
          <small>Change reward type, booking links, offer notes, and day out details.</small>
        </button>
      </div>
    </main>
  )
}
