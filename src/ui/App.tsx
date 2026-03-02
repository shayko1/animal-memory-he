import { useEffect, useMemo, useRef, useState } from 'react'
import { DIFFICULTIES, getDifficulty } from '../game/difficulty'
import type { DifficultyId, Tile } from '../game/types'
import { formatTimeMs, newGameState, reduce, settleMismatch } from '../game/engine'
import { ANIMALS } from '../game/animals'
import { useReducedMotion } from './useReducedMotion'
import { playSfx } from './sfx'

type Toast = { tone: 'normal' | 'success'; text: string } | null

type Mode = 'classic' | 'daily'

const STORAGE_KEY = 'animal-memory-he:v1'

function animalMeta(animalId: string) {
  return ANIMALS.find((a) => a.id === animalId)
}

function now() {
  return Date.now()
}

function todayYmdLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dailySeed(ymd: string) {
  // Deterministic seed based on date (local).
  // Example: 2026-03-03 -> 20260303
  return Number(ymd.replaceAll('-', ''))
}

function dailyDifficultyId(ymd: string): DifficultyId {
  // Rotate difficulty: easy -> medium -> hard
  const dayNum = dailySeed(ymd)
  const idx = dayNum % 3
  return idx === 0 ? 'easy' : idx === 1 ? 'medium' : 'hard'
}

export default function App() {
  const reducedMotion = useReducedMotion()
  const [soundOn, setSoundOn] = useState(true)

  const [mode, setMode] = useState<Mode>('classic')
  const [dailyYmd, setDailyYmd] = useState(() => todayYmdLocal())

  const [difficultyId, setDifficultyId] = useState<DifficultyId>('easy')
  const difficulty = useMemo(() => getDifficulty(difficultyId), [difficultyId])

  const [state, setState] = useState(() => newGameState(difficulty))
  const [toast, setToast] = useState<Toast>(null)

  const dailyKey = useMemo(() => `animal-memory-he:daily:${dailyYmd}`, [dailyYmd])
  const dailyStats = useMemo(() => {
    try {
      const raw = localStorage.getItem(dailyKey)
      return raw ? (JSON.parse(raw) as { bestTimeMs?: number; bestMoves?: number } | null) : null
    } catch {
      return null
    }
  }, [dailyKey, state.lastActionAt])

  const mismatchTimer = useRef<number | null>(null)

  // Load persisted preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { difficultyId?: DifficultyId; soundOn?: boolean }
      if (saved.difficultyId) setDifficultyId(saved.difficultyId)
      if (typeof saved.soundOn === 'boolean') setSoundOn(saved.soundOn)

      // start daily challenge automatically if opened with #daily
      if (window.location.hash === '#daily') {
        const ymd = todayYmdLocal()
        setDailyYmd(ymd)
        const did = dailyDifficultyId(ymd)
        setDifficultyId(did)
        setMode('daily')
        setState(() => newGameState(getDifficulty(did), dailySeed(ymd)))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ difficultyId, soundOn }))
    } catch {
      // ignore
    }
  }, [difficultyId, soundOn])

  // keep state difficulty in sync (classic mode only)
  useEffect(() => {
    if (mode !== 'classic') return
    setState((s) => reduce(s, { type: 'SET_DIFFICULTY', difficulty }))
    setToast(null)
  }, [difficulty, mode])

  // preview tick
  useEffect(() => {
    if (state.status !== 'preview') return
    const id = window.setInterval(() => {
      setState((s) => reduce(s, { type: 'TICK', now: now() }))
    }, 60)
    return () => window.clearInterval(id)
  }, [state.status])

  // settle mismatch after a short delay
  useEffect(() => {
    if (!state.lock) return
    const up = state.tiles.filter((t) => t.faceUp && !t.matched)
    if (up.length !== 2) return
    if (up[0].animalId === up[1].animalId) return

    if (mismatchTimer.current) window.clearTimeout(mismatchTimer.current)
    mismatchTimer.current = window.setTimeout(
      () => {
        setState((s) => settleMismatch(s))
        playSfx('miss', soundOn)
      },
      reducedMotion ? 0 : 650,
    )

    return () => {
      if (mismatchTimer.current) window.clearTimeout(mismatchTimer.current)
      mismatchTimer.current = null
    }
  }, [state.lock, state.tiles, reducedMotion, soundOn])

  useEffect(() => {
    if (state.status === 'won') {
      const suffix = mode === 'daily' ? ` (אתגר יומי: ${dailyYmd})` : ''
      setToast({
        tone: 'success',
        text: `כל הכבוד! זיהית את כל הזוגות.${suffix} רוצה עוד סיבוב?`,
      })
      playSfx('win', soundOn)

      if (mode === 'daily') {
        const timeMs = elapsedMs
        const moves = state.moves
        try {
          const prevRaw = localStorage.getItem(dailyKey)
          const prev = prevRaw ? (JSON.parse(prevRaw) as { bestTimeMs?: number; bestMoves?: number }) : {}
          const bestTimeMs = prev.bestTimeMs === undefined ? timeMs : Math.min(prev.bestTimeMs, timeMs)
          const bestMoves = prev.bestMoves === undefined ? moves : Math.min(prev.bestMoves, moves)
          localStorage.setItem(dailyKey, JSON.stringify({ bestTimeMs, bestMoves }))
        } catch {
          // ignore
        }
      }
    }
  }, [state.status, soundOn, mode, dailyYmd, dailyKey, elapsedMs, state.moves])

  const elapsedMs = useMemo(() => {
    if (!state.startedAt) return 0
    if (state.endedAt) return state.endedAt - state.startedAt
    return now() - state.startedAt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.startedAt, state.endedAt, state.lastActionAt])

  useEffect(() => {
    if (!state.startedAt || state.endedAt) return
    const id = window.setInterval(() => {
      setState((s) => ({ ...s, lastActionAt: now() }))
    }, 250)
    return () => window.clearInterval(id)
  }, [state.startedAt, state.endedAt])

  function onNewGame() {
    setMode('classic')
    setToast(null)
    setState((s) => reduce(s, { type: 'NEW_GAME' }))
    window.requestAnimationFrame(() => {
      setState((s) => reduce(s, { type: 'START' }))
    })
  }

  function onDailyChallenge() {
    const ymd = todayYmdLocal()
    setDailyYmd(ymd)
    const did = dailyDifficultyId(ymd)
    setDifficultyId(did)
    setMode('daily')
    setToast(null)

    // new deterministic board for today
    const seed = dailySeed(ymd)
    const diff = getDifficulty(did)
    setState(() => newGameState(diff, seed))

    // Start preview immediately (same UX as classic)
    window.requestAnimationFrame(() => {
      setState((s) => reduce(s, { type: 'START' }))
    })

    // update URL hash for shareability
    try {
      window.location.hash = 'daily'
    } catch {
      // ignore
    }
  }

  function onTileFlip(tile: Tile) {
    if (state.status === 'ready') {
      setState((s) => reduce(s, { type: 'START' }))
      return
    }

    const beforeMatches = state.matches
    setState((s) => reduce(s, { type: 'FLIP', key: tile.key }))

    // heuristic sfx: play flip immediately
    playSfx('flip', soundOn)

    // match sound handled by observing state changes in next microtask
    queueMicrotask(() => {
      setState((s) => {
        if (s.matches > beforeMatches) playSfx('match', soundOn)
        return s
      })
    })
  }

  const helpId = 'help-text'

  const statusText =
    state.status === 'preview'
      ? 'תצוגה מקדימה…'
      : state.status === 'won'
        ? 'ניצחון!'
        : state.status === 'playing'
          ? 'בהצלחה!'
          : 'מוכנים?'

  return (
    <div className="container">
      <header className="appHeader">
        <section>
          <div className="topRow">
            <div className="brand">
              <div className="logo" aria-hidden="true" />
              <div>
                <h1>משחק זיכרון: חיות</h1>
                <p className="subtitle">
                  מהיר, נגיש וממכר. התאימו זוגות של חיות בזמן קצר ובכמה שפחות מהלכים.
                </p>
              </div>
            </div>
          </div>
          <div className="badgeRow" aria-label="מידע משחק">
            <span className="badge">{statusText}</span>
            <span className="badge">{mode === 'daily' ? `אתגר יומי · ${dailyYmd}` : difficulty.labelHe}</span>
            {mode === 'daily' && dailyStats && (
              <span className="badge">
                שיא היום: {dailyStats.bestMoves ?? '—'} מהלכים · {dailyStats.bestTimeMs ? formatTimeMs(dailyStats.bestTimeMs) : '—'}
              </span>
            )}
            <span className="badge">
              טיפים: <kbd>Tab</kbd> ניווט · <kbd>Enter</kbd> הפיכה
            </span>
          </div>
          {toast && (
            <div
              className={`toast ${toast.tone === 'success' ? 'toastStrong' : ''}`}
              role="status"
              aria-live="polite"
            >
              {toast.text}
            </div>
          )}
        </section>

        <aside className="card panel">
          <div className="controls">
            <div className="row">
              <div className="kpis" aria-label="מדדים">
                <div className="kpi">
                  <span className="kpiLabel">מהלכים</span>
                  <span className="kpiValue" aria-label="מהלכים">
                    {state.moves}
                  </span>
                </div>
                <div className="kpi">
                  <span className="kpiLabel">זמן</span>
                  <span className="kpiValue" aria-label="זמן">
                    {formatTimeMs(elapsedMs)}
                  </span>
                </div>
                <div className="kpi">
                  <span className="kpiLabel">זוגות</span>
                  <span className="kpiValue" aria-label="זוגות">
                    {state.matches}/{difficulty.pairs}
                  </span>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="selectWrap">
                <label className="kpiLabel" htmlFor="difficulty">
                  רמת קושי
                </label>
                <select
                  id="difficulty"
                  className="select"
                  value={difficultyId}
                  onChange={(e) => {
                    setMode('classic')
                    setDifficultyId(e.target.value as DifficultyId)
                    try {
                      window.location.hash = ''
                    } catch {
                      // ignore
                    }
                  }}
                  aria-describedby={helpId}
                  disabled={mode === 'daily'}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.labelHe} ({d.pairs} זוגות)
                    </option>
                  ))}
                </select>
              </div>

              <div className="actions">
                <button className="btn btnPrimary" onClick={onNewGame}>
                  משחק חדש
                </button>
                <button className="btn" onClick={onDailyChallenge}>
                  אתגר יומי
                </button>
                <button
                  className={`btn ${soundOn ? '' : 'btnDanger'}`}
                  onClick={() => setSoundOn((v) => !v)}
                  aria-pressed={soundOn}
                >
                  {soundOn ? 'צליל: פעיל' : 'צליל: כבוי'}
                </button>
              </div>
            </div>

            <p id={helpId} className="subtitle" style={{ margin: 0 }}>
              מתחילים עם תצוגה מקדימה קצרה כדי להפוך את המשחק הוגן וכיפי. אפשר לשחק גם עם
              מקלדת.
            </p>
          </div>
        </aside>
      </header>

      <main className="card boardWrap">
        <Board
          cols={difficulty.cols}
          tiles={state.tiles}
          onFlip={onTileFlip}
          previewLocked={state.status === 'preview'}
        />
        <div className="footer">
          <span>
            נגישות: תמיכה ב־RTL, ניווט מקלדת, <kbd>Tab</kbd>/<kbd>Enter</kbd>, מצב "הפחתת
            תנועה".
          </span>
          <span>פיתוח: React + TypeScript · בדיקות: Vitest + Playwright</span>
        </div>
      </main>
    </div>
  )
}

function Board({
  tiles,
  cols,
  onFlip,
  previewLocked,
}: {
  tiles: Tile[]
  cols: 4 | 5 | 6
  onFlip: (tile: Tile) => void
  previewLocked: boolean
}) {
  return (
    <div className="grid" data-cols={String(cols)} role="grid" aria-label="לוח משחק">
      {tiles.map((t) => {
        const meta = animalMeta(t.animalId)
        const label = meta ? `${meta.nameHe}` : 'קלף'
        const faceState = t.faceUp ? 'faceUp' : 'faceDown'
        const disabled = t.matched || (previewLocked && !t.faceUp)

        return (
          <button
            key={t.key}
            className="tile"
            data-state={faceState}
            onClick={() => onFlip(t)}
            disabled={disabled}
            aria-disabled={disabled}
            aria-label={t.faceUp ? `פתוח: ${label}` : 'סגור'}
            role="gridcell"
          >
            <span className="face back" aria-hidden="true" />
            <span className="face front">
              <div style={{ textAlign: 'center' }}>
                <div className="emoji" aria-hidden="true">
                  {meta?.emoji ?? '❓'}
                </div>
                <div className="name">{meta?.nameHe ?? ''}</div>
              </div>
            </span>
          </button>
        )
      })}
    </div>
  )
}
