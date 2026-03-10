import { formatRewardDistance } from '../lib/format'
import type { Reward } from '../types/app'

interface RewardProgressProps {
  rewards: Reward[]
  totalPoints: number
}

export const RewardProgress = ({
  rewards,
  totalPoints,
}: RewardProgressProps) => {
  if (!rewards.length) {
    return (
      <div className="empty-state">
        <h3>No rewards yet</h3>
        <p>Add a reward in settings to give Bestie Points a milestone to chase.</p>
      </div>
    )
  }

  return (
    <div className="reward-stack">
      {rewards.map((reward) => {
        const progress =
          reward.milestone > 0
            ? Math.min((totalPoints / reward.milestone) * 100, 100)
            : 0

        return (
          <article className="reward-card" key={reward.id}>
            <div className="reward-card__top">
              <div>
                <p className="reward-card__title">{reward.title}</p>
                <p className="reward-card__meta">{reward.description}</p>
              </div>
              <div className="reward-card__badge">{reward.milestone} pts</div>
            </div>

            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-track__fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="reward-card__meta">
              {formatRewardDistance(totalPoints, reward.milestone)}
            </p>
          </article>
        )
      })}
    </div>
  )
}
