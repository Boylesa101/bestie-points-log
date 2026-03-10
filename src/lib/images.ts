export const prepareImageDataUrl = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.')
  }

  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    const outputSize = 320
    const cropSize = Math.min(image.width, image.height)
    const sourceX = Math.max(0, (image.width - cropSize) / 2)
    const sourceY = Math.max(0, (image.height - cropSize) / 2)
    canvas.width = outputSize
    canvas.height = outputSize

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Image editing is not available in this browser.')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      outputSize,
      outputSize,
    )

    const primaryDataUrl = canvas.toDataURL('image/jpeg', 0.74)

    if (primaryDataUrl.length < 700_000) {
      return primaryDataUrl
    }

    return canvas.toDataURL('image/jpeg', 0.62)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The photo could not be opened.'))
    image.src = src
  })
