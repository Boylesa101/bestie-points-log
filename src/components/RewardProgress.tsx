import { formatRewardDistance } from '../lib/format'
import { canRedeemReward, getRewardCost, getRewardIcon, isRewardRedeemed, isRewardUnlocked } from '../lib/rewards'
import type { Reward } from '../types/app'

interface RewardProgressProps {
  onRedeemReward?: (reward: Reward) => void
  onOpenParentDetails?: (reward: Reward) => void
  rewards: Reward[]
  totalPoints: number
}

export const RewardProgress = ({
  onRedeemReward,
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
        const isRedeemed = isRewardRedeemed(reward)
        const canRedeem = canRedeemReward(reward, totalPoints)
        const isHiddenUntilUnlock = !reward.visibleBeforeUnlock && !isUnlocked
        const childTitle = isHiddenUntilUnlock ? 'Secret surprise reward' : reward.title
        const childDescription = isHiddenUntilUnlock
          ? `${formatRewardDistance(totalPoints, reward.milestone)} until the surprise is revealed.`
          : reward.description
        const badgeText = isRedeemed ? 'Redeemed' : `${reward.milestone} pts`

        return (
          <article
            className={`reward-card ${
              isRedeemed
                ? 'reward-card--claimed'
                : canRedeem
                  ? 'reward-card--ready'
                  : ''
            }`}
            key={reward.id}
          >
            <div className="reward-card__top">
              <div className="reward-card__copy">
                <div className="reward-card__sticker">
                  <span>
                    {isRedeemed ? '🏅' : canRedeem ? '✨' : getRewardIcon(reward)}
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
                {isRedeemed
                  ? reward.redeemedAt
                    ? `Redeemed on ${new Date(reward.redeemedAt).toLocaleDateString()}`
                    : 'Redeemed reward'
                  : formatRewardDistance(totalPoints, reward.milestone)}
              </p>
              {canRedeem ? (
                <span className="reward-card__status reward-card__status--ready">
                  Ready to redeem
                </span>
              ) : null}
            </div>

            <div className="reward-card__actions">
              {onRedeemReward ? (
                <button
                  className="inline-button reward-card__redeem-button"
                  disabled={!canRedeem}
                  onClick={() => onRedeemReward(reward)}
                  type="button"
                >
                  {isRedeemed
                    ? 'Redeemed'
                    : canRedeem
                      ? `Redeem ${reward.redemptionType === 'unlock-only' ? '' : `-${getRewardCost(reward)}`}`.trim()
                      : 'Locked'}
                </button>
              ) : null}

              {onOpenParentDetails && isUnlocked ? (
                <button
                  className="inline-button reward-card__parent-link"
                  onClick={() => onOpenParentDetails(reward)}
                  type="button"
                >
                  Parent details
                </button>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
