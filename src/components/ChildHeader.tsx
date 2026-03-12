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
      <span className="child-hero__settings-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.6.6 0 0 0 .14-.76l-1.92-3.32a.6.6 0 0 0-.72-.26l-2.39.96a7.53 7.53 0 0 0-1.63-.94l-.36-2.54A.6.6 0 0 0 13.7 1h-3.4a.6.6 0 0 0-.59.51l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.6.6 0 0 0-.72.26L2.7 7.61a.6.6 0 0 0 .14.76l2.03 1.58c-.04.31-.07.63-.07.94s.03.63.07.94L2.84 13.4a.6.6 0 0 0-.14.76l1.92 3.32c.15.26.46.37.72.26l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54c.05.29.3.51.59.51h3.4c.29 0 .54-.22.59-.51l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.26.11.57 0 .72-.26l1.92-3.32a.6.6 0 0 0-.14-.76l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z" />
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
