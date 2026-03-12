import type { Presets, Profile, Reward, SyncSession, AppSettings } from '../types/app'

export type AccountSectionTarget =
  | 'points'
  | 'profile'
  | 'settings'
  | 'support'
  | 'sync'

interface AccountScreenProps {
  onBack: () => void
  onOpenSection: (section: AccountSectionTarget) => void
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
  syncSession: SyncSession
}

export const AccountScreen = ({
  onBack,
  onOpenSection,
  presets,
  profile,
  rewards,
  settings,
  syncSession,
}: AccountScreenProps) => {
  const visiblePresetCount = [...presets.add, ...presets.remove].filter(
    (preset) => preset.visibleOnHome,
  ).length

  return (
    <main className="screen">
      <header className="subscreen__header">
        <div>
          <p className="subscreen__eyebrow">Parent hub</p>
          <h1 className="subscreen__title">Account</h1>
          <p className="subscreen__lead">
            Manage {profile.childName}&apos;s profile, point buttons, family sync, and app preferences.
          </p>
        </div>

        <button aria-label="Back to home" className="back-button" onClick={onBack} type="button">
          ←
        </button>
      </header>

      <div className="account-stack">
        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Child profile</h3>
            <div className="chip">🧸 Parent only</div>
          </div>

          <button className="account-card" onClick={() => onOpenSection('profile')} type="button">
            <span className="account-card__icon">📸</span>
            <span className="account-card__copy">
              <strong>Edit child profile</strong>
              <small>
                {profile.childName}
                {profile.photoDataUrl ? ' · photo added' : ' · using placeholder avatar'}
              </small>
            </span>
            <span className="account-card__chevron">›</span>
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Points & rewards</h3>
            <div className="chip">⭐ Daily use</div>
          </div>

          <div className="account-card-list">
            <button className="account-card" onClick={() => onOpenSection('points')} type="button">
              <span className="account-card__icon">🎁</span>
              <span className="account-card__copy">
                <strong>Manage rewards</strong>
                <small>{rewards.length} reward{rewards.length === 1 ? '' : 's'} to earn or redeem</small>
              </span>
              <span className="account-card__chevron">›</span>
            </button>

            <button className="account-card" onClick={() => onOpenSection('points')} type="button">
              <span className="account-card__icon">➕</span>
              <span className="account-card__copy">
                <strong>Manage point buttons</strong>
                <small>
                  {presets.add.length + presets.remove.length} presets saved · {visiblePresetCount} on home
                </small>
              </span>
              <span className="account-card__chevron">›</span>
            </button>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Sync & devices</h3>
            <div className="chip">
              {syncSession.mode === 'synced' ? '☁️ Shared family' : '🔗 Local log'}
            </div>
          </div>

          <button className="account-card" onClick={() => onOpenSection('sync')} type="button">
            <span className="account-card__icon">📱</span>
            <span className="account-card__copy">
              <strong>Sync & devices</strong>
              <small>
                {syncSession.mode === 'synced'
                  ? `${syncSession.linkedDevices.length} linked device${syncSession.linkedDevices.length === 1 ? '' : 's'}`
                  : 'Create or join a family sync'}
              </small>
            </span>
            <span className="account-card__chevron">›</span>
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>App settings</h3>
            <div className="chip">⚙️ This phone</div>
          </div>

          <button className="account-card" onClick={() => onOpenSection('settings')} type="button">
            <span className="account-card__icon">🛠️</span>
            <span className="account-card__copy">
              <strong>Settings</strong>
              <small>
                {settings.soundEnabled ? 'Sounds on' : 'Sounds muted'} ·{' '}
                {settings.reminderEnabled ? `Reminder ${settings.reminderTime}` : 'Reminder off'}
              </small>
            </span>
            <span className="account-card__chevron">›</span>
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Support / help</h3>
            <div className="chip">💛 Calm support</div>
          </div>

          <button className="account-card" onClick={() => onOpenSection('support')} type="button">
            <span className="account-card__icon">🫶</span>
            <span className="account-card__copy">
              <strong>Help &amp; support</strong>
              <small>Parent support links, app version, and guidance</small>
            </span>
            <span className="account-card__chevron">›</span>
          </button>
        </section>
      </div>
    </main>
  )
}
