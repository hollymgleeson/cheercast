import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getGym, updateGym } from '../../lib/supabase'
import Button from '../../components/Button'

// USASF standard divisions (age as of Aug 31 cutoff)
const USASF_DIVISIONS = [
  { name: 'tiny', label: 'Tiny', max_age: 5 },
  { name: 'mini', label: 'Mini', max_age: 8 },
  { name: 'youth', label: 'Youth', max_age: 11 },
  { name: 'junior', label: 'Junior', max_age: 14 },
  { name: 'senior', label: 'Senior', max_age: 18 },
  { name: 'open', label: 'Open', max_age: null },
]

// Kedron-style defaults (birth year based)
const BIRTH_YEAR_DEFAULTS = [
  { name: 'tiny', label: 'Tiny (6U)', birth_year_min: null, birth_year_max: null, notes: 'Born 2019 and later' },
  { name: 'mini', label: 'Mini (8U)', birth_year_min: null, birth_year_max: null, notes: 'Born 2017 and later' },
  { name: 'pee_wee', label: 'Pee Wee (10U)', birth_year_min: null, birth_year_max: null, notes: 'Born 2015 and later' },
  { name: 'youth', label: 'Youth (12U)', birth_year_min: null, birth_year_max: null, notes: 'Born 2013 and later' },
  { name: 'junior', label: 'Junior (14U)', birth_year_min: null, birth_year_max: null, notes: 'Born 2011 and later' },
  { name: 'senior', label: 'Senior (18U)', birth_year_min: null, birth_year_max: null, notes: 'Born 2007 and later' },
]

export default function AgeDivisionsTab() {
  const { gymId } = useAuth()
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [useCustom, setUseCustom] = useState(false)
  const [customMode, setCustomMode] = useState('birth_year') // 'birth_year' | 'age_cutoff'
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())
  const [divisions, setDivisions] = useState([
    { name: 'tiny', label: 'Tiny (6U)', cutoff_birth_year: 2019 },
    { name: 'mini', label: 'Mini (8U)', cutoff_birth_year: 2017 },
    { name: 'pee_wee', label: 'Pee Wee (10U)', cutoff_birth_year: 2015 },
    { name: 'youth', label: 'Youth (12U)', cutoff_birth_year: 2013 },
    { name: 'junior', label: 'Junior (14U)', cutoff_birth_year: 2011 },
    { name: 'senior', label: 'Senior (18U)', cutoff_birth_year: 2007 },
  ])

  useEffect(() => {
    if (!gymId) return
    load()
  }, [gymId])

  async function load() {
    try {
      const g = await getGym(gymId)
      setGym(g)
      const config = g.settings?.age_division_config
      if (config) {
        setUseCustom(config.use_custom || false)
        setCustomMode(config.mode || 'birth_year')
        setSeasonYear(config.season_year || new Date().getFullYear())
        if (config.divisions?.length) setDivisions(config.divisions)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const config = {
        use_custom: useCustom,
        mode: customMode,
        season_year: seasonYear,
        divisions,
      }
      await updateGym(gymId, {
        settings: { ...(gym.settings || {}), age_division_config: config }
      })
      setGym(g => ({ ...g, settings: { ...(g.settings || {}), age_division_config: config } }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function updateDivision(i, field, value) {
    setDivisions(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  function addDivision() {
    setDivisions(prev => [...prev, { name: '', label: '', cutoff_birth_year: null }])
  }

  function removeDivision(i) {
    setDivisions(prev => prev.filter((_, idx) => idx !== i))
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-[#1B2E4B] mb-1">Age Division System</h3>
        <p className="text-sm text-gray-400 mb-4">Choose how athlete age divisions are calculated throughout the app.</p>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all" style={{ borderColor: !useCustom ? '#8b002e' : '#e5e7eb', background: !useCustom ? '#fff5f5' : 'white' }}>
            <input type="radio" checked={!useCustom} onChange={() => setUseCustom(false)} className="mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#1B2E4B]">USASF Standard</div>
              <div className="text-xs text-gray-400 mt-0.5">Age divisions based on athlete age as of August 31. Tiny, Mini, Youth, Junior, Senior, Open.</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all" style={{ borderColor: useCustom ? '#8b002e' : '#e5e7eb', background: useCustom ? '#fff5f5' : 'white' }}>
            <input type="radio" checked={useCustom} onChange={() => setUseCustom(true)} className="mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#1B2E4B]">Custom Divisions</div>
              <div className="text-xs text-gray-400 mt-0.5">Define your own division names and birth year cutoffs. Use this for rec programs or gyms with non-standard age groupings.</div>
            </div>
          </label>
        </div>
      </div>

      {/* Custom config */}
      {useCustom && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#1B2E4B]">Custom Division Settings</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Season year:</span>
              <input
                type="number"
                value={seasonYear}
                onChange={e => setSeasonYear(parseInt(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How to determine division</div>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm transition-all ${customMode === 'birth_year' ? 'border-[#8b002e] bg-[#8b002e]/5 text-[#8b002e]' : 'border-gray-200 text-gray-500'}`}>
                <input type="radio" checked={customMode === 'birth_year'} onChange={() => setCustomMode('birth_year')} />
                By birth year
              </label>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm transition-all ${customMode === 'age_cutoff' ? 'border-[#8b002e] bg-[#8b002e]/5 text-[#8b002e]' : 'border-gray-200 text-gray-500'}`}>
                <input type="radio" checked={customMode === 'age_cutoff'} onChange={() => setCustomMode('age_cutoff')} />
                By age (Aug 31 cutoff)
              </label>
            </div>
          </div>

          {/* Reference image */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reference Grid</div>
            <img src="/age-division-grid.jpeg" alt="Age division grid" className="w-full rounded-lg border border-gray-200" />
          </div>

          {/* Divisions table */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Divisions (ordered youngest to oldest)</div>
            <div className="space-y-2">
              {divisions.map((div, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={div.label}
                    onChange={e => updateDivision(i, 'label', e.target.value)}
                    placeholder="Division name (e.g. Tiny (6U))"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    {customMode === 'birth_year' ? 'Born' : 'Max age'}
                  </div>
                  <input
                    type="number"
                    value={customMode === 'birth_year' ? (div.cutoff_birth_year || '') : (div.max_age || '')}
                    onChange={e => updateDivision(i, customMode === 'birth_year' ? 'cutoff_birth_year' : 'max_age', parseInt(e.target.value) || null)}
                    placeholder={customMode === 'birth_year' ? '2007' : '18'}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                  />
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {customMode === 'birth_year' ? '& later' : 'or younger'}
                  </div>
                  <button onClick={() => removeDivision(i)} className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addDivision} className="text-sm text-[#8b002e] hover:underline mt-3">+ Add division</button>
          </div>

          {/* Preview */}
          <div className="bg-[#F5F6F7] rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</div>
            <div className="flex flex-wrap gap-2">
              {divisions.filter(d => d.label).map((div, i) => (
                <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-[#1B2E4B]">
                  {div.label}
                  {customMode === 'birth_year' && div.cutoff_birth_year && (
                    <span className="text-gray-400 ml-1">({div.cutoff_birth_year}+)</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving}>Save Age Division Settings</Button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
      </div>
    </div>
  )
}
