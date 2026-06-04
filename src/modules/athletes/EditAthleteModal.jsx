import { useState, useEffect } from 'react'
import { updateAthlete } from '../../lib/supabase'
import { getAgeDivision } from '../../utils/usasf-rules'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { formatPhoneInput } from '../../utils/formatters'

const CURRENT_YEAR = new Date().getFullYear()

export default function EditAthleteModal({ open, onClose, athlete, onUpdated }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('basic')

  useEffect(() => {
    if (athlete) {
      setForm({
        first_name: athlete.first_name ?? '',
        last_name: athlete.last_name ?? '',
        date_of_birth: athlete.date_of_birth ?? '',
        email: athlete.email ?? '',
        parent_name: athlete.parent_name ?? '',
        parent_email: athlete.parent_email ?? '',
        parent_phone: athlete.parent_phone ?? '',
        phone: athlete.phone ?? '',
        height_inches: athlete.height_inches ?? '',
        still_growing: athlete.still_growing ?? false,
        join_date: athlete.join_date ?? '',
        status: athlete.status ?? 'active',
        current_level: athlete.current_level ?? '',
        current_tier: athlete.current_tier ?? '',
      })
    }
  }, [athlete])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const ageDivision = form.date_of_birth
    ? getAgeDivision(form.date_of_birth, CURRENT_YEAR)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      setError('First and last name are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updates = {
        ...form,
        height_inches: form.height_inches ? parseInt(form.height_inches) : null,
        age_division: ageDivision || athlete.age_division || null,
      }
      Object.keys(updates).forEach(k => {
        if (updates[k] === '') updates[k] = null
      })
      const updated = await updateAthlete(athlete.id, updates)
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contact', label: 'Contact' },
    { id: 'placement', label: 'Level & Placement' },
  ]

  if (!athlete) return null

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${athlete.first_name} ${athlete.last_name}`} size="md">
      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#8b002e] text-[#1B2E4B]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]" />
                {ageDivision && (
                  <p className="text-xs text-[#8b002e] font-medium mt-1 capitalize">Age division: {ageDivision}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (inches)</label>
                  <input type="number" value={form.height_inches} onChange={e => set('height_inches', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                    placeholder="e.g. 58" min="36" max="84" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                  <input type="date" value={form.join_date} onChange={e => set('join_date', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="edit_still_growing" checked={form.still_growing}
                  onChange={e => set('still_growing', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1B2E4B] focus:ring-[#1B2E4B]" />
                <label htmlFor="edit_still_growing" className="text-sm text-gray-700">Still growing</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="injured">Injured</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>
          )}

          {/* Contact */}
          {tab === 'contact' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parent / Guardian</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                  <input type="text" value={form.parent_name} onChange={e => set('parent_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                  <input type="email" value={form.parent_email} onChange={e => set('parent_email', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                  <input type="tel" value={form.parent_phone} onChange={e => set('parent_phone', formatPhoneInput(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                    placeholder="(555) 000-0000" />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Athlete</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Athlete Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Athlete Phone <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', formatPhoneInput(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                    placeholder="Leave blank if athlete does not have a phone" />
                </div>
              </div>
            </div>
          )}

          {/* Placement */}
          {tab === 'placement' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Level</label>
                  <select value={form.current_level} onChange={e => set('current_level', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]">
                    <option value="">Unknown / New</option>
                    <option value="1">Level 1</option>
                    <option value="1.2">Level 1.2</option>
                    <option value="2">Level 2</option>
                    <option value="2.1">Level 2.1</option>
                    <option value="3">Level 3</option>
                    <option value="3.1">Level 3.1</option>
                    <option value="4">Level 4</option>
                    <option value="4.2">Level 4.2</option>
                    <option value="5">Level 5</option>
                    <option value="6">Level 6</option>
                    <option value="7">Level 7</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Tier</label>
                  <select value={form.current_tier} onChange={e => set('current_tier', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]">
                    <option value="">Unknown</option>
                    <option value="elite">Elite</option>
                    <option value="prep">Prep</option>
                    <option value="novice">Novice</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}
