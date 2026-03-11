import type { Reward, RewardCategory } from '../types/app'

export const DAY_OUT_PLACE_OPTIONS = [
  'Alton Towers',
  'Thorpe Park',
  'Chessington World of Adventures',
  'LEGOLAND Windsor',
  'Paultons Park / Peppa Pig World',
  'Drayton Manor',
  'Blackpool Pleasure Beach',
  'Custom place',
] as const

export const getRewardIcon = (reward: Reward) => {
  if (reward.icon) {
    return reward.icon
  }

  return getRewardCategoryIcon(reward.category)
}

export const getRewardCategoryIcon = (category: RewardCategory) => {
  if (category === 'day-out') {
    return '🎢'
  }

  if (category === 'treat') {
    return '🍭'
  }

  if (category === 'home') {
    return '🏡'
  }

  return '⭐'
}

export const isRewardUnlocked = (reward: Reward, totalPoints: number) =>
  totalPoints >= reward.milestone

export const isRewardReadyToReveal = (reward: Reward, totalPoints: number) =>
  isRewardUnlocked(reward, totalPoints) && !reward.hasCelebratedUnlock
