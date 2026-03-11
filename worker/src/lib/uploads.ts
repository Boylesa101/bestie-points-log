import type { WorkerEnv } from './auth'

const dataUrlPattern = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/

const extensionByMime: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const uploadPhotoDataUrl = async (
  env: WorkerEnv,
  familyId: string,
  photoDataUrl: string | null,
) => {
  if (!photoDataUrl) {
    return null
  }

  const match = photoDataUrl.match(dataUrlPattern)

  if (!match) {
    throw new Error('Child photo must be a valid image data URL.')
  }

  const [, mimeType, base64] = match
  const binary = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  const extension = extensionByMime[mimeType] ?? 'bin'
  const photoKey = `${familyId}/${crypto.randomUUID()}.${extension}`

  await env.PHOTOS.put(photoKey, binary, {
    httpMetadata: {
      contentType: mimeType,
    },
  })

  return photoKey
}

export const readPhotoDataUrl = async (
  env: WorkerEnv,
  photoKey: string | null,
) => {
  if (!photoKey) {
    return null
  }

  const object = await env.PHOTOS.get(photoKey)

  if (!object) {
    return null
  }

  const arrayBuffer = await object.arrayBuffer()
  const mimeType = object.httpMetadata?.contentType ?? 'image/png'
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return `data:${mimeType};base64,${btoa(binary)}`
}
