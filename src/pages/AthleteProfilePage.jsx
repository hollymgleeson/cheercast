import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAthlete, updateAthlete } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { getAgeDivision } from '../utils/usasf-rules'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import EditAthleteModal from '../modules/athletes/EditAthleteModal'
import AthleteSkillsTab from '../modules/athletes/AthleteSkillsTab'
import AthleteRolesEditor from '../modules/athletes/AthleteRolesEditor'
import { formatPhone } from '../utils/formatters'

const CURRENT_YEAR = new Date().getFullYear()

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

function Field({ label, value, fallback = '—' }) {
  return (
    <div>
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-[#1B2E4B] font-medium">{value || fallback}</div>
    </div>
  )
}

export default function AthleteProfilePage() {
  const { id } = useParams()
  const { gymId, isOwner, isCoach } = useAuth()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState({})
  const [savingNotes, setSavingNotes] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const data = await getAthlete(id)
        setAthlete(data)
        setNotes({
          notes_public: data.notes_public || '',
          notes_coach_private: data.notes_coach_private || '',
          notes_owner_private: data.notes_owner_private || '',
        })

        // Load preferences separately
        const { data: prefs } = await supabase
          .from('athlete_preferences')
          .select('*')
          .eq('athlete_id', id)
          .single()
        setPreferences(prefs)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function saveNotes() {
    setSavingNotes(true)
    try {
      const updated = await updateAthlete(id, notes)
      setAthlete(a => ({ ...a, ...updated }))
      setEditingNotes(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading athlete profile...
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="p-8 text-center text-gray-400">
        Athlete not found.
        <br />
        <button onClick={() => navigate('/athletes')} className="text-[#8b002e] mt-2 text-sm hover:underline">
          Back to Athletes
        </button>
      </div>
    )
  }

  const ageDivision = athlete.date_of_birth
    ? getAgeDivision(athlete.date_of_birth, CURRENT_YEAR)
    : athlete.age_division

  const heightDisplay = athlete.height_inches
    ? `${Math.floor(athlete.height_inches / 12)}'${athlete.height_inches % 12}"`
    : null

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'skills', label: 'Skills' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div>
      <PageHeader
        title={`${athlete.first_name} ${athlete.last_name}`}
        subtitle={[
          ageDivision && `${ageDivision.charAt(0).toUpperCase() + ageDivision.slice(1)}`,
          athlete.current_level && `Level ${athlete.current_level}`,
          athlete.current_tier && athlete.current_tier.charAt(0).toUpperCase() + athlete.current_tier.slice(1),
        ].filter(Boolean).join(' · ')}
        actions={
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              athlete.status === 'active' ? 'bg-green-100 text-green-700' :
              athlete.status === 'injured' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {athlete.status}
            </span>
            {(isOwner || isCoach) && (
              <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>Edit Profile</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/athletes')}>
              ← Back
            </Button>
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
              tab === t.id
                ? 'border-[#8b002e] text-[#1B2E4B]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-8 space-y-4">

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Personal Info">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth" value={athlete.date_of_birth ? new Date(athlete.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
                <Field label="Age Division" value={ageDivision ? ageDivision.charAt(0).toUpperCase() + ageDivision.slice(1) : null} />
                <Field label="Height" value={heightDisplay} />
                <Field label="Still Growing" value={athlete.still_growing ? 'Yes' : 'No'} />
                <Field label="Join Date" value={athlete.join_date ? new Date(athlete.join_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null} />
                <Field label="Years at Gym" value={athlete.join_date ? `${new Date().getFullYear() - new Date(athlete.join_date).getFullYear()} years` : null} />
              </div>
            </Section>

            <Section title="Contact">
              <div className="space-y-3">
                <div className="border-b border-gray-100 pb-3">
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Parent / Guardian</div>
                  <div className="grid grid-cols-1 gap-2">
                    <Field label="Name" value={athlete.parent_name} />
                    <Field label="Email" value={athlete.parent_email} />
                    <Field label="Phone" value={formatPhone(athlete.parent_phone)} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Athlete</div>
                  <div className="grid grid-cols-1 gap-2">
                    <Field label="Email" value={athlete.email} />
                    {athlete.phone && <Field label="Phone" value={formatPhone(athlete.phone)} />}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Placement">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Level</div>
                  <div className="text-lg font-bold text-[#1B2E4B]">
                    {athlete.current_level ? `Level ${athlete.current_level}` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Tier</div>
                  {athlete.current_tier ? (
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold capitalize ${TIER_COLORS[athlete.current_tier] ?? 'bg-gray-100 text-gray-600'}`}>
                      {athlete.current_tier}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
                <Field label="Current Team" value={athlete.current_team?.name} />
              </div>
            </Section>

            <Section title="Performance">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Attendance Score</div>
                  <div className="flex items-end gap-1">
                    <div className="text-2xl font-bold text-[#1B2E4B]">{athlete.attendance_score ?? 0}</div>
                    <div className="text-sm text-gray-400 mb-0.5">/100</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Etiquette Score</div>
                  <div className="flex items-end gap-1">
                    <div className="text-2xl font-bold text-[#1B2E4B]">{athlete.competition_etiquette_score ?? 0}</div>
                    <div className="text-sm text-gray-400 mb-0.5">/100</div>
                  </div>
                </div>
              </div>
              {athlete.performance_badges?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Badges</div>
                  <div className="flex flex-wrap gap-2">
                    {athlete.performance_badges.map((badge, i) => (
                      <span key={i} className="px-2 py-1 bg-[#8b002e]/10 text-[#8b002e] rounded text-xs font-medium">
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* Preferences Tab */}
        {tab === 'preferences' && (
          <div className="max-w-2xl space-y-4">
            {/* Role editor -- always show for coaches/owners */}
            {(isOwner || isCoach) && (
              <Section title="Roles">
                <AthleteRolesEditor
                  athleteId={id}
                  gymId={gymId}
                  preferences={preferences}
                  onSaved={updated => setPreferences(p => ({ ...p, ...updated }))}
                />
              </Section>
            )}
            {preferences ? (
              <Section title="Other Preferences">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Preferred Tier"
                      value={preferences.preferred_tier ? preferences.preferred_tier.charAt(0).toUpperCase() + preferences.preferred_tier.slice(1) : null}
                    />
                    <Field
                      label="Open to Crossover"
                      value={preferences.willing_crossover ? 'Yes' : 'No'}
                    />
                    <Field
                      label="Priority"
                      value={preferences.priority ? preferences.priority.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null}
                    />
                    <Field
                      label="Age Preference"
                      value={preferences.age_preference ? preferences.age_preference.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null}
                    />
                  </div>

                  {preferences.preferred_roles?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Preferred Roles</div>
                      <div className="flex flex-wrap gap-2">
                        {preferences.preferred_roles.map((role, i) => (
                          <span key={i} className="px-2 py-1 bg-[#1B2E4B]/10 text-[#1B2E4B] rounded text-xs font-medium capitalize">
                            {role.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {preferences.preferred_friends?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Preferred Friends (advisory)</div>
                      <div className="text-sm text-gray-600">{preferences.preferred_friends.join(', ')}</div>
                    </div>
                  )}

                  {preferences.unavailable_dates?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Unavailable Dates</div>
                      <div className="space-y-1">
                        {preferences.unavailable_dates.map((d, i) => (
                          <div key={i} className="text-sm text-gray-600">
                            {d.date} {d.reason && `— ${d.reason}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {preferences.notes && (
                    <div>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Additional Notes</div>
                      <div className="text-sm text-gray-600">{preferences.notes}</div>
                    </div>
                  )}
                </div>
              </Section>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-3xl mb-2">◎</div>
                <div>No preferences recorded yet.</div>
                <div className="text-sm mt-1">The athlete or parent can fill these in when they receive their login.</div>
              </div>
            )}
          </div>
        )}

        {/* Skills Tab */}
        {tab === 'skills' && (
          <AthleteSkillsTab athleteId={id} gymId={gymId} />
        )}

        {/* Notes Tab */}
        {tab === 'notes' && (isOwner || isCoach) && (
          <div className="max-w-2xl space-y-4">
            <Section title="Notes">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Public Notes
                    <span className="ml-1 text-gray-400 normal-case font-normal">(visible to athlete and parents)</span>
                  </label>
                  {editingNotes ? (
                    <textarea
                      value={notes.notes_public}
                      onChange={e => setNotes(n => ({ ...n, notes_public: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] resize-none"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 min-h-[3rem]">{athlete.notes_public || <span className="text-gray-300">No notes</span>}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Coach Notes
                    <span className="ml-1 text-gray-400 normal-case font-normal">(coaches and owners only)</span>
                  </label>
                  {editingNotes ? (
                    <textarea
                      value={notes.notes_coach_private}
                      onChange={e => setNotes(n => ({ ...n, notes_coach_private: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] resize-none"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 min-h-[3rem]">{athlete.notes_coach_private || <span className="text-gray-300">No notes</span>}</p>
                  )}
                </div>

                {isOwner && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Owner Notes
                      <span className="ml-1 text-gray-400 normal-case font-normal">(owners only)</span>
                    </label>
                    {editingNotes ? (
                      <textarea
                        value={notes.notes_owner_private}
                        onChange={e => setNotes(n => ({ ...n, notes_owner_private: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] resize-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 min-h-[3rem]">{athlete.notes_owner_private || <span className="text-gray-300">No notes</span>}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {editingNotes ? (
                    <>
                      <Button onClick={saveNotes} loading={savingNotes}>Save Notes</Button>
                      <Button variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setEditingNotes(true)}>Edit Notes</Button>
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>

      <EditAthleteModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        athlete={athlete}
        onUpdated={(updated) => {
          setAthlete(a => ({ ...a, ...updated }))
          setShowEdit(false)
        }}
      />
    </div>
  )
}
