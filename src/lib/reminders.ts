import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import {
  LocalNotifications,
  type PermissionStatus,
} from '@capacitor/local-notifications'
import type { NotificationPermissionState } from '../types/app'

interface ReminderScheduleInput {
  enabled: boolean
  time: string
}

interface ReminderScheduleResult {
  permissionState: NotificationPermissionState
  scheduled: boolean
}

interface ReminderPromptState {
  hasPointsToday: boolean
  lastReminderShownDate: string | null
  reminderEnabled: boolean
  reminderTime: string
}

type ReminderIntentListener = () => void

const DAILY_REMINDER_ID = 1700
const DAILY_REMINDER_CHANNEL_ID = 'daily-points-reminder'
const REMINDER_PENDING_INTENT_KEY = 'bestie-points-log/pending-reminder-intent'
const REMINDER_MESSAGE = 'Any points today?'

const reminderIntentListeners = new Set<ReminderIntentListener>()

let nativeReminderListenersReady = false

const safeStorage = {
  get(key: string) {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  remove(key: string) {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore storage failures for reminder intent flags.
    }
  },
  set(key: string, value: string) {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Ignore storage failures for reminder intent flags.
    }
  },
}

export const isNativeReminderPlatform = () => Capacitor.isNativePlatform()

export const isNotificationApiSupported = () =>
  typeof window !== 'undefined' && typeof Notification !== 'undefined'

export const getReminderMessage = () => REMINDER_MESSAGE

export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseReminderTime = (time: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time)

  if (!match) {
    return {
      hour: 17,
      minute: 0,
    }
  }

  const hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return {
      hour: 17,
      minute: 0,
    }
  }

  return {
    hour,
    minute,
  }
}

export const hasReachedReminderTime = (time: string, now = new Date()) => {
  const { hour, minute } = parseReminderTime(time)
  const target = new Date(now)
  target.setHours(hour, minute, 0, 0)
  return now.getTime() >= target.getTime()
}

export const shouldShowWebReminderPrompt = ({
  hasPointsToday,
  lastReminderShownDate,
  reminderEnabled,
  reminderTime,
}: ReminderPromptState) => {
  if (!reminderEnabled || hasPointsToday) {
    return false
  }

  const today = getDateKey()

  if (lastReminderShownDate === today) {
    return false
  }

  return hasReachedReminderTime(reminderTime)
}

const emitReminderIntent = () => {
  safeStorage.set(REMINDER_PENDING_INTENT_KEY, '1')
  reminderIntentListeners.forEach((listener) => listener())
}

const consumePendingReminderIntent = () => {
  const hasPendingIntent = safeStorage.get(REMINDER_PENDING_INTENT_KEY) === '1'

  if (hasPendingIntent) {
    safeStorage.remove(REMINDER_PENDING_INTENT_KEY)
  }

  return hasPendingIntent
}

export const subscribeToReminderIntent = (listener: ReminderIntentListener) => {
  reminderIntentListeners.add(listener)

  if (consumePendingReminderIntent()) {
    listener()
  }

  return () => {
    reminderIntentListeners.delete(listener)
  }
}

export const initializeReminderBridge = async () => {
  if (!isNativeReminderPlatform() || nativeReminderListenersReady) {
    return
  }

  nativeReminderListenersReady = true

  try {
    await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      ({ notification }) => {
        if (notification.id === DAILY_REMINDER_ID) {
          emitReminderIntent()
        }
      },
    )

    await CapacitorApp.addListener('resume', () => {
      if (consumePendingReminderIntent()) {
        reminderIntentListeners.forEach((listener) => listener())
      }
    })
  } catch {
    // Ignore native reminder listener failures and keep the app usable.
  }
}

const toPermissionState = (
  permission: PermissionStatus['display'] | NotificationPermission,
): NotificationPermissionState => {
  if (permission === 'granted') {
    return 'granted'
  }

  if (permission === 'denied') {
    return 'denied'
  }

  if (permission === 'prompt') {
    return 'default'
  }

  return 'unsupported'
}

export const getReminderPermissionState = async (): Promise<NotificationPermissionState> => {
  if (isNativeReminderPlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions()
      return toPermissionState(permission.display)
    } catch {
      return 'unsupported'
    }
  }

  if (!isNotificationApiSupported()) {
    return 'unsupported'
  }

  return toPermissionState(Notification.permission)
}

export const requestReminderPermission = async (): Promise<NotificationPermissionState> => {
  if (isNativeReminderPlatform()) {
    try {
      const permission = await LocalNotifications.requestPermissions()
      return toPermissionState(permission.display)
    } catch {
      return 'unsupported'
    }
  }

  if (!isNotificationApiSupported()) {
    return 'unsupported'
  }

  try {
    const permission = await Notification.requestPermission()
    return toPermissionState(permission)
  } catch {
    return 'unsupported'
  }
}

const ensureReminderChannel = async () => {
  await LocalNotifications.createChannel({
    description: 'Daily points reminder',
    id: DAILY_REMINDER_CHANNEL_ID,
    importance: 3,
    name: 'Daily reminder',
    sound: undefined,
  })
}

const cancelNativeReminder = async () => {
  await LocalNotifications.cancel({
    notifications: [{ id: DAILY_REMINDER_ID }],
  })
}

export const syncReminderSchedule = async ({
  enabled,
  time,
}: ReminderScheduleInput): Promise<ReminderScheduleResult> => {
  if (!isNativeReminderPlatform()) {
    return {
      permissionState: await getReminderPermissionState(),
      scheduled: false,
    }
  }

  try {
    const currentPermission = await LocalNotifications.checkPermissions()
    let permissionState = toPermissionState(currentPermission.display)

    if (enabled && permissionState === 'default') {
      permissionState = await requestReminderPermission()
    }

    await cancelNativeReminder()

    if (!enabled || permissionState !== 'granted') {
      return {
        permissionState,
        scheduled: false,
      }
    }

    await ensureReminderChannel()

    const { hour, minute } = parseReminderTime(time)

    await LocalNotifications.schedule({
      notifications: [
        {
          body: REMINDER_MESSAGE,
          channelId: DAILY_REMINDER_CHANNEL_ID,
          extra: {
            focus: 'points-entry',
            source: 'daily-reminder',
          },
          id: DAILY_REMINDER_ID,
          schedule: {
            allowWhileIdle: true,
            on: {
              hour,
              minute,
            },
            repeats: true,
          },
          title: 'Bestie Points Log',
        },
      ],
    })

    return {
      permissionState,
      scheduled: true,
    }
  } catch {
    return {
      permissionState: await getReminderPermissionState(),
      scheduled: false,
    }
  }
}
