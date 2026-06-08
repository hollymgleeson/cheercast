import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getEvalSessions, createEvalSession, getAthletes } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Modal from '../components/Modal'

const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  scoring: 'bg-amber-100 text-amber-700',
  complete: 'bg-gray-100 text-gray-600',
}

const ATTENDANCE_STYLES = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  excused: 'bg-amber-100 text-amber-700',
  late: 'bg-blue-100 text-blue-700',
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────

function AttendanceModal({ open, onClose, session, gymId }) {
  const [athletes, setAthletes] = useState([])
  const [attendance, setAttendance] = useState({}) // athleteId -> status
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open || !session) return
    loadData()
  }, [open, session])

  async function loadData() {
    setLoading(true)
    try {
      const [athleteData, { data: existingAttendance }] = await Promise.all([
        getAthletes(gymId, { status: 'active' }),
        supabase.from('attendance')
          .select('*')
          .eq('gym_id', gymId)
          .eq('session_date', session.eval_date)
          .eq('session_type', 'practice'),
      ])
      setAthletes(athleteData)
      const map = {}
      existingAttendance?.forEach(a => { map[a.athlete_id] = a.status })
      setAttendance(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function setStatus(athleteId, status) {
    setAttendance(prev => {
      const next = { ...prev }
      if (next[athleteId] === status) delete next[athleteId]
      else next[athleteId] = status
      return next
    })
  }

  async function saveAttendance() {
    setSaving(true)
    try {
      // Delete existing for this session date
      await supabase.from('attendance')
        .delete()
        .eq('gym_id', gymId)
        .eq('session_date', session.eval_date)
        .eq('session_type', 'practice')

      // Insert new
      const rows = Object.entries(attendance).map(([athlete_id, status]) => ({
        gym_id: gymId,
        athlete_id,
        session_date: session.eval_date,
        session_type: 'practice',
        status,
        notes: `Eval session: ${session.id}`,
      }))

      if (rows.length > 0) {
        await supabase.from('attendance').insert(rows)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      alert('Could not save attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = athletes.filter(a =>
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length
  const excusedCount = Object.values(attendance).filter(s => s === 'excused').length
  const unmarkedCount = athletes.length - Object.keys(attendance).length

  return (
    <Modal open={open} onClose={onClose} title={`Attendance — ${session?.eval_date ? new Date(session.eval_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`} size="lg">
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Present', count: presentCount, color: 'bg-green-100 text-green-700' },
            { label: 'Absent', count: absentCount, color: 'bg-red-100 text-red-700' },
            { label: 'Excused', count: excusedCount, color: 'bg-amber-100 text-amber-700' },
            { label: 'Not marked', count: unmarkedCount, color: 'bg-gray-100 text-gray-500' },
          ].map(s => (
            <div key={s.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${s.color}`}>
              {s.count} {s.label}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const all = {}
              athletes.forEach(a => { all[a.id] = 'present' })
              setAttendance(all)
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-medium hover:bg-green-100"
          >
            Mark all present
          </button>
          <button
            onClick={() => setAttendance({})}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200"
          >
            Clear all
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search athletes..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
        />

        {/* Athlete list */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading athletes...</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto border border-gray-100 rounded-xl">
            {filtered.map(athlete => {
              const status = attendance[athlete.id] || null
              return (
                <div key={athlete.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1B2E4B]/10 flex items-center justify-center text-[#1B2E4B] font-bold text-xs flex-shrink-0">
                      {athlete.first_name[0]}{athlete.last_name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1B2E4B]">{athlete.first_name} {athlete.last_name}</div>
                      <div className="text-xs text-gray-400 capitalize">{athlete.age_division} · L{athlete.current_level || '?'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {['present', 'absent', 'excused', 'late'].map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(athlete.id, s)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                          status === s
                            ? ATTENDANCE_STYLES[s] + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {s === 'present' ? '✓' : s === 'absent' ? '✗' : s === 'excused' ? 'E' : 'L'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="font-bold text-gray-600">✓</span> Present</span>
            <span className="flex items-center gap-1"><span className="font-bold text-gray-600">✗</span> Absent</span>
            <span className="flex items-center gap-1"><span className="font-bold text-gray-600">E</span> Excused</span>
            <span className="flex items-center gap-1"><span className="font-bold text-gray-600">L</span> Late</span>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}
            <Button onClick={saveAttendance} loading={saving} size="sm">Save Attendance</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EvaluationsPage() {
  const { gymId } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState(null)

  // Multi-session setup
  const [sessionCount, setSessionCount] = useState(1)
  const [sessionDates, setSessionDates] = useState([''])
  const [sessionNames, setSessionNames] = useState([''])
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (!gymId) return
    load()
  }, [gymId])

  async function load() {
    try {
      const data = await getEvalSessions(gymId)
      setSessions(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function updateSessionCount(n) {
    const count = Math.max(1, Math.min(10, parseInt(n) || 1))
    setSessionCount(count)
    setSessionDates(prev => {
      const next = [...prev]
      while (next.length < count) next.push('')
      return next.slice(0, count)
    })
    setSessionNames(prev => {
      const next = [...prev]
      while (next.length < count) next.push('')
      return next.slice(0, count)
    })
  }

  async function handleCreate(e) {
    e.preventDefault()
    const filledDates = sessionDates.filter(Boolean)
    if (filledDates.length === 0) { setCreateError('Please set at least one eval date.'); return }

    setCreating(true)
    setCreateError('')
    try {
      const created = []
      for (let i = 0; i < sessionDates.length; i++) {
        const date = sessionDates[i]
        if (!date) continue
        const name = sessionNames[i] || (sessionCount > 1 ? `Session ${i + 1}` : null)
        const session = await createEvalSession({
          gym_id: gymId,
          season_year: parseInt(seasonYear),
          round: 1,
          status: 'scheduled',
          eval_date: date,
          notes: [name, notes].filter(Boolean).join(' — ') || null,
          ai_report_generated: false,
        })
        created.push(session)
      }
      setSessions(prev => [...created.reverse(), ...prev])
      setShowCreate(false)
      setSessionDates([''])
      setSessionNames([''])
      setSessionCount(1)
      setNotes('')
    } catch (err) {
      setCreateError(err.message || 'Something went wrong.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Evaluations"
        subtitle="Manage eval sessions for Round 1 (skills) and Round 2 (stunting)"
        actions={<Button variant="gold" onClick={() => setShowCreate(true)}>+ New Eval Session</Button>}
      />

      <div className="p-8">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">✦</div>
            <div className="font-medium">No eval sessions yet</div>
            <div className="text-sm mt-1">Create your first session to begin evaluating athletes.</div>
            <Button variant="gold" className="mt-4" onClick={() => setShowCreate(true)}>Create Eval Session</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="font-bold text-[#1B2E4B]">
                      {session.notes?.split(' — ')[0] && session.notes.split(' — ')[0] !== session.notes
                        ? session.notes.split(' — ')[0]
                        : `Eval Session — ${session.season_year}`}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[session.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {session.status}
                    </span>
                    {session.ai_report_generated && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">AI Report Ready</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {session.eval_date
                      ? new Date(session.eval_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Date not set'}
                  </div>
                  {session.notes && <div className="text-xs text-gray-400 mt-1">{session.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAttendanceSession(session)}>
                    Attendance
                  </Button>
                  <Button variant="gold" size="sm" onClick={() => navigate(`/evaluations/${session.id}`)}>
                    Open Session
                  </Button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this eval session? This will also delete all scores recorded in it.')) return
                      await supabase.from('eval_scores').delete().eq('eval_session_id', session.id)
                      await supabase.from('eval_sessions').delete().eq('id', session.id)
                      setSessions(prev => prev.filter(s => s.id !== session.id))
                    }}
                    className="text-gray-300 hover:text-red-400 transition-colors text-sm px-2"
                    title="Delete session"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create session modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Eval Session(s)" size="sm">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{createError}</div>
          )}

          {/* Number of sessions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many eval sessions?
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateSessionCount(sessionCount - 1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold">−</button>
              <span className="text-lg font-bold text-[#1B2E4B] w-8 text-center">{sessionCount}</span>
              <button type="button" onClick={() => updateSessionCount(sessionCount + 1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold">+</button>
              <span className="text-xs text-gray-400">session{sessionCount > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Dates and names for each session */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Eval Date{sessionCount > 1 ? 's' : ''} <span className="text-red-500">*</span>
            </label>
            {Array.from({ length: sessionCount }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                {sessionCount > 1 && (
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Session {i + 1}</div>
                )}
                <input
                  type="date"
                  value={sessionDates[i] || ''}
                  onChange={e => {
                    const next = [...sessionDates]
                    next[i] = e.target.value
                    setSessionDates(next)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                />
                <input
                  type="text"
                  value={sessionNames[i] || ''}
                  onChange={e => {
                    const next = [...sessionNames]
                    next[i] = e.target.value
                    setSessionNames(next)
                  }}
                  placeholder={`Name (optional) — e.g. Tumbling Day, Skills`}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e] text-gray-600"
                />
              </div>
            ))}
          </div>

          {/* Season year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Season Year</label>
            <input type="number" value={seasonYear} onChange={e => setSeasonYear(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="e.g. Gym A, 5-7pm, bring iPads"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e] resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>
              Create {sessionCount > 1 ? `${sessionCount} Sessions` : 'Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attendance modal */}
      {attendanceSession && (
        <AttendanceModal
          open={!!attendanceSession}
          onClose={() => setAttendanceSession(null)}
          session={attendanceSession}
          gymId={gymId}
        />
      )}
    </div>
  )
}
