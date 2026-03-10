export const prepareImageDataUrl = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.')
  }

  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(imageUrl)
    const maxSide = 640
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Image editing is not available in this browser.')
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
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
