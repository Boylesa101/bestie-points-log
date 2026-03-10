import type { PointActionType } from '../types/app'

const ICON_RULES: Array<[string, string]> = [
  ['super good', '🌟'],
  ['dinner', '🍽️'],
  ['tidied', '🧸'],
  ['toys', '🧸'],
  ['brushed teeth', '🪥'],
  ['teeth', '🪥'],
  ['washed hands', '🫧'],
  ['hands', '🫧'],
  ['wee-wee', '💧'],
  ['bed', '💧'],
  ['tantrum', '😤'],
  ['lying', '🙈'],
  ['reset', '🧹'],
  ['bonus', '⭐'],
]

export const getEntryIcon = (label: string, type: PointActionType) => {
  const normalizedLabel = label.toLowerCase()
  const match = ICON_RULES.find(([keyword]) => normalizedLabel.includes(keyword))

  if (match) {
    return match[1]
  }

  return type === 'add' ? '⭐' : '🌧️'
}
