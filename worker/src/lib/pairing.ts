const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const normalizePairCode = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const formatPairCode = (value: string) => {
  const normalized = normalizePairCode(value)
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`
}

export const generatePairCode = () => {
  let code = ''

  for (let index = 0; index < 8; index += 1) {
    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % CODE_ALPHABET.length
    code += CODE_ALPHABET[randomIndex]
  }

  return formatPairCode(code)
}
