import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeNextDue } from '../lib/recurrence'
import type { RecurrenceJson } from '../lib/recurrence'

type Props = {
  onClose: () => void
  onCreate: (task: any) => void
}

const NewTaskModal: React.FC<Props> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState(1)
  const [recurrenceType, setRecurrenceType] = useState<'one-time'|'daily'|'every_n_days'|'weekly'>('one-time')
  const [interval, setInterval] = useState(1)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [repeats, setRepeats] = useState<number | null>(null)
  const [oneTimeDate, setOneTimeDate] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const toggleWeekday = (d: number) => {
    setWeekdays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) throw new Error('Not logged in')

      let recurrence: RecurrenceJson | null = null
      if (recurrenceType === 'one-time') recurrence = { type: 'one-time' }
      else if (recurrenceType === 'daily') recurrence = { type: 'daily', interval }
      else if (recurrenceType === 'every_n_days') recurrence = { type: 'every_n_days', interval }
      else if (recurrenceType === 'weekly') recurrence = { type: 'weekly', byweekday: weekdays }

      // attach repeats/count into recurrence if provided
      if (recurrence && repeats && repeats > 0) {
        ;(recurrence as any).count = repeats
      }

      // compute initial next_due.
      // For one-time tasks we respect an explicit date the user can pick. Otherwise use computeNextDue.
      let next_due: string | null = null
      if (recurrenceType === 'one-time') {
        if (oneTimeDate) {
          // interpret user-provided date as local midnight and convert to ISO
          const localMidnight = new Date(`${oneTimeDate}T00:00:00`)
          next_due = localMidnight.toISOString()
        } else {
          // no date provided: default to today at local midnight
          const today = new Date()
          const localMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
          next_due = localMidnight.toISOString()
        }
      } else {
        next_due = computeNextDue(recurrence, new Date(Date.now() - 24 * 60 * 60 * 1000), 0)
      }

      const insertObj = {
        user_id: userId,
        name,
        description,
        difficulty,
        recurrence: recurrence ? recurrence : null,
        next_due,
        start_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from('taskitem').insert([insertObj]).select()
      if (error) throw error
      onCreate(data?.[0])
      onClose()
    } catch (err) {
      console.error('Create task failed', err)
      alert('Failed to create task: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-3 py-2 glass rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
  const recurrenceBtnCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-sm font-medium transition-all ${active ? 'bg-white/25 text-white border border-white/40' : 'text-white/60 hover:text-white hover:bg-white/15'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative glass-strong rounded-3xl p-6 w-full max-w-lg shadow-2xl mx-4">
        <h3 className="text-xl font-bold text-white mb-5">New Task</h3>

        <label className="block mb-1 text-sm text-white/60">Title</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Task name" required />

        <label className="block mb-1 text-sm text-white/60">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className={inputCls + " resize-none"} placeholder="Optional description" rows={2} />

        <label className="block mb-1 text-sm text-white/60">Difficulty</label>
        <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} className="w-40 px-2 py-2 glass rounded-xl text-white mb-4 focus:outline-none focus:ring-2 focus:ring-white/30">
          <option value={1} className="bg-purple-900">Easy</option>
          <option value={2} className="bg-purple-900">Medium</option>
          <option value={3} className="bg-purple-900">Hard</option>
          <option value={4} className="bg-purple-900">Very Hard</option>
        </select>

        <div className="mt-1">
          <label className="block mb-2 text-sm text-white/60">Recurrence</label>
          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" onClick={() => setRecurrenceType('one-time')} className={recurrenceBtnCls(recurrenceType==='one-time')}>One-time</button>
            <button type="button" onClick={() => setRecurrenceType('daily')} className={recurrenceBtnCls(recurrenceType==='daily')}>Daily</button>
            <button type="button" onClick={() => setRecurrenceType('every_n_days')} className={recurrenceBtnCls(recurrenceType==='every_n_days')}>Every N days</button>
            <button type="button" onClick={() => setRecurrenceType('weekly')} className={recurrenceBtnCls(recurrenceType==='weekly')}>Weekly</button>
          </div>

          {(recurrenceType === 'daily' || recurrenceType === 'every_n_days') && (
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm text-white/60">Interval</label>
              <input type="number" min={1} value={interval} onChange={e => setInterval(Number(e.target.value))} className="w-20 px-2 py-1 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30" />
            </div>
          )}

          {recurrenceType === 'weekly' && (
            <div className="flex gap-2 mt-2 mb-2">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <button key={i} type="button" onClick={() => toggleWeekday(i)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${weekdays.includes(i) ? 'bg-emerald-400/30 text-emerald-200 border border-emerald-400/50' : 'bg-white/10 text-white/50 border border-white/15 hover:bg-white/20'}`}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {recurrenceType === 'one-time' && (
            <div className="mt-2 mb-2">
              <label className="block mb-1 text-sm text-white/60">When (date)</label>
              <input type="date" value={oneTimeDate} onChange={e => setOneTimeDate(e.target.value)} className="px-2 py-1 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30" />
              <div className="text-xs text-white/40 mt-1">Leave empty to schedule for today.</div>
            </div>
          )}

          <div className="mt-3">
            <label className="block mb-1 text-sm text-white/60">Repeats (optional)</label>
            <input type="number" min={1} placeholder="e.g. 5" value={repeats ?? ''} onChange={e => setRepeats(e.target.value ? Number(e.target.value) : null)} className="w-32 px-2 py-1 glass rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="glass-btn text-white/70 px-4 py-2 rounded-full text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/40 transition px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewTaskModal
