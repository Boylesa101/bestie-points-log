import type { PointActionType } from '../types/app'

let sharedAudioContext: AudioContext | null = null

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
