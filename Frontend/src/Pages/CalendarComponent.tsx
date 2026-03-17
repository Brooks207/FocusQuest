import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-theme.css';
import { supabase } from '../lib/supabaseClient';

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

  // Demo fallback event (all-day)
  const demoStart = new Date()
  const demoEvent: MyEvent = {
    title: 'Demo task',
    start: new Date(demoStart.getFullYear(), demoStart.getMonth(), demoStart.getDate()),
    end: new Date(demoStart.getFullYear(), demoStart.getMonth(), demoStart.getDate() + 1),
    allDay: true,
  }

  const fetchEvents = async () => {
    try {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) { setEvents([demoEvent]); return }
      setUserId(user.id)

      const { data: rows, error } = await supabase
        .from('taskitem')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('next_due', { ascending: true })

      if (error) throw error

      const dueRows = (rows || []).filter((r: any) => !!r.next_due)
      if (!dueRows.length) { setEvents([demoEvent]); return }

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
      setEvents([demoEvent])
    }
  }

  const deleteAllTasks = async () => {
    if (!userId) return
    if (!window.confirm('Delete ALL tasks? This cannot be undone.')) return
    await supabase.from('task_completions').delete().eq('user_id', userId)
    await supabase.from('taskitem').delete().eq('user_id', userId)
    setEvents([demoEvent])
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
    <section className="min-h-screen w-full bg-gradient-to-br from-green-200 to-amber-400 py-16 px-4">
      <div className="container mx-auto max-w-5xl bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <div className="flex gap-2">
            <button onClick={fetchEvents} className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 text-sm font-medium">↺ Refresh</button>
            <button onClick={deleteAllTasks} className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium">🗑 Delete All</button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm mb-4">
          <span className="text-sm text-gray-600">Legend:</span>
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
