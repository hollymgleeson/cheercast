import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSkills, getGym, updateGym } from '../../lib/supabase'
import Button from '../../components/Button'

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

export default function SkillsConfigTab() {
  const { gymId } = useAuth()
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [filterLevel, setFilterLevel] = useState('')
  const [searchText, setSearchText] = useState('')

  // Config state
  const [disabledSkillIds, setDisabledSkillIds] = useState(new Set())
  const [customNotes, setCustomNotes] = useState({}) // skill_id -> note string
  const [editingNote, setEditingNote] = useState(null)
  const [noteInputValue, setNoteInputValue] = useState('')

  useEffect(() => {
    load()
  }, [gymId])

  async function load() {
    try {
      const [allSkills, gym] = await Promise.all([
        getSkills(),
        getGym(gymId),
      ])
      setSkills(allSkills)

      // Load existing config from gym settings
      const config = gym.settings?.skill_config || {}
      setDisabledSkillIds(new Set(config.disabled_skill_ids || []))
      setCustomNotes(config.skill_notes || {})

      // Expand all categories by default
      const expanded = {}
      CATEGORY_ORDER.forEach(cat => { expanded[cat] = true })
      setExpandedCategories(expanded)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig(newDisabled, newNotes) {
    setSaving(true)
    try {
      const gym = await getGym(gymId)
      const updatedSettings = {
        ...(gym.settings || {}),
        skill_config: {
          disabled_skill_ids: Array.from(newDisabled),
          skill_notes: newNotes,
        },
      }
      await updateGym(gymId, { settings: updatedSettings })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function toggleSkill(skillId) {
    const newDisabled = new Set(disabledSkillIds)
    if (newDisabled.has(skillId)) {
      newDisabled.delete(skillId)
    } else {
      newDisabled.add(skillId)
    }
    setDisabledSkillIds(newDisabled)
    saveConfig(newDisabled, customNotes)
  }

  function toggleCategory(category, allSkillsInCat) {
    const allDisabled = allSkillsInCat.every(s => disabledSkillIds.has(s.id))
    const newDisabled = new Set(disabledSkillIds)
    allSkillsInCat.forEach(s => {
      if (allDisabled) newDisabled.delete(s.id)
      else newDisabled.add(s.id)
    })
    setDisabledSkillIds(newDisabled)
    saveConfig(newDisabled, customNotes)
  }

  function startEditNote(skillId, currentNote) {
    setEditingNote(skillId)
    setNoteInputValue(currentNote || '')
  }

  function saveNote(skillId) {
    const newNotes = { ...customNotes }
    if (noteInputValue.trim()) {
      newNotes[skillId] = noteInputValue.trim()
    } else {
      delete newNotes[skillId]
    }
    setCustomNotes(newNotes)
    setEditingNote(null)
    saveConfig(disabledSkillIds, newNotes)
  }

  async function resetToDefaults() {
    if (!confirm('Reset all skill settings to USASF defaults? This will re-enable all hidden skills and remove all custom notes. This cannot be undone.')) return
    const newDisabled = new Set()
    const newNotes = {}
    setDisabledSkillIds(newDisabled)
    setCustomNotes(newNotes)
    await saveConfig(newDisabled, newNotes)
  }

  // Filter skills
  const filteredSkills = skills.filter(s => {
    const levelMatch = !filterLevel || (s.level_min <= parseInt(filterLevel) && s.level_max >= parseInt(filterLevel))
    const searchMatch = !searchText || s.name.toLowerCase().includes(searchText.toLowerCase())
    return levelMatch && searchMatch
  })

  // Group by category
  const grouped = {}
  CATEGORY_ORDER.forEach(cat => {
    const catSkills = filteredSkills.filter(s => s.category === cat)
    if (catSkills.length > 0) grouped[cat] = catSkills
  })

  const totalSkills = skills.length
  const enabledCount = skills.filter(s => !disabledSkillIds.has(s.id)).length
  const customNoteCount = Object.keys(customNotes).length

  if (loading) return <div className="text-center py-12 text-gray-400">Loading skills...</div>

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="font-bold text-[#1B2E4B]">{enabledCount}</span>
            <span className="text-gray-500"> of {totalSkills} skills enabled</span>
          </div>
          <div>
            <span className="font-bold text-[#1B2E4B]">{customNoteCount}</span>
            <span className="text-gray-500"> custom notes</span>
          </div>
          {saved && <span className="text-green-600 font-medium text-xs">Saved!</span>}
          {saving && <span className="text-gray-400 text-xs">Saving...</span>}
        </div>
        <Button variant="danger" size="sm" onClick={resetToDefaults}>
          Reset to USASF Defaults
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search skills..."
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] w-56"
        />
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

      {/* Skill categories */}
      {Object.entries(grouped).map(([category, catSkills]) => {
        const isExpanded = expandedCategories[category]
        const allDisabled = catSkills.every(s => disabledSkillIds.has(s.id))
        const someDisabled = catSkills.some(s => disabledSkillIds.has(s.id))
        const enabledInCat = catSkills.filter(s => !disabledSkillIds.has(s.id)).length

        return (
          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <span className="font-bold text-[#1B2E4B]">{CATEGORY_LABELS[category]}</span>
                <span className="text-xs text-gray-400">{enabledInCat}/{catSkills.length} enabled</span>
                <span className="text-gray-400 text-sm ml-auto mr-4">{isExpanded ? '▲' : '▼'}</span>
              </button>
              <button
                onClick={() => toggleCategory(category, catSkills)}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                  allDisabled
                    ? 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                    : 'bg-[#1B2E4B]/10 text-[#1B2E4B] hover:bg-red-100 hover:text-red-700'
                }`}
              >
                {allDisabled ? 'Enable all' : 'Disable all'}
              </button>
            </div>

            {/* Skills */}
            {isExpanded && (
              <div className="divide-y divide-gray-50">
                {catSkills.map(skill => {
                  const isDisabled = disabledSkillIds.has(skill.id)
                  const customNote = customNotes[skill.id]
                  const displayNote = customNote || skill.description
                  const isEditing = editingNote === skill.id

                  return (
                    <div
                      key={skill.id}
                      className={`px-6 py-3 transition-colors ${isDisabled ? 'opacity-40 bg-gray-50' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Toggle */}
                        <button
                          onClick={() => toggleSkill(skill.id)}
                          className={`flex-shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors relative ${
                            isDisabled ? 'bg-gray-200' : 'bg-[#1B2E4B]'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                            isDisabled ? 'left-1' : 'left-5'
                          }`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#1B2E4B]">{skill.name}</span>
                            <span className="text-xs text-gray-400">L{skill.level_min}{skill.level_max > skill.level_min ? `–${skill.level_max}` : ''}</span>
                            {skill.tier === 'advanced' && !customNote && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Advanced</span>
                            )}
                            {skill.tier === 'elite' && !customNote && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-[#1B2E4B]/10 text-[#1B2E4B]">Elite</span>
                            )}
                            {customNote && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-[#8b002e]/20 text-[#8b002e] font-medium">Custom note</span>
                            )}
                          </div>

                          {/* Note display / edit */}
                          {isEditing ? (
                            <div className="mt-2 flex gap-2 items-center">
                              <input
                                type="text"
                                value={noteInputValue}
                                onChange={e => setNoteInputValue(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveNote(skill.id)
                                  if (e.key === 'Escape') setEditingNote(null)
                                }}
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                                placeholder="Add a custom note for this skill (leave blank to use default)..."
                              />
                              <button onClick={() => saveNote(skill.id)} className="text-xs text-green-600 font-medium hover:underline">Save</button>
                              <button onClick={() => setEditingNote(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                              {displayNote && (
                                <span className="text-xs text-gray-400 italic">{displayNote}</span>
                              )}
                              <button
                                onClick={() => startEditNote(skill.id, customNote)}
                                className="text-xs text-[#1B2E4B] hover:text-[#8b002e] transition-colors flex-shrink-0 font-medium"
                                title="Edit note"
                              >
                                ✎ {!customNote && <span className="text-xs">Add note</span>}
                              </button>
                              {customNote && (
                                <button
                                  onClick={() => {
                                    const newNotes = { ...customNotes }
                                    delete newNotes[skill.id]
                                    setCustomNotes(newNotes)
                                    saveConfig(disabledSkillIds, newNotes)
                                  }}
                                  className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                                  title="Remove custom note"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
