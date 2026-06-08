import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getAthletes, getSkills, updateEvalSession } from '../lib/supabase'
import { generateEvalRound1Report } from '../lib/ai'
import Button from '../components/Button'
import MediaUploader from '../modules/eval/MediaUploader'

// ─── Scoring Scale ────────────────────────────────────────────────────────────
// 1 = Needs Work, 2 = Developing, 3 = Solid, 4 = Strong, 5 = Elite

const SCORE_CONFIG = {
  1: { label: 'Needs Work',  short: '1',  selected: 'bg-red-500 text-white ring-4 ring-red-200',     idle: 'bg-red-50 text-red-400 hover:bg-red-100' },
  2: { label: 'Developing',  short: '2',  selected: 'bg-orange-500 text-white ring-4 ring-orange-200', idle: 'bg-orange-50 text-orange-400 hover:bg-orange-100' },
  3: { label: 'Solid',       short: '3',  selected: 'bg-amber-400 text-white ring-4 ring-amber-200',  idle: 'bg-amber-50 text-amber-500 hover:bg-amber-100' },
  4: { label: 'Strong',      short: '4',  selected: 'bg-blue-500 text-white ring-4 ring-blue-200',    idle: 'bg-blue-50 text-blue-400 hover:bg-blue-100' },
  5: { label: 'Elite',       short: '5',  selected: 'bg-green-500 text-white ring-4 ring-green-200',  idle: 'bg-green-50 text-green-500 hover:bg-green-100' },
}

function ScoreButton({ value, selected, onClick }) {
  const cfg = SCORE_CONFIG[value]
  return (
    <button
      onClick={() => onClick(selected ? null : value)}
      className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl font-bold transition-all ${selected ? cfg.selected : cfg.idle}`}
      title={cfg.label}
    >
      <span className="text-lg leading-none">{cfg.short}</span>
      <span className="text-[9px] leading-none mt-0.5 font-medium opacity-80">{cfg.label}</span>
    </button>
  )
}

// ─── Score Key ────────────────────────────────────────────────────────────────

function ScoreKey() {
  return (
    <div className="px-4 py-2.5 bg-white border-b border-gray-100">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Scoring Key</div>
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(SCORE_CONFIG).map(([v, cfg]) => (
          <div key={v} className="flex items-center gap-1.5">
            <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold ${cfg.selected}`}>
              {v}
            </span>
            <span className="text-xs text-gray-500">{cfg.label}</span>
            {parseInt(v) < 5 && <span className="text-gray-200 text-xs">·</span>}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-100">
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-400 border border-red-200">Exclude</span>
          <span className="text-xs text-gray-500">Flag to exclude this attempt</span>
        </div>
      </div>
    </div>
  )
}

// ─── Performance Flag Button ──────────────────────────────────────────────────

function FlagButton({ value, label, icon, selected, onClick, color }) {
  return (
    <button
      onClick={() => onClick(selected ? null : value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        selected ? `${color} border-current` : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}

// ─── Category Labels ──────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EvalSessionPage() {
  const { sessionId } = useParams()
  const { gymId } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [athletes, setAthletes] = useState([])
  const [skills, setSkills] = useState([])
  const [gymSkillConfig, setGymSkillConfig] = useState({ disabled: new Set(), notes: {} })
  const [scores, setScores] = useState({}) // key: `${athleteId}_${skillId}`
  const [loading, setLoading] = useState(true)
  const [savingScore, setSavingScore] = useState({})
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [athleteSearch, setAthleteSearch] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [view, setView] = useState('athletes') // 'athletes' | 'scoring'

  useEffect(() => {
    if (!sessionId || !gymId) return
    load()

    // Real-time: subscribe to score changes from other coaches
    const channel = supabase
      .channel(`eval_scores_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'eval_scores',
        filter: `eval_session_id=eq.${sessionId}`,
      }, payload => {
        const score = payload.new || payload.old
        if (!score) return
        const key = `${score.athlete_id}_${score.skill_id}`
        if (payload.eventType === 'DELETE') {
          setScores(prev => { const next = { ...prev }; delete next[key]; return next })
        } else {
          setScores(prev => ({ ...prev, [key]: score }))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, gymId])

  async function load() {
    try {
      const [
        { data: sess },
        athleteData,
        skillData,
        { data: existingScores },
        { data: gym },
      ] = await Promise.all([
        supabase.from('eval_sessions').select('*').eq('id', sessionId).single(),
        getAthletes(gymId, { status: 'active' }),
        getSkills(),
        supabase.from('eval_scores').select('*').eq('eval_session_id', sessionId),
        supabase.from('gyms').select('settings').eq('id', gymId).single(),
      ])

      setSession(sess)
      setAthletes(athleteData)

      const config = gym?.settings?.skill_config || {}
      const disabledSet = new Set(config.disabled_skill_ids || [])
      setGymSkillConfig({ disabled: disabledSet, notes: config.skill_notes || {} })
      setSkills(skillData.filter(s => !disabledSet.has(s.id)))

      const scoreIndex = {}
      existingScores?.forEach(s => {
        scoreIndex[`${s.athlete_id}_${s.skill_id}`] = s
      })
      setScores(scoreIndex)
      setReportGenerated(sess?.ai_report_generated || false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function saveScore(skillId, updates) {
    if (!selectedAthlete) return
    const key = `${selectedAthlete.id}_${skillId}`
    setSavingScore(s => ({ ...s, [key]: true }))

    try {
      const existing = scores[key]
      const payload = {
        eval_session_id: sessionId,
        athlete_id: selectedAthlete.id,
        skill_id: skillId,
        gym_id: gymId,
        ...updates,
      }

      if (existing) {
        const { data, error } = await supabase
          .from('eval_scores')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        if (data) setScores(prev => ({ ...prev, [key]: data }))
      } else {
        const { data, error } = await supabase
          .from('eval_scores')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        if (data) setScores(prev => ({ ...prev, [key]: data }))
      }
    } catch (err) {
      console.error('Score save error:', err)
    } finally {
      setSavingScore(s => ({ ...s, [key]: false }))
    }
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    try {
      const scoreList = Object.values(scores)
      const report = await generateEvalRound1Report({
        scores: scoreList,
        athletes,
        skills,
        sessionId,
      })
      await updateEvalSession(sessionId, {
        ai_report_generated: true,
        ai_report: report,
        status: 'complete',
      })
      setReportGenerated(true)
      setSession(s => ({ ...s, ai_report_generated: true, status: 'complete' }))
    } catch (err) {
      console.error('Report error:', err)
      alert('Could not generate report. Please try again.')
    } finally {
      setGeneratingReport(false)
    }
  }

  async function activateSession() {
    try {
      const { data } = await supabase
        .from('eval_sessions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single()
      setSession(data)
    } catch (err) {
      console.error(err)
    }
  }

  function athleteScoreCount(athleteId) {
    return Object.keys(scores).filter(k => k.startsWith(`${athleteId}_`)).length
  }

  const skillsByCategory = {}
  skills.forEach(skill => {
    if (!skillsByCategory[skill.category]) skillsByCategory[skill.category] = []
    skillsByCategory[skill.category].push(skill)
  })

  const filteredAthletes = athletes.filter(a =>
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(athleteSearch.toLowerCase())
  )

  const totalScored = Object.keys(scores).length
  const scoredAthletes = new Set(Object.keys(scores).map(k => k.split('_')[0])).size

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F6F7]">
        <div className="text-gray-400">Loading session...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F6F7]">
        <div className="text-center">
          <div className="text-gray-400 mb-3">Session not found.</div>
          <Button onClick={() => navigate('/evaluations')}>Back to Evaluations</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1B2E4B] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1B2E4B] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => view === 'scoring' ? setView('athletes') : view === 'attendance' ? setView('athletes') : navigate('/evaluations')}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            ← {view === 'scoring' ? 'Athletes' : 'Back'}
          </button>
          <div>
            <div className="text-white font-bold text-sm">
              {session.notes?.split(' — ')[0] && session.notes.split(' — ')[0] !== session.notes
                ? session.notes.split(' — ')[0]
                : 'Eval Session'}
            </div>
            <div className="text-white/50 text-xs">
              {session.eval_date
                ? new Date(session.eval_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No date set'}
            </div>
          </div>
          {/* Scoring / Attendance toggle */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => view !== 'attendance' ? null : setView('athletes')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${view !== 'attendance' ? 'bg-white text-[#1B2E4B]' : 'text-white/60 hover:text-white'}`}
            >
              Scoring
            </button>
            <button
              onClick={() => setView('attendance')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${view === 'attendance' ? 'bg-white text-[#1B2E4B]' : 'text-white/60 hover:text-white'}`}
            >
              Attendance
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-white/60 text-xs">{scoredAthletes} athletes scored</div>
            <div className="text-white/60 text-xs">{totalScored} total scores</div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            session.status === 'active' ? 'bg-green-500/20 text-green-300' :
            session.status === 'complete' ? 'bg-[#8b002e]/20 text-[#8b002e]' :
            'bg-white/10 text-white/60'
          }`}>
            {session.status}
          </span>
        </div>
      </div>

      {/* Activate banner */}
      {session.status === 'scheduled' && (
        <div className="bg-[#8b002e] px-4 py-3 flex items-center justify-between">
          <span className="text-[#1B2E4B] text-sm font-medium">Session is scheduled. Activate to start scoring.</span>
          <Button size="sm" onClick={activateSession}>Activate Session</Button>
        </div>
      )}

      {/* ── ATTENDANCE VIEW ── */}
      {view === 'attendance' && (
        <AttendancePanel session={session} athletes={athletes} gymId={gymId} onSessionUpdate={setSession} />
      )}

      <div className={`flex flex-1 overflow-hidden ${view === 'attendance' ? 'hidden' : ''}`}>

        {/* ── ATHLETE LIST ── */}
        <div className={`${view === 'athletes' ? 'flex' : 'hidden md:flex'} w-full md:w-72 bg-white flex-col flex-shrink-0 border-r border-gray-100`}>
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={athleteSearch}
              onChange={e => setAthleteSearch(e.target.value)}
              placeholder="Search athletes..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredAthletes.map(athlete => {
              const count = athleteScoreCount(athlete.id)
              const isSelected = selectedAthlete?.id === athlete.id
              return (
                <button
                  key={athlete.id}
                  onClick={() => { setSelectedAthlete(athlete); setView('scoring') }}
                  className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 text-left transition-colors ${
                    isSelected ? 'bg-[#1B2E4B] text-white' : 'hover:bg-[#F5F6F7]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#1B2E4B]/10 text-[#1B2E4B]'
                    }`}>
                      {athlete.first_name[0]}{athlete.last_name[0]}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-[#1B2E4B]'}`}>
                        {athlete.first_name} {athlete.last_name}
                      </div>
                      <div className={`text-xs capitalize ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                        {athlete.current_level ? `L${athlete.current_level}` : 'No level'} · {athlete.age_division || 'No div'}
                      </div>
                    </div>
                  </div>
                  {count > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isSelected ? 'bg-[#8b002e] text-[#1B2E4B]' : 'bg-green-100 text-green-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {session.status !== 'scheduled' && (
            <div className="p-3 border-t border-gray-100">
              {reportGenerated ? (
                <div className="text-center py-2">
                  <div className="text-green-600 text-sm font-medium">✓ AI Report Generated</div>
                  <button onClick={() => navigate('/reports')} className="text-xs text-[#8b002e] hover:underline mt-1">
                    View Report →
                  </button>
                </div>
              ) : (
                <Button
                  variant="gold"
                  className="w-full"
                  onClick={handleGenerateReport}
                  loading={generatingReport}
                  disabled={totalScored === 0}
                >
                  Generate AI Report
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── SCORING PANEL ── */}
        <div className={`${view === 'scoring' ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden bg-[#F5F6F7]`}>
          {!selectedAthlete ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-5xl mb-4">◎</div>
                <div className="text-lg font-bold text-[#1B2E4B] mb-2">Select an athlete to start scoring</div>
                <div className="text-sm text-gray-400">Tap any athlete from the list to begin.</div>
              </div>
            </div>
          ) : (
            <>
              {/* Athlete header */}
              <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1B2E4B]/10 flex items-center justify-center text-[#1B2E4B] font-bold text-sm flex-shrink-0">
                    {selectedAthlete.first_name[0]}{selectedAthlete.last_name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-[#1B2E4B]">{selectedAthlete.first_name} {selectedAthlete.last_name}</div>
                    <div className="text-xs text-gray-400 capitalize">
                      {selectedAthlete.current_level ? `Level ${selectedAthlete.current_level}` : 'No level'} · {selectedAthlete.age_division || 'No division'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#1B2E4B]">{athleteScoreCount(selectedAthlete.id)}</div>
                    <div className="text-xs text-gray-400">scored</div>
                  </div>
                </div>
              </div>

              {/* Score key -- always visible */}
              <ScoreKey />

              {/* Skills */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                  <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#1B2E4B] text-white text-xs font-bold uppercase tracking-wide">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {catSkills.map(skill => {
                        const key = `${selectedAthlete.id}_${skill.id}`
                        const existing = scores[key]
                        const currentScore = existing?.score || null
                        const currentFlag = existing?.performance_flag || null
                        const isExcluded = existing?.is_excluded || false
                        const isSaving = savingScore[key]
                        const gymNote = gymSkillConfig.notes[skill.id]
                        const existingMedia = existing?.video_url
                          ? { url: existing.video_url, type: existing.video_url.match(/\.(mp4|mov|webm|avi)$/i) ? 'video' : 'photo' }
                          : null

                        return (
                          <div key={skill.id} className={`p-3 ${isExcluded ? 'opacity-50 bg-gray-50' : ''}`}>
                            {/* Skill name */}
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                <span className="text-sm font-semibold text-[#1B2E4B]">{skill.name}</span>
                                <span className="text-xs text-gray-400">L{skill.level_min}</span>
                                {gymNote ? (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#8b002e]/20 text-[#8b002e]">{gymNote}</span>
                                ) : skill.tier !== 'level_appropriate' ? (
                                  <span className="text-xs text-gray-400 italic capitalize">{skill.tier}</span>
                                ) : null}
                              </div>
                              {isSaving && (
                                <div className="w-4 h-4 border-2 border-[#8b002e] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              )}
                            </div>

                            {/* Score buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex gap-1.5">
                                {[1,2,3,4,5].map(v => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={currentScore === v && !isExcluded}
                                    onClick={score => saveScore(skill.id, { score })}
                                  />
                                ))}
                              </div>
                              <button
                                onClick={() => saveScore(skill.id, { is_excluded: !isExcluded, score: isExcluded ? currentScore : null })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all h-10 ${
                                  isExcluded
                                    ? 'bg-red-100 text-red-700 ring-2 ring-red-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                Exclude
                              </button>
                            </div>

                            {/* Performance flags -- show when scored */}
                            {(currentScore || isExcluded) && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs text-gray-400">Flag:</span>
                                <FlagButton value="performance_star" label="Star" icon="★" selected={currentFlag === 'performance_star'} onClick={f => saveScore(skill.id, { performance_flag: f })} color="bg-[#8b002e]/20 text-[#8b002e]" />
                                <FlagButton value="performance_ready" label="Ready" icon="✓" selected={currentFlag === 'performance_ready'} onClick={f => saveScore(skill.id, { performance_flag: f })} color="bg-green-100 text-green-700" />
                                <FlagButton value="avoid_performance" label="Avoid" icon="✕" selected={currentFlag === 'avoid_performance'} onClick={f => saveScore(skill.id, { performance_flag: f })} color="bg-red-100 text-red-700" />
                              </div>
                            )}

                            {/* Media uploader */}
                            <MediaUploader
                              athleteId={selectedAthlete.id}
                              skillId={skill.id}
                              sessionId={sessionId}
                              existingMedia={existingMedia}
                              onSaved={(url) => saveScore(skill.id, { video_url: url })}
                              onDeleted={() => saveScore(skill.id, { video_url: null })}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Attendance Panel ─────────────────────────────────────────────────────────

function AttendancePanel({ session, athletes, gymId, onSessionUpdate }) {
  const [evalDates, setEvalDates] = useState(session.eval_dates || [])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [addingDate, setAddingDate] = useState(false)
  const [newDate, setNewDate] = useState('')

  useEffect(() => { loadAttendance() }, [session.id])

  async function loadAttendance() {
    try {
      const { data } = await supabase
        .from('eval_attendance')
        .select('athlete_id, eval_date, attended')
        .eq('eval_session_id', session.id)
      const map = {}
      data?.forEach(r => { map[`${r.athlete_id}_${r.eval_date}`] = r.attended })
      setAttendance(map)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function addDate() {
    if (!newDate || evalDates.includes(newDate) || evalDates.length >= 4) return
    const sorted = [...evalDates, newDate].sort()
    const { data, error } = await supabase
      .from('eval_sessions').update({ eval_dates: sorted }).eq('id', session.id).select().single()
    if (!error) { setEvalDates(sorted); onSessionUpdate(data) }
    setNewDate(''); setAddingDate(false)
  }

  async function removeDate(date) {
    if (!confirm(`Remove ${fmt(date)} from this session?`)) return
    const updated = evalDates.filter(d => d !== date)
    const { data, error } = await supabase
      .from('eval_sessions').update({ eval_dates: updated }).eq('id', session.id).select().single()
    if (!error) { setEvalDates(updated); onSessionUpdate(data) }
  }

  async function toggleAttendance(athleteId, date) {
    const key = `${athleteId}_${date}`
    const current = attendance[key] ?? false
    const next = !current
    setSaving(s => ({ ...s, [key]: true }))
    setAttendance(prev => ({ ...prev, [key]: next }))
    try {
      await supabase.from('eval_attendance').upsert({
        eval_session_id: session.id, athlete_id: athleteId,
        gym_id: gymId, eval_date: date, attended: next,
      }, { onConflict: 'eval_session_id,athlete_id,eval_date' })
    } catch (err) {
      console.error(err)
      setAttendance(prev => ({ ...prev, [key]: current }))
    } finally { setSaving(s => ({ ...s, [key]: false })) }
  }

  function fmt(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function attendanceCount(date) {
    return athletes.filter(a => attendance[`${a.id}_${date}`]).length
  }

  const sorted = [...athletes].sort((a, b) => a.last_name.localeCompare(b.last_name))

  return (
    <div className="flex-1 overflow-auto bg-[#F5F6F7]">
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Date management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1B2E4B]">Evaluation Dates</h3>
              <p className="text-sm text-gray-400 mt-0.5">Add up to 4 dates — athletes are tracked against each one.</p>
            </div>
            {evalDates.length < 4 && (
              <Button size="sm" variant="gold" onClick={() => setAddingDate(true)}>+ Add Date</Button>
            )}
          </div>
          {addingDate && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#F5F6F7] rounded-lg">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                autoFocus />
              <Button size="sm" onClick={addDate} disabled={!newDate}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingDate(false); setNewDate('') }}>Cancel</Button>
            </div>
          )}
          {evalDates.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No eval dates yet. Add up to 4 dates to start tracking attendance.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {evalDates.map(date => (
                <div key={date} className="flex items-center gap-2 px-4 py-2 bg-[#1B2E4B]/5 rounded-lg border border-[#1B2E4B]/10">
                  <span className="font-semibold text-[#1B2E4B] text-sm">{fmt(date)}</span>
                  <span className="text-xs text-gray-400">{attendanceCount(date)}/{athletes.length}</span>
                  <button onClick={() => removeDate(date)} className="text-gray-300 hover:text-red-400 transition-colors text-xs ml-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance grid */}
        {evalDates.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-[#1B2E4B]">Attendance</h3>
              <p className="text-xs text-gray-400 mt-0.5">{sorted.length} athletes · tap checkboxes to mark attended</p>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F6F7] border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Athlete</th>
                      {evalDates.map(date => (
                        <th key={date} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          <div>{fmt(date)}</div>
                          <div className="text-[#8b002e] font-bold normal-case">{attendanceCount(date)}/{sorted.length}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sorted.map(athlete => (
                      <tr key={athlete.id} className="hover:bg-[#F5F6F7]/50">
                        <td className="px-5 py-2.5">
                          <div className="font-medium text-[#1B2E4B]">{athlete.last_name}, {athlete.first_name}</div>
                          {athlete.age_division && <div className="text-xs text-gray-400 capitalize">{athlete.age_division}</div>}
                        </td>
                        {evalDates.map(date => {
                          const key = `${athlete.id}_${date}`
                          const attended = attendance[key] ?? false
                          return (
                            <td key={date} className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => toggleAttendance(athlete.id, date)}
                                disabled={saving[key]}
                                className={`w-8 h-8 rounded-lg border-2 transition-all mx-auto flex items-center justify-center font-bold text-sm ${
                                  attended ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-200 hover:border-gray-300'
                                } ${saving[key] ? 'opacity-50' : ''}`}
                              >
                                {attended ? '✓' : ''}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
