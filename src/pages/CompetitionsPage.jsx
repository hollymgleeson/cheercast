import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Modal from '../components/Modal'

const SANCTIONING_BODIES = ['USASF', 'IASF', 'The Open', 'SportCheer UK', 'Independent']

function AddCompetitionModal({ open, onClose, gymId, onCreated }) {
  const [form, setForm] = useState({
    name: '', producer: '', location: '', date_start: '',
    date_end: '', sanctioning_body: 'USASF', is_major: false, notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.date_start) { setError('Name and start date are required.'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('competitions').insert({ ...form, gym_id: gymId }).select().single()
      if (error) throw error
      onCreated(data)
      setForm({ name: '', producer: '', location: '', date_start: '', date_end: '', sanctioning_body: 'USASF', is_major: false, notes: '' })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save competition.')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]'

  return (
    <Modal open={open} onClose={onClose} title="Add Competition" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Competition Name <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="e.g. UCA Mid-Atlantic Regional" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.date_start} onChange={e => set('date_start', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={form.date_end} onChange={e => set('date_end', e.target.value)} className={inp} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input type="text" value={form.location} onChange={e => set('location', e.target.value)} className={inp} placeholder="City, State or Venue" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producer</label>
            <input type="text" value={form.producer} onChange={e => set('producer', e.target.value)} className={inp} placeholder="e.g. Varsity, NCA" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sanctioning Body</label>
            <select value={form.sanctioning_body} onChange={e => set('sanctioning_body', e.target.value)} className={inp}>
              {SANCTIONING_BODIES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_major" checked={form.is_major} onChange={e => set('is_major', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#8b002e] focus:ring-[#8b002e]" />
          <label htmlFor="is_major" className="text-sm text-gray-700">Major competition (Nationals / Summit / Worlds)</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Any notes about this competition..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add Competition</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function CompetitionsPage() {
  const { gymId } = useAuth()
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!gymId) return
    async function load() {
      try {
        const { data } = await supabase.from('competitions').select('*').eq('gym_id', gymId).order('date_start')
        setCompetitions(data || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [gymId])

  const now = new Date()
  const upcoming = competitions.filter(c => new Date(c.date_start) >= now)
  const past = competitions.filter(c => new Date(c.date_start) < now)

  return (
    <div>
      <PageHeader
        title="Competitions"
        subtitle={`${competitions.length} competitions on calendar`}
        actions={<Button variant="gold" onClick={() => setShowAdd(true)}>+ Add Competition</Button>}
      />
      <div className="p-8 space-y-8">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading competitions...</div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">★</div>
            <div className="font-medium">No competitions yet</div>
            <div className="text-sm mt-1">Add your competition schedule to track conflicts and results.</div>
            <Button variant="gold" className="mt-4" onClick={() => setShowAdd(true)}>Add First Competition</Button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h3 className="font-bold text-[#1B2E4B] mb-4">Upcoming ({upcoming.length})</h3>
                <div className="space-y-3">
                  {upcoming.map(comp => <CompCard key={comp.id} comp={comp} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h3 className="font-bold text-[#1B2E4B] mb-4">Past ({past.length})</h3>
                <div className="space-y-3">
                  {past.map(comp => <CompCard key={comp.id} comp={comp} past />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AddCompetitionModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        gymId={gymId}
        onCreated={c => setCompetitions(prev => [...prev, c].sort((a, b) => new Date(a.date_start) - new Date(b.date_start)))}
      />
    </div>
  )
}

function CompCard({ comp, past }) {
  const dateStr = new Date(comp.date_start + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  const endStr = comp.date_end && comp.date_end !== comp.date_start
    ? ` – ${new Date(comp.date_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : ''

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow ${past ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#1B2E4B]">{comp.name}</span>
            {comp.is_major && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#8b002e] text-white">Major</span>
            )}
            {comp.sanctioning_body && comp.sanctioning_body !== 'USASF' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{comp.sanctioning_body}</span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{dateStr}{endStr}</div>
          {comp.location && <div className="text-sm text-gray-400 mt-0.5">📍 {comp.location}</div>}
          {comp.producer && <div className="text-xs text-gray-400 mt-0.5">Produced by {comp.producer}</div>}
          {comp.notes && <div className="text-xs text-gray-400 mt-1 italic">{comp.notes}</div>}
        </div>
        <div className="flex-shrink-0 ml-4 text-right">
          <div className="text-2xl font-bold text-[#1B2E4B]">
            {new Date(comp.date_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div className="text-3xl font-black text-[#8b002e]">
            {new Date(comp.date_start + 'T00:00:00').getDate()}
          </div>
        </div>
      </div>
    </div>
  )
}
