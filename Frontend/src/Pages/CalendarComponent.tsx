import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-theme.css';
import { supabase } from '../lib/supabaseClient'
import { playDeleteAll } from '../lib/sounds';

const localizer = momentLocalizer(moment);

type MyEvent = { title: string; start: Date; end: Date; allDay?: boolean; original?: any };

export default function CalendarComponent() {
  const [events, setEvents] = useState<MyEvent[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const DIFFICULTY_COLORS: Record<number, string> = {
    1: '#10B981', // green
    2: '#F59E0B', // amber
    3: '#F97316', // orange
    4: '#EF4444', // red
  }

  const eventStyleGetter = (event: any/*MyEvent*/, _start: Date, _end: Date, _isSelected: boolean) => {
    const diff = Number(event?.original?.difficulty) || 1
    const bg = DIFFICULTY_COLORS[diff] || '#6B7280'
    return {
      style: {
        backgroundColor: bg,
        borderRadius: '6px',
        color: '#fff',
        border: '0px',
        padding: '2px 6px',
      }
    }
  }

  const fetchEvents = async () => {
    try {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) { setEvents([]); return }
      setUserId(user.id)

      const { data: rows, error } = await supabase
        .from('taskitem')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('next_due', { ascending: true })

      if (error) throw error

      const dueRows = (rows || []).filter((r: any) => !!r.next_due)

      const mapped: MyEvent[] = dueRows.map((r: any) => {
        const raw = new Date(r.next_due)
        const start = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate())
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
        const titleParts = [r.name]
        if (r.xp) titleParts.push(`+${r.xp} XP`)
        if (r.recurrence) titleParts.push('(repeats)')
        return { title: titleParts.join(' '), start, end, allDay: true, original: r }
      })

      setEvents(mapped)
    } catch (e) {
      console.error('Failed to load calendar tasks', e)
      setEvents([])
    }
  }

  const deleteAllTasks = async () => {
    if (!userId) return
    if (!window.confirm('Delete ALL tasks? This cannot be undone.')) return
    await supabase.from('task_completions').delete().eq('user_id', userId)
    await supabase.from('taskitem').delete().eq('user_id', userId)
    playDeleteAll()
    setEvents([])
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const onSelectEvent = (ev: MyEvent) => {
    // simple interaction: log details and show original payload in console
    console.log('Calendar event selected', ev)
    if (ev.original) {
      // eslint-disable-next-line no-alert
      alert(`Task: ${ev.original.name}\nNext due: ${ev.original.next_due || ev.original.created_at}`)
    }
  }

  return (
    <section className="min-h-screen w-full bg-gradient-to-br from-violet-600 via-purple-800 to-indigo-900 py-16 px-4">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="container mx-auto max-w-5xl glass rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-white">Calendar</h1>
          <div className="flex gap-2">
            <button onClick={fetchEvents} className="glass-btn text-white px-3 py-1 rounded-lg text-sm font-medium">↺ Refresh</button>
            <button onClick={deleteAllTasks} className="bg-rose-500/20 border border-rose-400/30 text-rose-200 hover:bg-rose-500/30 transition px-3 py-1 rounded-lg text-sm font-medium">🗑 Delete All</button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm mb-4">
          <span className="text-sm text-white/60">Legend:</span>
          <span className="px-2 py-1 rounded text-white" style={{ backgroundColor: DIFFICULTY_COLORS[1] }}>Easy</span>
          <span className="px-2 py-1 rounded text-white" style={{ backgroundColor: DIFFICULTY_COLORS[2] }}>Medium</span>
          <span className="px-2 py-1 rounded text-white" style={{ backgroundColor: DIFFICULTY_COLORS[3] }}>Hard</span>
          <span className="px-2 py-1 rounded text-white" style={{ backgroundColor: DIFFICULTY_COLORS[4] }}>Very Hard</span>
        </div>

        {/* Calendar wrapper */}
        <div className="h-[70vh] fq-calendar"> 
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={["month","day","week"]}
            onSelectEvent={onSelectEvent}
            eventPropGetter={eventStyleGetter}
            style={{ height: '100%' }}  
          />
        </div>
      </div>
    </section>
  );
}
