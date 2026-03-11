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
        const isReadyToClaim = totalPoints >= reward.milestone && !reward.isClaimed

        return (
          <article
            className={`reward-card ${
              reward.isClaimed
                ? 'reward-card--claimed'
                : isReadyToClaim
                  ? 'reward-card--ready'
                  : ''
            }`}
            key={reward.id}
          >
            <div className="reward-card__top">
              <div className="reward-card__copy">
                <div className="reward-card__sticker">
                  <span>{reward.isClaimed ? '🏅' : isReadyToClaim ? '✨' : '🎁'}</span>
                </div>
                <p className="reward-card__title">{reward.title}</p>
                <p className="reward-card__meta">{reward.description}</p>
              </div>
              <div className="reward-card__badge">
                {reward.isClaimed ? 'Claimed' : `${reward.milestone} pts`}
              </div>
            </div>

            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-track__fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="reward-card__footer">
              <p className="reward-card__meta">
                {reward.isClaimed
                  ? reward.claimedAt
                    ? `Claimed on ${new Date(reward.claimedAt).toLocaleDateString()}`
                    : 'Claimed reward'
                  : formatRewardDistance(totalPoints, reward.milestone)}
              </p>
              {isReadyToClaim ? (
                <span className="reward-card__status reward-card__status--ready">
                  Ready to claim
                </span>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
