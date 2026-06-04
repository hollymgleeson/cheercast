import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const ROLES = [
  { key: 'flyer', label: 'Flyer', icon: '★' },
  { key: 'base', label: 'Base', icon: '◆' },
  { key: 'back_spot', label: 'Back Spot', icon: '◎' },
  { key: 'front_spot', label: 'Front Spot', icon: '◈' },
  { key: 'tumbler', label: 'Tumbler', icon: '↺' },
]

const RANK_LABELS = ['1st Choice', '2nd Choice', '3rd Choice']
const RANK_COLORS = [
  'bg-[#8b002e] text-white',
  'bg-[#1B2E4B] text-white',
  'bg-gray-400 text-white',
]

export default function AthleteRolesEditor({ athleteId, gymId, preferences, onSaved }) {
  const [ranked, setRanked] = useState([null, null, null]) // up to 3 ranked roles
  const [approved, setApproved] = useState([]) // additional approved roles
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (preferences) {
      const prefs = preferences.preferred_roles || []
      // preferred_roles array is ordered by rank
      const r = [prefs[0] || null, prefs[1] || null, prefs[2] || null]
      setRanked(r)
      setApproved(preferences.open_to_roles || [])
    }
  }, [preferences])

  // All roles currently assigned (to prevent duplicates)
  const assignedRoles = new Set(ranked.filter(Boolean))

  function setRank(index, roleKey) {
    setRanked(prev => {
      const next = [...prev]
      // If this role is already ranked elsewhere, clear it
      const existingIdx = next.findIndex(r => r === roleKey)
      if (existingIdx !== -1 && existingIdx !== index) next[existingIdx] = null
      next[index] = roleKey || null
      // Remove from approved if being ranked
      if (roleKey) setApproved(a => a.filter(r => r !== roleKey))
      return next
    })
  }

  function clearRank(index) {
    setRanked(prev => {
      const next = [...prev]
      next[index] = null
      // Shift remaining ranks up
      const filled = next.filter(Boolean)
      return [filled[0] || null, filled[1] || null, filled[2] || null]
    })
  }

  function toggleApproved(key) {
    if (assignedRoles.has(key)) return // already ranked, can't also be approved
    setApproved(prev =>
      prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const preferred_roles = ranked.filter(Boolean)
      const open_to_roles = approved.filter(r => !preferred_roles.includes(r))

      const { data: existing } = await supabase
        .from('athlete_preferences')
        .select('athlete_id')
        .eq('athlete_id', athleteId)
        .single()

      if (existing) {
        await supabase
          .from('athlete_preferences')
          .update({ preferred_roles, open_to_roles, updated_at: new Date().toISOString() })
          .eq('athlete_id', athleteId)
      } else {
        await supabase
          .from('athlete_preferences')
          .insert({ athlete_id: athleteId, gym_id: gymId, preferred_roles, open_to_roles })
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.({ preferred_roles, open_to_roles })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Ranked roles */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Coach Role Ranking
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map(index => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-20 text-center px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${RANK_COLORS[index]}`}>
                {RANK_LABELS[index]}
              </div>
              <div className="flex gap-1.5 flex-wrap flex-1">
                {ROLES.map(role => {
                  const isSelected = ranked[index] === role.key
                  const isUsedElsewhere = assignedRoles.has(role.key) && !isSelected
                  return (
                    <button
                      key={role.key}
                      onClick={() => isSelected ? clearRank(index) : setRank(index, role.key)}
                      disabled={isUsedElsewhere}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? RANK_COLORS[index]
                          : isUsedElsewhere
                            ? 'bg-gray-50 text-gray-200 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {role.icon} {role.label}
                    </button>
                  )
                })}
                {ranked[index] && (
                  <button
                    onClick={() => clearRank(index)}
                    className="px-2 py-1.5 rounded-lg text-xs text-gray-300 hover:text-red-400 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Also approved */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Also Approved <span className="font-normal text-gray-400">(can fill if needed)</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map(role => {
            const isRanked = assignedRoles.has(role.key)
            const isApproved = approved.includes(role.key)
            return (
              <button
                key={role.key}
                onClick={() => toggleApproved(role.key)}
                disabled={isRanked}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isRanked
                    ? 'bg-gray-50 text-gray-200 cursor-not-allowed'
                    : isApproved
                      ? 'bg-[#1B2E4B]/10 text-[#1B2E4B] ring-1 ring-[#1B2E4B]/30'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {role.icon} {role.label}
                {isRanked && ' (ranked)'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preview */}
      {ranked.some(Boolean) && (
        <div className="bg-[#F5F6F7] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Placement builder will show:</div>
          <div className="flex items-center gap-1 flex-wrap">
            {ranked.filter(Boolean).map((role, i) => (
              <span key={role} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${RANK_COLORS[i]}`}>
                {i + 1}. {ROLES.find(r => r.key === role)?.label}
              </span>
            ))}
            {approved.filter(r => !ranked.includes(r)).map(role => (
              <span key={role} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                {ROLES.find(r => r.key === role)?.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#8b002e] text-white rounded-lg text-sm font-semibold hover:bg-[#a30035] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Roles'}
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}
      </div>
    </div>
  )
}
