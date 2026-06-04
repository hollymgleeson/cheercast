import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Modal from '../components/Modal'
import TeamRequirementsEditor from '../modules/teams/TeamRequirementsEditor'

const TIER_COLORS = {
  elite: 'bg-[#1B2E4B] text-white',
  prep: 'bg-[#8b002e] text-white',
  novice: 'bg-gray-200 text-gray-700',
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-[#1B2E4B] mb-4 text-sm uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

export default function TeamDetailPage() {
  const { id } = useParams()
  const { gymId, isOwner, isCoach } = useAuth()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('roster')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    if (!id) return
    load()
  }, [id])

  async function load() {
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single()

      const { data: teamAthletes } = await supabase
        .from('team_athletes')
        .select('*, athlete:athletes(*, athlete_preferences(*))')
        .eq('team_id', id)
        .eq('status', 'active')

      setTeam(teamData)
      setAthletes(teamAthletes?.map(ta => ta.athlete).filter(Boolean) || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading team...</div>
  if (!team) return <div className="p-8 text-center text-gray-400">Team not found. <button onClick={() => navigate('/teams')} className="text-[#8b002e] hover:underline">Back to Teams</button></div>

  function openEdit() {
    setEditForm({
      name: team.name || '',
      level: team.level || '',
      tier: team.tier || '',
      age_division: team.age_division || '',
      season_year: team.season_year || new Date().getFullYear(),
      max_athletes: team.max_athletes || 30,
      is_anchor_team: team.is_anchor_team || false,
      notes: team.notes || '',
    })
    setEditError('')
    setShowEdit(true)
  }

  async function handleEditSave(e) {
    e.preventDefault()
    if (!editForm.name) { setEditError('Team name is required.'); return }
    setEditSaving(true)
    setEditError('')
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({ ...editForm, max_athletes: parseInt(editForm.max_athletes) || 30, season_year: parseInt(editForm.season_year) })
        .eq('id', team.id)
        .select()
        .single()
      if (error) throw error
      setTeam(data)
      setShowEdit(false)
    } catch (err) {
      setEditError(err.message || 'Could not save changes.')
    } finally {
      setEditSaving(false)
    }
  }

  const reqs = team.practice_requirements?.role_requirements || {}
  const TABS = [
    { id: 'roster', label: 'Roster' },
    { id: 'requirements', label: 'Requirements' },
  ]

  // Count roles from athletes
  const roleCounts = { flyer: 0, base: 0, back_spot: 0, front_spot: 0, tumbler: 0 }
  athletes.forEach(a => {
    const prefs = a.athlete_preferences
    const allRoles = [...(prefs?.preferred_roles || []), ...(prefs?.open_to_roles || [])]
    allRoles.forEach(r => { if (roleCounts[r] !== undefined) roleCounts[r]++ })
  })

  return (
    <div>
      <PageHeader
        title={team.name}
        subtitle={`Level ${team.level} · ${team.tier} · ${team.age_division}`}
        actions={
          <div className="flex items-center gap-2">
            {team.is_anchor_team && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#8b002e]/10 text-[#8b002e]">Anchor Team 🔒</span>
            )}
            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${TIER_COLORS[team.tier] || 'bg-gray-100 text-gray-600'}`}>
              {team.tier}
            </span>
            {(isOwner || isCoach) && (
              <Button variant="outline" size="sm" onClick={openEdit}>Edit Team</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/teams')}>← Back</Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-8">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-[#8b002e] text-[#1B2E4B]' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-8 space-y-4">

        {/* Roster Tab */}
        {tab === 'roster' && (
          <div className="space-y-4">
            {/* Role coverage summary */}
            {Object.values(reqs).some(v => v > 0) && (
              <Section title="Role Coverage">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { key: 'flyer', label: 'Flyers' },
                    { key: 'base', label: 'Bases' },
                    { key: 'back_spot', label: 'Back Spots' },
                    { key: 'front_spot', label: 'Front Spots' },
                    { key: 'tumbler', label: 'Tumblers' },
                  ].map(role => {
                    const needed = reqs[role.key] || 0
                    const have = roleCounts[role.key] || 0
                    const met = have >= needed
                    if (needed === 0) return null
                    return (
                      <div key={role.key} className={`rounded-lg p-3 text-center ${met ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className={`text-2xl font-bold ${met ? 'text-green-600' : 'text-red-600'}`}>
                          {have}/{needed}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{role.label}</div>
                        <div className={`text-xs font-medium mt-0.5 ${met ? 'text-green-600' : 'text-red-500'}`}>
                          {met ? '✓' : `Need ${needed - have} more`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Athlete list */}
            <Section title={`Athletes (${athletes.length}/${team.max_athletes})`}>
              {athletes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No athletes assigned yet. Use the Placement Builder to add athletes.
                </div>
              ) : (
                <div className="space-y-2">
                  {athletes.map(athlete => {
                    const prefs = athlete.athlete_preferences
                    const prefRoles = prefs?.preferred_roles || []
                    const approvedRoles = prefs?.open_to_roles || []
                    return (
                      <div
                        key={athlete.id}
                        onClick={() => navigate(`/athletes/${athlete.id}`)}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F5F6F7] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1B2E4B]/10 flex items-center justify-center text-[#1B2E4B] font-bold text-xs flex-shrink-0">
                            {athlete.first_name[0]}{athlete.last_name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[#1B2E4B]">{athlete.first_name} {athlete.last_name}</div>
                            <div className="text-xs text-gray-400 capitalize">{athlete.age_division} · L{athlete.current_level || '?'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {prefRoles.map(r => (
                            <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#8b002e] text-white capitalize">
                              {r.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {approvedRoles.map(r => (
                            <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1B2E4B]/10 text-[#1B2E4B] capitalize">
                              {r.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* Requirements Tab */}
        {tab === 'requirements' && (
          <div className="max-w-lg">
            <Section title="Team Requirements">
              <TeamRequirementsEditor
                team={team}
                onSaved={updated => setTeam(updated)}
              />
            </Section>
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Team" size="md">
        <form onSubmit={handleEditSave} className="p-6 space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{editError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={editForm.name || ''}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select value={editForm.level || ''} onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]">
                <option value="">Select...</option>
                {['1','1.2','2','2.1','3','3.1','4','4.2','5','6','7'].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select value={editForm.tier || ''} onChange={e => setEditForm(f => ({ ...f, tier: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]">
                <option value="">Select...</option>
                <option value="elite">Elite</option>
                <option value="prep">Prep</option>
                <option value="novice">Novice</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age Division</label>
              <select value={editForm.age_division || ''} onChange={e => setEditForm(f => ({ ...f, age_division: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]">
                <option value="">Select...</option>
                <option value="tiny">Tiny (6U)</option>
                <option value="mini">Mini (8U)</option>
                <option value="pee_wee">Pee Wee (10U)</option>
                <option value="youth">Youth (12U)</option>
                <option value="junior">Junior (14U)</option>
                <option value="senior">Senior (18U)</option>
                <option value="open">Open</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Season Year</label>
              <input type="number" value={editForm.season_year || ''} onChange={e => setEditForm(f => ({ ...f, season_year: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Athletes</label>
            <input type="number" value={editForm.max_athletes || ''} onChange={e => setEditForm(f => ({ ...f, max_athletes: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e] resize-none" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={editForm.is_anchor_team || false}
              onChange={e => setEditForm(f => ({ ...f, is_anchor_team: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-[#8b002e] focus:ring-[#8b002e]" />
            <div>
              <div className="text-sm font-medium text-[#1B2E4B]">Anchor Team 🔒</div>
              <div className="text-xs text-gray-400">Anchor teams are locked in AI scenario generation</div>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={editSaving}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
