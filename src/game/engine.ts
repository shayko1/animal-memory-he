import { ANIMALS } from './animals'
import type { Difficulty, Tile } from './types'
import { shuffle, mulberry32 } from './shuffle'

export type GameStatus = 'ready' | 'preview' | 'playing' | 'won'

export type GameState = {
  status: GameStatus
  difficulty: Difficulty
  tiles: Tile[]
  moves: number
  matches: number
  startedAt: number | null
  endedAt: number | null
  lock: boolean
  lastActionAt: number
}

export type GameEvent =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty; seed?: number }
  | { type: 'START' }
  | { type: 'FLIP'; key: string }
  | { type: 'TICK'; now: number }

function buildTiles(difficulty: Difficulty, seed?: number): Tile[] {
  const rnd = seed === undefined ? Math.random : mulberry32(seed)
  const chosen = shuffle(ANIMALS, rnd).slice(0, difficulty.pairs)
  const doubled = shuffle(
    chosen.flatMap((a) => [a.id, a.id]),
    rnd,
  )

  return doubled.map((animalId, idx) => ({
    key: `${animalId}-${idx}-${Math.floor(rnd() * 1e9)}`,
    animalId,
    faceUp: false,
    matched: false,
  }))
}

export function newGameState(difficulty: Difficulty, seed?: number): GameState {
  const tiles = buildTiles(difficulty, seed)
  return {
    status: 'ready',
    difficulty,
    tiles,
    moves: 0,
    matches: 0,
    startedAt: null,
    endedAt: null,
    lock: false,
    lastActionAt: Date.now(),
  }
}

function faceUpUnmatchedTiles(state: GameState) {
  return state.tiles.filter((t) => t.faceUp && !t.matched)
}

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'NEW_GAME':
      return newGameState(state.difficulty, event.seed)

    case 'SET_DIFFICULTY':
      return newGameState(event.difficulty, event.seed)

    case 'START': {
      // Preview: briefly show all cards to reduce frustration
      const now = Date.now()
      return {
        ...state,
        status: 'preview',
        tiles: state.tiles.map((t) => ({ ...t, faceUp: true })),
        moves: 0,
        matches: 0,
        startedAt: now,
        endedAt: null,
        lock: true,
        lastActionAt: now,
      }
    }

    case 'TICK': {
      if (state.status !== 'preview') return state
      const elapsed = state.startedAt ? event.now - state.startedAt : 0
      if (elapsed < state.difficulty.previewMs) return state
      return {
        ...state,
        status: 'playing',
        tiles: state.tiles.map((t) => ({ ...t, faceUp: false })),
        lock: false,
        lastActionAt: event.now,
      }
    }

    case 'FLIP': {
      if (state.lock) return state
      if (state.status !== 'playing' && state.status !== 'ready') return state

      const idx = state.tiles.findIndex((t) => t.key === event.key)
      if (idx < 0) return state
      const tile = state.tiles[idx]
      if (tile.matched || tile.faceUp) return state

      const status = state.status === 'ready' ? 'playing' : state.status
      const startedAt = state.startedAt ?? Date.now()

      const nextTiles = state.tiles.map((t) =>
        t.key === event.key ? { ...t, faceUp: true } : t,
      )
      const up = nextTiles.filter((t) => t.faceUp && !t.matched)

      // if this is the second tile flipped in a pair -> count move
      const didCountMove = up.length === 2
      const next: GameState = {
        ...state,
        status,
        startedAt,
        tiles: nextTiles,
        moves: state.moves + (didCountMove ? 1 : 0),
        lastActionAt: Date.now(),
      }

      if (up.length < 2) return next

      const [a, b] = up
      if (a.animalId === b.animalId) {
        const tilesMatched = next.tiles.map((t) =>
          t.faceUp && !t.matched && t.animalId === a.animalId
            ? { ...t, matched: true }
            : t,
        )
        const matches = state.matches + 1
        const won = matches === state.difficulty.pairs
        return {
          ...next,
          tiles: tilesMatched,
          matches,
          status: won ? 'won' : next.status,
          endedAt: won ? Date.now() : null,
        }
      }

      // mismatch -> lock and let UI flip back after delay using TICK-like side effect
      return { ...next, lock: true }
    }

    default:
      return state
  }
}

export function settleMismatch(state: GameState): GameState {
  const up = faceUpUnmatchedTiles(state)
  if (up.length !== 2) return state
  const [a, b] = up
  if (a.animalId === b.animalId) return state
  return {
    ...state,
    tiles: state.tiles.map((t) => (t.matched ? t : { ...t, faceUp: false })),
    lock: false,
    lastActionAt: Date.now(),
  }
}

export function formatTimeMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
