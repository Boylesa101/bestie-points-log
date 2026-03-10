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

  if (Number.isNaN(date.getTime())) {
    return 'Now'
  }

  const now = new Date()
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isSameDay) {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  })
}
