import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'

type UpdateListener = (hasUpdate: boolean) => void

const updateListeners = new Set<UpdateListener>()

let hasUpdateAvailable = false
let isInitialized = false
let triggerServiceWorkerUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null

const notifyListeners = () => {
  updateListeners.forEach((listener) => listener(hasUpdateAvailable))
}

export const initializePwaUpdates = () => {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform() || isInitialized) {
    return
  }

  isInitialized = true

  let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      hasUpdateAvailable = true
      triggerServiceWorkerUpdate = updateSW
      notifyListeners()
    },
  })
}

export const subscribeToPwaUpdates = (listener: UpdateListener) => {
  updateListeners.add(listener)
  listener(hasUpdateAvailable)

  return () => {
    updateListeners.delete(listener)
  }
}

export const applyPwaUpdate = async () => {
  if (!triggerServiceWorkerUpdate) {
    return false
  }

  await triggerServiceWorkerUpdate(true)
  return true
}
