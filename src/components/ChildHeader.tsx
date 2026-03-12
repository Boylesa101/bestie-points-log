import { SyncStatus } from './SyncStatus'
import type { Profile, SyncSession } from '../types/app'

interface ChildHeaderProps {
  onOpenAccount: () => void
  profile: Profile
  syncSession: SyncSession
  totalPoints: number
}

export const ChildHeader = ({
  onOpenAccount,
  profile,
  syncSession,
  totalPoints,
}: ChildHeaderProps) => (
  <section className="child-hero">
    <div className="child-hero__sky" />
    <div className="child-hero__decor child-hero__decor--left">☁️</div>
    <div className="child-hero__decor child-hero__decor--right">⭐</div>
    <button
      aria-label="Open account"
      className="child-hero__settings"
      onClick={onOpenAccount}
      type="button"
    >
      <span className="child-hero__settings-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 12.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Zm0 1.8c-3.3 0-6 1.72-6 3.84 0 .64.52 1.16 1.16 1.16h9.68c.64 0 1.16-.52 1.16-1.16 0-2.12-2.7-3.84-6-3.84Z" />
        </svg>
        <span className="child-hero__settings-spark">✨</span>
      </span>
    </button>

    <div className="child-hero__top">
      <div className="child-hero__avatar" aria-label={`${profile.childName} avatar`}>
        {profile.photoDataUrl ? (
          <img alt={`${profile.childName}`} src={profile.photoDataUrl} />
        ) : (
          <div className="child-hero__avatar-placeholder">
            <span>📷</span>
            <span className="child-hero__badge">⭐</span>
          </div>
        )}
      </div>

      <div className="child-hero__copy">
        <p className="child-hero__eyebrow">Bestie Points</p>
        <h2>{profile.childName}</h2>
        <p>Let&apos;s win lots of stars today!</p>
        <SyncStatus syncSession={syncSession} />
      </div>
    </div>

    <div className="child-hero__total">
      <div>
        <p className="child-hero__total-label">Total</p>
        <div className="child-hero__total-value">
          {totalPoints}
        </div>
      </div>

      <div className="child-hero__pill">⭐ Bestie Points</div>
    </div>
  </section>
)
