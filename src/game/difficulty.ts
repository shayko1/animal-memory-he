import type { Difficulty, DifficultyId } from './types'

export const DIFFICULTIES: readonly Difficulty[] = [
  {
    id: 'easy',
    labelHe: 'קל',
    cols: 4,
    pairs: 8,
    previewMs: 1400,
  },
  {
    id: 'medium',
    labelHe: 'בינוני',
    cols: 5,
    pairs: 10,
    previewMs: 1100,
  },
  {
    id: 'hard',
    labelHe: 'מאתגר',
    cols: 6,
    pairs: 12,
    previewMs: 900,
  },
] as const

export function getDifficulty(id: DifficultyId): Difficulty {
  const found = DIFFICULTIES.find((d) => d.id === id)
  return found ?? DIFFICULTIES[0]
}
