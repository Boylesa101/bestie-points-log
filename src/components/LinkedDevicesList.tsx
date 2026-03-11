import type { LinkedDevice } from '../types/app'

interface LinkedDevicesListProps {
  devices: LinkedDevice[]
  onRevoke?: (deviceId: string) => void
  primaryDeviceId: string | null
}

export const LinkedDevicesList = ({
  devices,
  onRevoke,
  primaryDeviceId,
}: LinkedDevicesListProps) => {
  if (!devices.length) {
    return (
      <div className="empty-state empty-state--soft">
        <h3>No linked devices yet</h3>
        <p>Create a new sync code to link a second phone.</p>
      </div>
    )
  }

  return (
    <div className="editor-list">
      {devices.map((device) => (
        <article className="editor-row editor-row--device" key={device.id}>
          <div className="editor-row__top">
            <div>
              <strong>{device.parentName}</strong>
              <p className="field__help">
                {device.deviceName || 'Phone'}
                {device.id === primaryDeviceId ? ' · Primary' : ''}
              </p>
            </div>
            {onRevoke && device.revokedAt === null && device.id !== primaryDeviceId ? (
              <button
                className="danger-button danger-button--tiny"
                onClick={() => onRevoke(device.id)}
                type="button"
              >
                Revoke
              </button>
            ) : null}
          </div>

          <p className="field__help">
            Last sync:{' '}
            {device.lastSeenAt
              ? new Date(device.lastSeenAt).toLocaleString()
              : 'Not seen yet'}
          </p>

          {device.revokedAt ? (
            <p className="error-text">
              Revoked on {new Date(device.revokedAt).toLocaleString()}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  )
}
