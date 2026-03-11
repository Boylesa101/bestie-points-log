import type { PointActionType } from '../types/app'

const SOUND_FILES: Record<PointActionType, string> = {
  add: '/sounds/yay.mp3',
  remove: '/sounds/aww.mp3',
}

const SOUND_VOLUMES: Record<PointActionType, number> = {
  add: 0.52,
  remove: 0.46,
}

const SOUND_PLAYBACK_RATES: Record<PointActionType, number> = {
  add: 1.12,
  remove: 1.04,
}

const SOUND_CLIP_LENGTH_MS: Record<PointActionType, number> = {
  add: 1250,
  remove: 1450,
}

let sharedAudioContext: AudioContext | null = null
const sharedAudioElements: Partial<Record<PointActionType, HTMLAudioElement>> = {}

const getAudioContext = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioContextClass) {
    return null
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass()
  }

  return sharedAudioContext
}

export const playPointSound = async (
  type: PointActionType,
  enabled: boolean,
) => {
  if (!enabled) {
    return false
  }

  const assetPlayed = await playAudioAsset(type)

  if (assetPlayed) {
    return true
  }

  const audioContext = getAudioContext()

  if (!audioContext) {
    return false
  }

  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    if (type === 'add') {
      playPositiveSound(audioContext)
    } else {
      playNegativeSound(audioContext)
    }

    return true
  } catch {
    return false
  }
}

const playAudioAsset = async (type: PointActionType) => {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return false
  }

  try {
    const sourceAudio = getSharedAudio(type)

    if (!sourceAudio) {
      return false
    }

    const playbackAudio = sourceAudio.cloneNode() as HTMLAudioElement
    playbackAudio.volume = sourceAudio.volume
    playbackAudio.playbackRate = SOUND_PLAYBACK_RATES[type]
    playbackAudio.preload = 'auto'
    playbackAudio.currentTime = 0
    await playbackAudio.play()
    window.setTimeout(() => {
      playbackAudio.pause()
      playbackAudio.currentTime = 0
      playbackAudio.src = ''
    }, SOUND_CLIP_LENGTH_MS[type])
    return true
  } catch {
    return false
  }
}

const getSharedAudio = (type: PointActionType) => {
  if (sharedAudioElements[type]) {
    return sharedAudioElements[type] ?? null
  }

  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null
  }

  const audio = new Audio(getSoundUrl(type))
  audio.preload = 'auto'
  audio.volume = SOUND_VOLUMES[type]
  sharedAudioElements[type] = audio
  return audio
}

const getSoundUrl = (type: PointActionType) =>
  new URL(SOUND_FILES[type], window.location.origin).toString()

const playPositiveSound = (audioContext: AudioContext) => {
  const start = audioContext.currentTime + 0.01
  playTone(audioContext, {
    attack: 0.01,
    duration: 0.16,
    frequency: 523.25,
    gain: 0.05,
    start,
    type: 'triangle',
  })
  playTone(audioContext, {
    attack: 0.01,
    duration: 0.19,
    frequency: 659.25,
    gain: 0.045,
    start: start + 0.06,
    type: 'triangle',
  })
  playTone(audioContext, {
    attack: 0.01,
    duration: 0.22,
    frequency: 783.99,
    gain: 0.04,
    start: start + 0.12,
    type: 'sine',
  })
}

const playNegativeSound = (audioContext: AudioContext) => {
  const start = audioContext.currentTime + 0.01
  playTone(audioContext, {
    attack: 0.01,
    duration: 0.18,
    frequency: 261.63,
    gain: 0.045,
    start,
    type: 'sine',
  })
  playTone(audioContext, {
    attack: 0.01,
    duration: 0.24,
    frequency: 220,
    gain: 0.035,
    start: start + 0.08,
    type: 'triangle',
  })
}

interface ToneOptions {
  attack: number
  duration: number
  frequency: number
  gain: number
  start: number
  type: OscillatorType
}

const playTone = (audioContext: AudioContext, options: ToneOptions) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = options.type
  oscillator.frequency.setValueAtTime(options.frequency, options.start)
  gainNode.gain.setValueAtTime(0.0001, options.start)
  gainNode.gain.exponentialRampToValueAtTime(
    options.gain,
    options.start + options.attack,
  )
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    options.start + options.duration,
  )

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  oscillator.start(options.start)
  oscillator.stop(options.start + options.duration + 0.04)
}
