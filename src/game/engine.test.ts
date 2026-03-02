import { describe, expect, it } from 'vitest'
import { getDifficulty } from './difficulty'
import { newGameState, reduce, settleMismatch } from './engine'

describe('engine', () => {
  it('creates the right number of tiles for difficulty', () => {
    const d = getDifficulty('easy')
    const s = newGameState(d, 123)
    expect(s.tiles).toHaveLength(d.pairs * 2)
  })

  it('match increases matches and marks tiles as matched', () => {
    const d = getDifficulty('easy')
    let s = newGameState(d, 1)
    s = reduce(s, { type: 'START' })
    // skip preview
    s = reduce(s, { type: 'TICK', now: (s.startedAt ?? 0) + d.previewMs + 5 })

    const first = s.tiles[0]
    const mate = s.tiles.find(
      (t) => t.animalId === first.animalId && t.key !== first.key,
    )!

    s = reduce(s, { type: 'FLIP', key: first.key })
    s = reduce(s, { type: 'FLIP', key: mate.key })

    expect(s.matches).toBe(1)
    const matched = s.tiles.filter((t) => t.matched)
    expect(matched).toHaveLength(2)
  })

  it('mismatch locks then settleMismatch flips back', () => {
    const d = getDifficulty('easy')
    let s = newGameState(d, 2)
    s = reduce(s, { type: 'START' })
    s = reduce(s, { type: 'TICK', now: (s.startedAt ?? 0) + d.previewMs + 5 })

    const a = s.tiles[0]
    const b = s.tiles.find((t) => t.animalId !== a.animalId)!

    s = reduce(s, { type: 'FLIP', key: a.key })
    s = reduce(s, { type: 'FLIP', key: b.key })

    expect(s.lock).toBe(true)
    expect(s.tiles.filter((t) => t.faceUp && !t.matched)).toHaveLength(2)

    s = settleMismatch(s)
    expect(s.lock).toBe(false)
    expect(s.tiles.filter((t) => t.faceUp && !t.matched)).toHaveLength(0)
  })
})
