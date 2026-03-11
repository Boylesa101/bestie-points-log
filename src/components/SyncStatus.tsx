import type { SyncSession } from '../types/app'

interface SyncStatusProps {
  syncSession: SyncSession
}

const labelByStatus = {
  error: 'Sync issue',
  local: 'Local only',
  offline: 'Offline',
  revoked: 'Access revoked',
  synced: 'Synced',
  syncing: 'Syncing',
} as const

export const SyncStatus = ({ syncSession }: SyncStatusProps) => (
  <div className={`sync-pill sync-pill--${syncSession.status}`}>
    <span className="sync-pill__dot" aria-hidden="true" />
    <span>{labelByStatus[syncSession.status]}</span>
  </div>
)
