import { canRedeemReward, getRewardCategoryIcon } from '../lib/rewards'
import type { Reward } from '../types/app'
import { ModalSheet } from './ModalSheet'

interface RewardDetailsSheetProps {
  onClose: () => void
  onEditInSettings: () => void
  onRedeem: (reward: Reward) => void
  onToggleClaimed: (rewardId: string, isClaimed: boolean) => void
  reward: Reward | null
  totalPoints: number
}

export const RewardDetailsSheet = ({
  onClose,
  onEditInSettings,
  onRedeem,
  onToggleClaimed,
  reward,
  totalPoints,
}: RewardDetailsSheetProps) => {
  if (!reward) {
    return null
  }

  const canRedeem = canRedeemReward(reward, totalPoints)

  return (
    <ModalSheet
      description="Parent-only reward details and offer notes."
      onClose={onClose}
      open
      title={`${getRewardCategoryIcon(reward.category)} ${reward.title}`}
    >
      <div className="reward-details">
        <div className="reward-details__grid">
          <div className="reward-details__item">
            <span className="field-label">Reward type</span>
            <p>{reward.category}</p>
          </div>

          <div className="reward-details__item">
            <span className="field-label">Venue / place</span>
            <p>{reward.venueName || 'Add a venue in settings'}</p>
          </div>
        </div>

        <div className="reward-details__item">
          <span className="field-label">Booking link</span>
          {reward.bookingUrl ? (
            <a className="reward-details__link" href={reward.bookingUrl} rel="noreferrer" target="_blank">
              Open booking page
            </a>
          ) : (
            <p>No booking link added yet.</p>
          )}
        </div>

        <div className="reward-details__grid">
          <div className="reward-details__item">
            <span className="field-label">Discount code</span>
            <p>{reward.discountCode || 'None added'}</p>
          </div>

          <div className="reward-details__item">
            <span className="field-label">Offer source</span>
            <p>{reward.offerSource || 'Not added yet'}</p>
          </div>
        </div>

        <div className="reward-details__item">
          <span className="field-label">Eligibility notes</span>
          <p>{reward.eligibilityNotes || 'No extra notes yet.'}</p>
        </div>

        <div className="reward-details__grid">
          <div className="reward-details__item">
            <span className="field-label">Cost</span>
            <p>
              {reward.redemptionType === 'unlock-only'
                ? 'Unlock only'
                : `${reward.costPoints} points`}
            </p>
          </div>

          <div className="reward-details__item">
            <span className="field-label">Last checked</span>
            <p>
              {reward.lastCheckedAt
                ? new Date(reward.lastCheckedAt).toLocaleDateString()
                : 'Not added'}
            </p>
          </div>

          <div className="reward-details__item">
            <span className="field-label">Status</span>
            <p>
              {reward.isClaimed
                ? 'Redeemed'
                : reward.unlockedAt
                  ? 'Unlocked and ready'
                  : totalPoints >= reward.milestone
                    ? 'Ready to redeem'
                    : 'Still locked'}
            </p>
          </div>
        </div>

        <div className="sheet-actions">
          {!reward.isClaimed ? (
            <button
              className="sheet-button sheet-button--primary"
              disabled={!canRedeem}
              onClick={() => onRedeem(reward)}
              type="button"
            >
              Redeem reward
            </button>
          ) : null}
          <button
            className="sheet-button sheet-button--secondary"
            onClick={() => onToggleClaimed(reward.id, !reward.isClaimed)}
            type="button"
          >
            {reward.isClaimed ? 'Reset redeemed' : 'Mark claimed'}
          </button>
          <button className="sheet-button sheet-button--secondary" onClick={onEditInSettings} type="button">
            Edit reward
          </button>
        </div>
      </div>
    </ModalSheet>
  )
}
