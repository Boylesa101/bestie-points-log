export type ToneCheckCategory =
  | 'aggressive-label'
  | 'insult'
  | 'punitive'
  | 'rejection'
  | 'shame'

export type ToneCheckSeverity = 'low' | 'medium' | 'high'

export interface ToneCheckInput {
  key: string
  label: string
  value: string
}

export interface ToneCheckMatch {
  category: ToneCheckCategory
  fieldLabel: string
  phrase: string
  severityPoints: number
  suggestions: string[]
}

export interface ToneCheckResult {
  fieldLabels: string[]
  isFlagged: boolean
  matchedPhrases: string[]
  matches: ToneCheckMatch[]
  score: number
  severity: ToneCheckSeverity
  signature: string
  suggestions: string[]
}

interface ToneCheckRule {
  category: ToneCheckCategory
  phrases: string[]
  severityPoints: number
  suggestions: string[]
}

const TONE_CHECK_RULES: ToneCheckRule[] = [
  {
    category: 'insult',
    phrases: ['stupid', 'idiot', 'dumb'],
    severityPoints: 3,
    suggestions: ['Not listening', 'Needs help with calm choices'],
  },
  {
    category: 'shame',
    phrases: ['useless', 'pathetic', 'disgusting'],
    severityPoints: 4,
    suggestions: ['Hard moment', 'Needs support to reset'],
  },
  {
    category: 'aggressive-label',
    phrases: ['bad boy', 'bad girl', 'horrible child', 'naughty and bad', 'brat'],
    severityPoints: 3,
    suggestions: ['Not listening', 'Needs a calm reset', 'Unkind behaviour'],
  },
  {
    category: 'rejection',
    phrases: ['i hate you', 'you are awful', 'youre awful', 'no one likes you'],
    severityPoints: 5,
    suggestions: ['Hard moment', 'Needs help calming down'],
  },
  {
    category: 'punitive',
    phrases: ['punishment', 'punish', 'nasty child'],
    severityPoints: 2,
    suggestions: ['Needs a calm reset', 'Try again after a pause'],
  },
]

const normalizeToneText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const phraseToPattern = (phrase: string) =>
  new RegExp(`(?:^| )${escapeRegex(normalizeToneText(phrase))}(?: |$)`)

const calculateSeverity = (score: number): ToneCheckSeverity => {
  if (score >= 5) {
    return 'high'
  }

  if (score >= 3) {
    return 'medium'
  }

  return 'low'
}

const dedupe = (values: string[]) => {
  const uniqueValues = new Set<string>()
  const orderedValues: string[] = []

  values.forEach((value) => {
    if (!value || uniqueValues.has(value)) {
      return
    }

    uniqueValues.add(value)
    orderedValues.push(value)
  })

  return orderedValues
}

export const runToneCheck = (inputs: ToneCheckInput[]): ToneCheckResult => {
  const matches: ToneCheckMatch[] = []

  inputs.forEach((input) => {
    const normalizedValue = normalizeToneText(input.value)

    if (!normalizedValue) {
      return
    }

    TONE_CHECK_RULES.forEach((rule) => {
      const matchedPhrase = rule.phrases.find((phrase) =>
        phraseToPattern(phrase).test(normalizedValue),
      )

      if (!matchedPhrase) {
        return
      }

      matches.push({
        category: rule.category,
        fieldLabel: input.label,
        phrase: matchedPhrase,
        severityPoints: rule.severityPoints,
        suggestions: rule.suggestions,
      })
    })
  })

  const score = matches.reduce((total, match) => total + match.severityPoints, 0)
  const matchedPhrases = dedupe(matches.map((match) => match.phrase))
  const fieldLabels = dedupe(matches.map((match) => match.fieldLabel))
  const suggestions = dedupe(matches.flatMap((match) => match.suggestions)).slice(0, 4)

  return {
    fieldLabels,
    isFlagged: matches.length > 0,
    matchedPhrases,
    matches,
    score,
    severity: calculateSeverity(score),
    signature: `${fieldLabels.join('|')}::${matchedPhrases.join('|')}`,
    suggestions,
  }
}
