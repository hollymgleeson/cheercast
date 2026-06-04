import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/Button'

const ROLES = [
  { key: 'flyer', label: 'Flyers' },
  { key: 'base', label: 'Bases' },
  { key: 'back_spot', label: 'Back Spots' },
  { key: 'front_spot', label: 'Front Spots' },
  { key: 'tumbler', label: 'Tumblers (any role)' },
]

export default function TeamRequirementsEditor({ team, onSaved }) {
  const [mode, setMode] = useState('simple') // 'simple' | 'stunt_groups'
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Simple mode
  const [simpleTotals, setSimpleTotals] = useState({
    flyer: '', base: '', back_spot: '', front_spot: '', tumbler: '',
    min_athletes: '', max_athletes: '',
  })

  // Stunt group mode
  const [groupCount, setGroupCount] = useState('')
  const [groupSize, setGroupSize] = useState('4')
  const [groupRoles, setGroupRoles] = useState({
    flyer: '1', base: '2', back_spot: '1', front_spot: '0',
  })

  useEffect(() => {
    if (!team) return
    const reqs = team.practice_requirements || {}
    if (reqs.requirements_mode) setMode(reqs.requirements_mode)
    if (reqs.simple_totals) setSimpleTotals({ ...simpleTotals, ...reqs.simple_totals })
    if (reqs.stunt_groups) {
      setGroupCount(reqs.stunt_groups.count || '')
      setGroupSize(reqs.stunt_groups.size || '4')
      setGroupRoles(reqs.stunt_groups.roles || groupRoles)
    }
    if (team.min_athletes) setSimpleTotals(t => ({ ...t, min_athletes: team.min_athletes }))
    if (team.max_athletes) setSimpleTotals(t => ({ ...t, max_athletes: team.max_athletes }))
  }, [team])

  // Calculated totals from stunt groups
  const calculatedTotals = groupCount ? {
    flyer: parseInt(groupCount) * parseInt(groupRoles.flyer || 0),
    base: parseInt(groupCount) * parseInt(groupRoles.base || 0),
    back_spot: parseInt(groupCount) * parseInt(groupRoles.back_spot || 0),
    front_spot: parseInt(groupCount) * parseInt(groupRoles.front_spot || 0),
    total: parseInt(groupCount) * parseInt(groupSize || 4),
  } : null

  async function handleSave() {
    setSaving(true)
    try {
      const requirements = {
        requirements_mode: mode,
        simple_totals: mode === 'simple' ? simpleTotals : null,
        stunt_groups: mode === 'stunt_groups' ? {
          count: parseInt(groupCount) || null,
          size: parseInt(groupSize) || 4,
          roles: groupRoles,
          calculated_totals: calculatedTotals,
        } : null,
        // Unified totals used by placement builder
        role_requirements: mode === 'simple' ? {
          flyer: parseInt(simpleTotals.flyer) || 0,
          base: parseInt(simpleTotals.base) || 0,
          back_spot: parseInt(simpleTotals.back_spot) || 0,
          front_spot: parseInt(simpleTotals.front_spot) || 0,
          tumbler: parseInt(simpleTotals.tumbler) || 0,
        } : calculatedTotals ? {
          flyer: calculatedTotals.flyer,
          base: calculatedTotals.base,
          back_spot: calculatedTotals.back_spot,
          front_spot: calculatedTotals.front_spot,
          tumbler: 0,
        } : {},
      }

      const updates = {
        practice_requirements: requirements,
        min_athletes: parseInt(simpleTotals.min_athletes) || team.min_athletes,
        max_athletes: parseInt(simpleTotals.max_athletes) || team.max_athletes,
        updated_at: new Date().toISOString(),
      }

      await supabase.from('teams').update(updates).eq('id', team.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.({ ...team, ...updates })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const numInput = (label, value, onChange, placeholder = '0') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        min="0"
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Requirements Mode</div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('simple')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
              mode === 'simple'
                ? 'border-[#8b002e] bg-[#8b002e]/5 text-[#8b002e]'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Team Totals
          </button>
          <button
            onClick={() => setMode('stunt_groups')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
              mode === 'stunt_groups'
                ? 'border-[#8b002e] bg-[#8b002e]/5 text-[#8b002e]'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Stunt Groups
          </button>
        </div>
      </div>

      {/* Simple totals mode */}
      {mode === 'simple' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {numInput('Min Athletes', simpleTotals.min_athletes, v => setSimpleTotals(t => ({ ...t, min_athletes: v })))}
            {numInput('Max Athletes', simpleTotals.max_athletes, v => setSimpleTotals(t => ({ ...t, max_athletes: v })))}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role Requirements</div>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(role => numInput(
                role.label,
                simpleTotals[role.key],
                v => setSimpleTotals(t => ({ ...t, [role.key]: v }))
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stunt groups mode */}
      {mode === 'stunt_groups' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {numInput('Number of Stunt Groups', groupCount, setGroupCount, 'e.g. 4')}
            {numInput('Athletes Per Group', groupSize, setGroupSize, 'e.g. 4')}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Roles Per Group</div>
            <div className="grid grid-cols-2 gap-3">
              {numInput('Flyers', groupRoles.flyer, v => setGroupRoles(r => ({ ...r, flyer: v })))}
              {numInput('Bases', groupRoles.base, v => setGroupRoles(r => ({ ...r, base: v })))}
              {numInput('Back Spots', groupRoles.back_spot, v => setGroupRoles(r => ({ ...r, back_spot: v })))}
              {numInput('Front Spots', groupRoles.front_spot, v => setGroupRoles(r => ({ ...r, front_spot: v })))}
            </div>
          </div>

          {/* Live calc */}
          {calculatedTotals && (
            <div className="bg-[#F5F6F7] rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Calculated Totals</div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-gray-600">Flyers:</span><span className="font-semibold text-[#1B2E4B]">{calculatedTotals.flyer}</span>
                <span className="text-gray-600">Bases:</span><span className="font-semibold text-[#1B2E4B]">{calculatedTotals.base}</span>
                <span className="text-gray-600">Back Spots:</span><span className="font-semibold text-[#1B2E4B]">{calculatedTotals.back_spot}</span>
                <span className="text-gray-600">Front Spots:</span><span className="font-semibold text-[#1B2E4B]">{calculatedTotals.front_spot}</span>
                <span className="text-gray-600 font-semibold">Total:</span><span className="font-bold text-[#8b002e]">{calculatedTotals.total}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} loading={saving} size="sm">Save Requirements</Button>
        {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}
      </div>
    </div>
  )
}
