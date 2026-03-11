/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.bestiepointslog.app',
  appName: 'Bestie Points Log',
  backgroundColor: '#fff8f2',
  bundledWebRuntime: false,
  plugins: {
    LocalNotifications: {
      iconColor: '#ff89b7',
    },
  },
  webDir: 'dist',
}

export default config
