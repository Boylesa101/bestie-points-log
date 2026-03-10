import type { HistoryEntry } from '../types/app'

export const formatPointsBadge = (entry: Pick<HistoryEntry, 'points' | 'type'>) =>
  `${entry.type === 'add' ? '+' : '-'}${entry.points}`

export const formatRewardDistance = (currentPoints: number, milestone: number) => {
  const remaining = Math.max(milestone - currentPoints, 0)

  if (remaining === 0) {
    return 'Ready now'
  }

  return `${remaining} points to go`
}

export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const diffMs = Date.now() - date.getTime()

  if (Number.isNaN(date.getTime())) {
    return 'Just now'
  }

  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return 'Just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  })
}
