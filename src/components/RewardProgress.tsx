import { formatRewardDistance } from '../lib/format'
import { getRewardIcon, isRewardUnlocked } from '../lib/rewards'
import type { Reward } from '../types/app'

interface RewardProgressProps {
  onOpenParentDetails?: (reward: Reward) => void
  rewards: Reward[]
  totalPoints: number
}

export const RewardProgress = ({
  onOpenParentDetails,
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
        const isUnlocked = isRewardUnlocked(reward, totalPoints)
        const isReadyToClaim = isUnlocked && !reward.isClaimed
        const isHiddenUntilUnlock = !reward.visibleBeforeUnlock && !isUnlocked
        const childTitle = isHiddenUntilUnlock ? 'Secret surprise reward' : reward.title
        const childDescription = isHiddenUntilUnlock
          ? `${formatRewardDistance(totalPoints, reward.milestone)} until the surprise is revealed.`
          : reward.description
        const badgeText = reward.isClaimed
          ? 'Claimed'
          : isUnlocked
            ? `${reward.milestone} pts`
            : `${reward.milestone} pts`

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
                  <span>
                    {reward.isClaimed ? '🏅' : isReadyToClaim ? '✨' : getRewardIcon(reward)}
                  </span>
                </div>
                <p className="reward-card__title">{childTitle}</p>
                <p className="reward-card__meta">{childDescription}</p>
                {!isHiddenUntilUnlock && reward.category === 'day-out' && reward.venueName ? (
                  <p className="reward-card__meta reward-card__meta--venue">📍 {reward.venueName}</p>
                ) : null}
              </div>
              <div className="reward-card__badge">{badgeText}</div>
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

            {onOpenParentDetails && isUnlocked ? (
              <button
                className="inline-button reward-card__parent-link"
                onClick={() => onOpenParentDetails(reward)}
                type="button"
              >
                Parent details
              </button>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
