import { SyncStatus } from './SyncStatus'
import type { Profile, SyncSession } from '../types/app'

interface ChildHeaderProps {
  onOpenSettings: () => void
  profile: Profile
  syncSession: SyncSession
  totalPoints: number
}

export const ChildHeader = ({
  onOpenSettings,
  profile,
  syncSession,
  totalPoints,
}: ChildHeaderProps) => (
  <section className="child-hero">
    <div className="child-hero__sky" />
    <div className="child-hero__decor child-hero__decor--left">☁️</div>
    <div className="child-hero__decor child-hero__decor--right">⭐</div>
    <button
      aria-label="Open settings"
      className="child-hero__settings"
      onClick={onOpenSettings}
      type="button"
    >
      ⚙️
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
