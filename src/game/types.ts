import type { AnimalId } from './animals'

export type DifficultyId = 'easy' | 'medium' | 'hard'

export type Difficulty = {
  id: DifficultyId
  labelHe: string
  cols: 4 | 5 | 6
  pairs: number
  previewMs: number
}

export type Tile = {
  key: string
  animalId: AnimalId
  faceUp: boolean
  matched: boolean
}
