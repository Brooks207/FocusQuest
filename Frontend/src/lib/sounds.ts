let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  // resume if suspended (browsers require a user gesture first)
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Whoosh wind — used for single task delete
export function playDelete() {
  const c = getCtx()
  const bufferSize = Math.floor(c.sampleRate * 0.45)
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const source = c.createBufferSource()
  source.buffer = buffer

  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1200, c.currentTime)
  filter.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.45)
  filter.Q.value = 1.2

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.25, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)
  source.start()
  source.stop(c.currentTime + 0.45)
}

// Big swooping wind — used for delete all
export function playDeleteAll() {
  const c = getCtx()
  const duration = 0.9
  const bufferSize = Math.floor(c.sampleRate * duration)
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const source = c.createBufferSource()
  source.buffer = buffer

  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(2000, c.currentTime)
  filter.frequency.exponentialRampToValueAtTime(80, c.currentTime + duration)
  filter.Q.value = 0.8

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.4, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)
  source.start()
  source.stop(c.currentTime + duration)
}

// Soft chime — used when completing a task
export function playComplete() {
  const c = getCtx()
  const notes = [523.25, 659.25, 783.99] // C5 E5 G5
  notes.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = c.currentTime + i * 0.12
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.22, start + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.45)
  })
}

// Soft pop — used when adding a task
export function playAdd() {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(520, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(820, c.currentTime + 0.08)
  gain.gain.setValueAtTime(0.2, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + 0.18)
}
