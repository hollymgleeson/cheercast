import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createAthlete } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { getAgeDivision } from '../../utils/usasf-rules'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { formatPhoneInput } from '../../utils/formatters'

const CURRENT_YEAR = new Date().getFullYear()

const emptyForm = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  email: '',
  parent_name: '',
  parent_email: '',
  parent_phone: '',
  phone: '',
  height_inches: '',
  still_growing: false,
  join_date: '',
  status: 'active',
  current_level: '',
  current_tier: '',
  notes_public: '',
}

export default function AddAthleteModal({ open, onClose, onCreated }) {
  const { gymId } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('basic')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Auto-calculate age division from DOB
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
      const athleteData = {
        ...form,
        gym_id: gymId,
        height_inches: form.height_inches ? parseInt(form.height_inches) : null,
        age_division: ageDivision || null,
        join_date: form.join_date || null,
        date_of_birth: form.date_of_birth || null,
      }
      // Remove empty strings
      Object.keys(athleteData).forEach(k => {
        if (athleteData[k] === '') athleteData[k] = null
      })

      const athlete = await createAthlete(athleteData)

      // Create empty preferences row
      await supabase.from('athlete_preferences').insert({
        athlete_id: athlete.id,
        gym_id: gymId,
      })

      onCreated(athlete)
      setForm(emptyForm)
      setTab('basic')
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

  return (
    <Modal open={open} onClose={onClose} title="Add Athlete" size="md">
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

          {/* Basic Info Tab */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => set('first_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => set('last_name', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                />
                {ageDivision && (
                  <p className="text-xs text-[#8b002e] font-medium mt-1 capitalize">
                    Age division: {ageDivision}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (inches)</label>
                  <input
                    type="number"
                    value={form.height_inches}
                    onChange={e => set('height_inches', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                    placeholder="e.g. 58"
                    min="36"
                    max="84"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                  <input
                    type="date"
                    value={form.join_date}
                    onChange={e => set('join_date', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="still_growing"
                  checked={form.still_growing}
                  onChange={e => set('still_growing', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1B2E4B] focus:ring-[#1B2E4B]"
                />
                <label htmlFor="still_growing" className="text-sm text-gray-700">
                  Still growing (may affect flying eligibility)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="injured">Injured</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {tab === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Athlete Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                  placeholder="athlete@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Athlete Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', formatPhoneInput(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                  placeholder="Leave blank if athlete does not have a phone"
                />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Parent / Guardian</div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                    <input
                      type="text"
                      value={form.parent_name}
                      onChange={e => set('parent_name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                      placeholder="Parent full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                    <input
                      type="email"
                      value={form.parent_email}
                      onChange={e => set('parent_email', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                      placeholder="parent@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                    <input
                      type="tel"
                      value={form.parent_phone}
                      onChange={e => set('parent_phone', formatPhoneInput(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placement Tab */}
          {tab === 'placement' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Level</label>
                  <select
                    value={form.current_level}
                    onChange={e => set('current_level', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                  >
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
                  <select
                    value={form.current_tier}
                    onChange={e => set('current_tier', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                  >
                    <option value="">Unknown</option>
                    <option value="elite">Elite</option>
                    <option value="prep">Prep</option>
                    <option value="novice">Novice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Public Notes</label>
                <textarea
                  value={form.notes_public}
                  onChange={e => set('notes_public', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] resize-none"
                  placeholder="Visible to athlete, parents, coaches, and owners..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-2">
            {tabs.map((t, i) => (
              <div
                key={t.id}
                className={`w-2 h-2 rounded-full transition-colors ${tab === t.id ? 'bg-[#8b002e]' : 'bg-gray-300'}`}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            {tab !== 'placement' ? (
              <Button
                type="button"
                variant="gold"
                onClick={() => {
                  const tabOrder = ['basic', 'contact', 'placement']
                  const next = tabOrder[tabOrder.indexOf(tab) + 1]
                  setTab(next)
                }}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" loading={saving}>Add Athlete</Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
