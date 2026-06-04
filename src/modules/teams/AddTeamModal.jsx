import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createTeam } from '../../lib/supabase'
import Modal from '../../components/Modal'
import Button from '../../components/Button'

const emptyForm = {
  name: '',
  level: '',
  tier: '',
  age_division: '',
  season_year: new Date().getFullYear(),
  max_athletes: 30,
  min_athletes: 5,
  is_anchor_team: false,
  notes: '',
}

export default function AddTeamModal({ open, onClose, onCreated }) {
  const { gymId } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) { setError('Team name is required.'); return }
    if (!form.level) { setError('Level is required.'); return }
    if (!form.tier) { setError('Tier is required.'); return }
    if (!form.age_division) { setError('Age division is required.'); return }

    setSaving(true)
    setError('')
    try {
      const team = await createTeam({
        ...form,
        gym_id: gymId,
        status: 'forming',
        max_athletes: parseInt(form.max_athletes) || 30,
        min_athletes: parseInt(form.min_athletes) || 5,
        season_year: parseInt(form.season_year) || new Date().getFullYear(),
      })
      onCreated(team)
      setForm(emptyForm)
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
      />
    </div>
  )

  const select = (label, key, options, required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Add Team" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {field('Team Name', 'name', 'text', true)}

        <div className="grid grid-cols-2 gap-4">
          {select('Level', 'level', [
            {value:'1',label:'Level 1'},{value:'1.2',label:'Level 1.2'},
            {value:'2',label:'Level 2'},{value:'2.1',label:'Level 2.1'},
            {value:'3',label:'Level 3'},{value:'3.1',label:'Level 3.1'},
            {value:'4',label:'Level 4'},{value:'4.2',label:'Level 4.2'},
            {value:'5',label:'Level 5'},{value:'6',label:'Level 6'},{value:'7',label:'Level 7'},
          ], true)}
          {select('Tier', 'tier', [
            {value:'elite',label:'Elite'},{value:'prep',label:'Prep'},{value:'novice',label:'Novice'},
          ], true)}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {select('Age Division', 'age_division', [
            {value:'tiny',label:'Tiny (6U)'},{value:'mini',label:'Mini (8U)'},
            {value:'pee_wee',label:'Pee Wee (10U)'},{value:'youth',label:'Youth (12U)'},
            {value:'junior',label:'Junior (14U)'},{value:'senior',label:'Senior (18U)'},
            {value:'open',label:'Open'},
          ], true)}
          {field('Season Year', 'season_year', 'number')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('Min Athletes', 'min_athletes', 'number')}
          {field('Max Athletes', 'max_athletes', 'number')}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_anchor"
            checked={form.is_anchor_team}
            onChange={e => set('is_anchor_team', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label htmlFor="is_anchor" className="text-sm text-gray-700">
            Anchor team <span className="text-gray-400">(AI will not modify this team's roster)</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e] resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Create Team</Button>
        </div>
      </form>
    </Modal>
  )
}
