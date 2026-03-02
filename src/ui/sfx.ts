export type SfxKind = 'flip' | 'match' | 'win' | 'miss'

function beep(frequency: number, durationMs: number, type: OscillatorType) {
  const ctx = new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  )()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = frequency
  g.gain.value = 0.06
  o.connect(g)
  g.connect(ctx.destination)
  o.start()
  setTimeout(() => {
    o.stop()
    ctx.close().catch(() => {})
  }, durationMs)
}

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled) return
  try {
    if (kind === 'flip') beep(420, 60, 'triangle')
    if (kind === 'match') beep(740, 90, 'sine')
    if (kind === 'miss') beep(220, 90, 'square')
    if (kind === 'win') {
      beep(660, 110, 'sine')
      setTimeout(() => beep(880, 140, 'sine'), 120)
    }
  } catch {
    // Ignore audio errors (autoplay policies, etc.)
  }
}
