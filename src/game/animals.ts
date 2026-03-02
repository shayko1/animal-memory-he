export type AnimalId =
  | 'lion'
  | 'elephant'
  | 'giraffe'
  | 'monkey'
  | 'tiger'
  | 'panda'
  | 'penguin'
  | 'fox'
  | 'koala'
  | 'frog'
  | 'owl'
  | 'dolphin'
  | 'cat'
  | 'dog'
  | 'rabbit'
  | 'bear'
  | 'zebra'
  | 'whale'

export type Animal = {
  id: AnimalId
  nameHe: string
  emoji: string
}

export const ANIMALS: readonly Animal[] = [
  { id: 'lion', nameHe: 'אריה', emoji: '🦁' },
  { id: 'elephant', nameHe: 'פיל', emoji: '🐘' },
  { id: 'giraffe', nameHe: 'ג׳ירפה', emoji: '🦒' },
  { id: 'monkey', nameHe: 'קוף', emoji: '🐵' },
  { id: 'tiger', nameHe: 'טיגריס', emoji: '🐯' },
  { id: 'panda', nameHe: 'פנדה', emoji: '🐼' },
  { id: 'penguin', nameHe: 'פינגווין', emoji: '🐧' },
  { id: 'fox', nameHe: 'שועל', emoji: '🦊' },
  { id: 'koala', nameHe: 'קואלה', emoji: '🐨' },
  { id: 'frog', nameHe: 'צפרדע', emoji: '🐸' },
  { id: 'owl', nameHe: 'ינשוף', emoji: '🦉' },
  { id: 'dolphin', nameHe: 'דולפין', emoji: '🐬' },
  { id: 'cat', nameHe: 'חתול', emoji: '🐱' },
  { id: 'dog', nameHe: 'כלב', emoji: '🐶' },
  { id: 'rabbit', nameHe: 'ארנב', emoji: '🐰' },
  { id: 'bear', nameHe: 'דוב', emoji: '🐻' },
  { id: 'zebra', nameHe: 'זברה', emoji: '🦓' },
  { id: 'whale', nameHe: 'לווייתן', emoji: '🐳' },
] as const
