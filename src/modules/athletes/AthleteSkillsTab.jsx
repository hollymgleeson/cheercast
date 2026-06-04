import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSkills, getGym } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import Button from '../../components/Button'

const SKILL_STATUSES = [
  { value: 'not_attempted', label: 'Not Attempted', color: 'bg-gray-100 text-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'inconsistent', label: 'Inconsistent', color: 'bg-amber-100 text-amber-700' },
  { value: 'mastered', label: 'Mastered', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
]

const PERFORMANCE_FLAGS = [
  { value: null, label: 'None' },
  { value: 'performance_star', label: 'Performance Star', color: 'text-[#8b002e]' },
  { value: 'performance_ready', label: 'Performance Ready', color: 'text-green-600' },
  { value: 'avoid_performance', label: 'Avoid Performance', color: 'text-red-600' },
]

const CATEGORY_LABELS = {
  tumbling_standing: 'Tumbling — Standing',
  tumbling_running: 'Tumbling — Running',
  stunt_two_leg: 'Stunts — Two Leg',
  stunt_one_leg: 'Stunts — One Leg',
  basket_toss: 'Basket Toss',
  jump: 'Jumps',
  flying: 'Flying',
  base: 'Basing',
  back_spot: 'Back Spot',
  front_spot: 'Front Spot',
}

const CATEGORY_ORDER = [
  'tumbling_standing', 'tumbling_running',
  'stunt_two_leg', 'stunt_one_leg', 'basket_toss',
  'jump', 'flying', 'base', 'back_spot', 'front_spot',
]

export default function AthleteSkillsTab({ athleteId, gymId }) {
  const { isOwner, isCoach } = useAuth()
  const canEdit = isOwner || isCoach

  const [allSkills, setAllSkills] = useState([])
  const [gymSkillConfig, setGymSkillConfig] = useState({ disabled: new Set(), notes: {} })
  const [athleteSkills, setAthleteSkills] = useState({}) // keyed by skill_id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({}) // keyed by skill_id
  const [saveError, setSaveError] = useState(null)
  const [filterLevel, setFilterLevel] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})
  const [editingNote, setEditingNote] = useState(null) // skill_id being edited

  useEffect(() => {
    load()
  }, [athleteId])

  async function load() {
    try {
      const [skills, { data: aSkills }, gym] = await Promise.all([
        getSkills(),
        supabase.from('athlete_skills').select('*').eq('athlete_id', athleteId),
        getGym(gymId),
      ])
      setAllSkills(skills)

      // Load gym skill config
      const config = gym?.settings?.skill_config || {}
      setGymSkillConfig({
        disabled: new Set(config.disabled_skill_ids || []),
        notes: config.skill_notes || {},
      })

      // Index athlete skills by skill_id
      const indexed = {}
      aSkills?.forEach(s => { indexed[s.skill_id] = s })
      setAthleteSkills(indexed)

      // Default: expand categories that have any recorded skills
      const expanded = {}
      skills.forEach(skill => {
        if (indexed[skill.id]) {
          expanded[skill.category] = true
        }
      })
      setExpandedCategories(expanded)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function updateSkill(skillId, updates) {
    setSaving(s => ({ ...s, [skillId]: true }))
    setSaveError(null)
    try {
      const existing = athleteSkills[skillId]
      if (existing) {
        const { data, error } = await supabase
          .from('athlete_skills')
          .update({ ...updates, last_updated: new Date().toISOString() })
          .eq('athlete_id', athleteId)
          .eq('skill_id', skillId)
          .select()
          .single()
        if (error) throw error
        if (data) setAthleteSkills(prev => ({ ...prev, [skillId]: data }))
      } else {
        const { data, error } = await supabase
          .from('athlete_skills')
          .insert({ athlete_id: athleteId, skill_id: skillId, gym_id: gymId, ...updates })
          .select()
          .single()
        if (error) throw error
        if (data) setAthleteSkills(prev => ({ ...prev, [skillId]: data }))
      }
    } catch (err) {
      console.error('Skill update error:', err)
      setSaveError(err.message || 'Could not save skill. Please try again.')
    } finally {
      setSaving(s => ({ ...s, [skillId]: false }))
    }
  }

  function toggleCategory(cat) {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  // Filter skills — exclude gym-disabled skills, apply level filter
  const filteredSkills = allSkills.filter(s => {
    if (gymSkillConfig.disabled.has(s.id)) return false
    if (filterLevel && !(s.level_min <= parseInt(filterLevel) && s.level_max >= parseInt(filterLevel))) return false
    return true
  })

  // Group by category
  const grouped = {}
  CATEGORY_ORDER.forEach(cat => {
    const skills = filteredSkills.filter(s => s.category === cat)
    if (skills.length > 0) grouped[cat] = skills
  })

  // Count mastered skills
  const masteredCount = Object.values(athleteSkills).filter(s => s.status === 'mastered').length
  const recordedCount = Object.values(athleteSkills).filter(s => s.status && s.status !== 'not_attempted').length

  if (loading) return <div className="text-center py-12 text-gray-400">Loading skills...</div>

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {/* Skill status key */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Skill Status Key</div>
        <div className="flex flex-wrap gap-2">
          {SKILL_STATUSES.filter(s => s.value !== 'not_attempted').map(s => (
            <span key={s.value} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${s.color}`}>
              {s.value === 'in_progress' ? 'IP' :
               s.value === 'inconsistent' ? '~' :
               s.value === 'mastered' ? '✓' :
               s.value === 'lost' ? '✗' : s.value} — {s.label}
            </span>
          ))}
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-400 border border-gray-200">
            Unselected = Not Attempted
          </span>
        </div>
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-green-600">{masteredCount}</span> mastered ·{' '}
            <span className="font-semibold text-[#1B2E4B]">{recordedCount}</span> recorded
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
          >
            <option value="">All Levels</option>
            {[1,2,3,4,5,6,7].map(l => (
              <option key={l} value={l}>Level {l}</option>
            ))}
          </select>
          <button
            onClick={() => setExpandedCategories(
              Object.keys(grouped).every(c => expandedCategories[c])
                ? {}
                : Object.fromEntries(Object.keys(grouped).map(c => [c, true]))
            )}
            className="text-sm text-[#8b002e] font-medium hover:underline"
          >
            {Object.keys(grouped).every(c => expandedCategories[c]) ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>

      {/* Skill categories */}
      {Object.entries(grouped).map(([category, skills]) => {
        const isExpanded = expandedCategories[category]
        const masteredInCat = skills.filter(s => athleteSkills[s.id]?.status === 'mastered').length
        const recordedInCat = skills.filter(s => athleteSkills[s.id]?.status && athleteSkills[s.id]?.status !== 'not_attempted').length

        return (
          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F5F6F7] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#1B2E4B]">{CATEGORY_LABELS[category]}</span>
                {recordedInCat > 0 && (
                  <span className="text-xs text-gray-400">
                    {masteredInCat}/{skills.length} mastered
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {masteredInCat > 0 && (
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(masteredInCat, 5) }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-green-400" />
                    ))}
                  </div>
                )}
                <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Skills list */}
            {isExpanded && (
              <div className="divide-y divide-gray-50">
                {skills.map(skill => {
                  const athleteSkill = athleteSkills[skill.id]
                  const gymNote = gymSkillConfig.notes[skill.id]
                  const currentStatus = athleteSkill?.status || 'not_attempted'
                  const currentFlag = athleteSkill?.performance_flag || null
                  const isSaving = saving[skill.id]
                  const isEditingThisNote = editingNote === skill.id

                  const statusStyle = SKILL_STATUSES.find(s => s.value === currentStatus)

                  return (
                    <div key={skill.id} className="px-6 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#1B2E4B]">{skill.name}</span>
                            <span className="text-xs text-gray-400">L{skill.level_min}{skill.level_max > skill.level_min ? `–${skill.level_max}` : ''}</span>
                            {gymNote ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-[#8b002e]/20 text-[#8b002e]">{gymNote}</span>
                            ) : (
                              <>
                                {skill.tier === 'advanced' && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Advanced</span>
                                )}
                                {skill.tier === 'elite' && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#1B2E4B]/10 text-[#1B2E4B]">Elite</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Coach note */}
                          {athleteSkill?.coach_notes && !isEditingThisNote && (
                            <div className="text-xs text-gray-400 mt-1 italic">"{athleteSkill.coach_notes}"</div>
                          )}
                          {isEditingThisNote && (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                defaultValue={athleteSkill?.coach_notes || ''}
                                autoFocus
                                onBlur={async e => {
                                  await updateSkill(skill.id, { coach_notes: e.target.value || null })
                                  setEditingNote(null)
                                }}
                                onKeyDown={async e => {
                                  if (e.key === 'Enter') {
                                    await updateSkill(skill.id, { coach_notes: e.target.value || null })
                                    setEditingNote(null)
                                  }
                                  if (e.key === 'Escape') setEditingNote(null)
                                }}
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                                placeholder="Add a note about this skill..."
                              />
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Performance flag */}
                            <select
                              value={currentFlag || ''}
                              onChange={e => updateSkill(skill.id, { performance_flag: e.target.value || null })}
                              disabled={isSaving}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] text-gray-500"
                            >
                              {PERFORMANCE_FLAGS.map(f => (
                                <option key={f.value ?? 'none'} value={f.value ?? ''}>{f.label}</option>
                              ))}
                            </select>

                            {/* Note button */}
                            <button
                              onClick={() => setEditingNote(isEditingThisNote ? null : skill.id)}
                              className="text-gray-300 hover:text-[#8b002e] transition-colors text-sm"
                              title="Add note"
                            >
                              ✎
                            </button>

                            {/* Status buttons */}
                            <div className="flex gap-1">
                              {SKILL_STATUSES.filter(s => s.value !== 'not_attempted').map(s => (
                                <button
                                  key={s.value}
                                  onClick={() => updateSkill(skill.id, {
                                    status: currentStatus === s.value ? 'not_attempted' : s.value
                                  })}
                                  disabled={isSaving}
                                  title={s.label}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                    currentStatus === s.value
                                      ? s.color + ' ring-2 ring-offset-1 ring-current'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {s.label === 'In Progress' ? 'IP' :
                                   s.label === 'Inconsistent' ? '~' :
                                   s.label === 'Mastered' ? '✓' :
                                   s.label === 'Lost' ? '✗' : s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Read-only status for non-editors */}
                        {!canEdit && currentStatus !== 'not_attempted' && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle?.color}`}>
                            {statusStyle?.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No skills found for the selected filter.
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 pb-4">
        <span className="text-xs text-gray-400 font-medium">Key:</span>
        {SKILL_STATUSES.filter(s => s.value !== 'not_attempted').map(s => (
          <span key={s.value} className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
