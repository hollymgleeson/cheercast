import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getEvalSessions, createEvalSession } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Modal from '../components/Modal'

const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  scoring: 'bg-amber-100 text-amber-700',
  complete: 'bg-gray-100 text-gray-600',
}

export default function EvaluationsPage() {
  const { gymId } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    round: '1',
    eval_date: new Date().toISOString().split('T')[0],
    season_year: new Date().getFullYear(),
    notes: '',
  })
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

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.eval_date) { setCreateError('Please set an eval date.'); return }
    setCreating(true)
    setCreateError('')
    try {
      const session = await createEvalSession({
        gym_id: gymId,
        season_year: parseInt(form.season_year),
        round: parseInt(form.round),
        status: 'scheduled',
        eval_date: form.eval_date,
        notes: form.notes || null,
        ai_report_generated: false,
      })
      setSessions(prev => [session, ...prev])
      setShowCreate(false)
      setForm({ round: '1', eval_date: new Date().toISOString().split('T')[0], season_year: new Date().getFullYear(), notes: '' })
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
            <Button variant="gold" className="mt-4" onClick={() => setShowCreate(true)}>
              Create Eval Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-[#1B2E4B]">
                      Round {session.round} Evaluations — {session.season_year}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[session.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {session.status}
                    </span>
                    {session.ai_report_generated && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        AI Report Ready
                      </span>
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
                  <Button variant="gold" size="sm" onClick={() => navigate(`/evaluations/${session.id}`)}>
                    Open Session
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create session modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Eval Session" size="sm">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{createError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
            <div className="grid grid-cols-2 gap-3">
              {['1', '2'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, round: r }))}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.round === r
                      ? 'border-[#8b002e] bg-[#8b002e]/5 text-[#8b002e]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-0.5">{r === '1' ? '✦' : '◎'}</div>
                  Round {r}
                  <div className="text-xs font-normal opacity-70 mt-0.5">
                    {r === '1' ? 'Skills' : 'Stunting Groups'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eval Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={form.eval_date}
              onChange={e => setForm(f => ({ ...f, eval_date: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Season Year</label>
            <input
              type="number"
              value={form.season_year}
              onChange={e => setForm(f => ({ ...f, season_year: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="e.g. Gym A, 5-7pm, bring iPads"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Session</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
