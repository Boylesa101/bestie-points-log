import { useEffect, useState } from 'react'
import { playRewardCelebrationSound } from '../lib/sound'
import { getRewardIcon } from '../lib/rewards'
import type { Reward } from '../types/app'

interface RewardRevealOverlayProps {
  onClose: () => void
  onOpenParentDetails: () => void
  reward: Reward
  soundEnabled: boolean
}

export const RewardRevealOverlay = ({
  onClose,
  onOpenParentDetails,
  reward,
  soundEnabled,
}: RewardRevealOverlayProps) => {
  const [showDetailsAction, setShowDetailsAction] = useState(false)

  useEffect(() => {
    void playRewardCelebrationSound(soundEnabled)

    const timerId = window.setTimeout(() => {
      setShowDetailsAction(true)
    }, 1400)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [soundEnabled])

  return (
    <div className="reward-reveal" role="dialog" aria-modal="true">
      <div className="reward-reveal__stars" aria-hidden="true">
        <span>⭐</span>
        <span>✨</span>
        <span>🌟</span>
        <span>🎉</span>
        <span>🪄</span>
        <span>⭐</span>
      </div>

      <div className="reward-reveal__panel">
        <p className="reward-reveal__eyebrow">New reward unlocked</p>
        <h2>WELL DONE!</h2>
        <p className="reward-reveal__copy">
          You reached {reward.milestone} Bestie Points and unlocked {reward.title}.
        </p>

        <article className="reward-reveal__card">
          <div className="reward-reveal__icon">{getRewardIcon(reward)}</div>
          <p className="reward-reveal__title">{reward.title}</p>
          <p className="reward-reveal__description">{reward.description}</p>
          {reward.category === 'day-out' && reward.venueName ? (
            <div className="reward-reveal__tag">🎢 {reward.venueName}</div>
          ) : null}
        </article>

        <div className="reward-reveal__actions">
          {showDetailsAction ? (
            <button className="soft-button soft-button--violet" onClick={onOpenParentDetails} type="button">
              Parent details
            </button>
          ) : null}
          <button className="setup-button setup-button--primary" onClick={onClose} type="button">
            Keep going
          </button>
        </div>
      </div>
    </div>
  )
}
