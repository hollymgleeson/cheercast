import { useState } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'

const AGE_DIVISIONS = ['tiny', 'mini', 'youth', 'junior', 'senior', 'open']
const TIERS = ['elite', 'prep', 'novice']
const LEVELS = ['1', '1.2', '2', '2.1', '3', '3.1', '4', '4.2', '5', '6', '7']

export default function ScenarioParamsModal({ open, onClose, onGenerate, loading }) {
  const [teams, setTeams] = useState([
    { name: '', level: '', tier: '', age_division: '' },
  ])
  const [notes, setNotes] = useState('')

  function addTeam() {
    setTeams(t => [...t, { name: '', level: '', tier: '', age_division: '' }])
  }

  function removeTeam(i) {
    setTeams(t => t.filter((_, idx) => idx !== i))
  }

  function updateTeam(i, field, value) {
    setTeams(t => t.map((team, idx) => idx === i ? { ...team, [field]: value } : team))
  }

  function handleGenerate() {
    const filledTeams = teams.filter(t => t.level || t.tier || t.age_division || t.name)
    onGenerate({
      requested_teams: filledTeams,
      notes,
    })
  }

  const sel = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e] w-full'

  return (
    <Modal open={open} onClose={onClose} title="Generate AI Team Scenarios" size="md">
      <div className="p-6 space-y-5">
        <p className="text-sm text-gray-500">
          Optionally tell the AI what teams you want to build. Leave blank to let the AI decide, or fill in as much or as little as you like.
        </p>

        {/* Team list */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Teams You Want</div>
          {teams.map((team, i) => (
            <div key={i} className="bg-[#F5F6F7] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Team {i + 1}</span>
                {teams.length > 1 && (
                  <button onClick={() => removeTeam(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Team Name (optional)</label>
                  <input
                    type="text"
                    value={team.name}
                    onChange={e => updateTeam(i, 'name', e.target.value)}
                    placeholder="e.g. Black Diamonds"
                    className={sel}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Level</label>
                  <select value={team.level} onChange={e => updateTeam(i, 'level', e.target.value)} className={sel}>
                    <option value="">Any level</option>
                    {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tier</label>
                  <select value={team.tier} onChange={e => updateTeam(i, 'tier', e.target.value)} className={sel}>
                    <option value="">Any tier</option>
                    {TIERS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Age Division</label>
                  <select value={team.age_division} onChange={e => updateTeam(i, 'age_division', e.target.value)} className={sel}>
                    <option value="">Any age</option>
                    {AGE_DIVISIONS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addTeam}
            className="text-sm text-[#8b002e] font-medium hover:underline"
          >
            + Add another team
          </button>
        </div>

        {/* Additional notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Additional Instructions <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Keep best tumblers on the senior team. Prioritize crossover athletes for the junior team. Make sure we have at least 3 stunt groups per team."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e] resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" onClick={handleGenerate} loading={loading}>
          ✦ Generate Scenarios
        </Button>
      </div>
    </Modal>
  )
}
