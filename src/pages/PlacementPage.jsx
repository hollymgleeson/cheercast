import { useEffect, useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { generateTeamScenarios } from '../lib/ai'
import { runAllChecks, FLAG_TYPES } from '../utils/usasf-rules'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import { FlagList } from '../components/Flag'
import ScenarioParamsModal from '../modules/placement/ScenarioParamsModal'

const TIER_COLORS = {
  elite: 'bg-[#1B2E4B] text-white',
  prep: 'bg-[#8b002e] text-white',
  novice: 'bg-gray-200 text-gray-700',
}

const TIER_BORDER = {
  elite: 'border-[#1B2E4B]',
  prep: 'border-[#8b002e]',
  novice: 'border-gray-300',
}

// ─── Athlete Card ─────────────────────────────────────────────────────────────

function AthleteCard({ athlete, flags = [], isDragging = false, onClick, onCrossover, currentTeamIds = [], allTeams = [] }) {
  const totalTeams = currentTeamIds.length
  const hasHardViolation = flags.some(f => f.type === FLAG_TYPES.HARD_VIOLATION && f.athlete_id === athlete.id)
  const availableTeams = allTeams.filter(t => !currentTeamIds.includes(t.id))

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border-2 p-2.5 cursor-grab select-none transition-all ${
        isDragging ? 'opacity-50 shadow-2xl scale-105' : 'hover:shadow-md'
      } ${hasHardViolation ? 'border-red-400 bg-red-50' : TIER_BORDER[athlete.current_tier] || 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            TIER_COLORS[athlete.current_tier] || 'bg-gray-100 text-gray-600'
          }`}>
            {athlete.first_name[0]}{athlete.last_name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#1B2E4B] truncate">
              {athlete.first_name} {athlete.last_name}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <span className="capitalize">{athlete.age_division}</span>
              {athlete.current_level && <><span>·</span><span>L{athlete.current_level}</span></>}
              {athlete.height_inches && <><span>·</span><span>{Math.floor(athlete.height_inches/12)}'{athlete.height_inches%12}"</span></>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            {/* Crossover count badge */}
            {totalTeams > 1 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#C9A84C] text-[#1B2E4B] flex items-center gap-0.5 shadow-sm">
                X{totalTeams} ↗
              </span>
            )}
            {/* Crossover button — only shown when in a team and there are other teams */}
            {onCrossover && availableTeams.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); onCrossover(athlete, availableTeams) }}
                className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-[#C9A84C] hover:bg-amber-50 transition-colors text-xs font-bold"
                title="Add as crossover to another team"
              >
                ↗
              </button>
            )}
          </div>
          {/* Preferred roles */}
          {athlete.athlete_preferences?.preferred_roles?.slice(0, 2).map((role, i) => (
            <span key={role} className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              i === 0 ? 'bg-[#8b002e] text-white' : 'bg-[#1B2E4B] text-white'
            }`}>
              {role.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
      {hasHardViolation && (
        <div className="mt-1 text-xs text-red-600 font-medium">⚠ Violation</div>
      )}
    </div>
  )
}

// ─── Crossover Ghost Card ─────────────────────────────────────────────────────

function CrossoverCard({ athlete, primaryTeamName, flags = [], onRemove }) {
  const hasHardViolation = flags.some(f => f.type === FLAG_TYPES.HARD_VIOLATION && f.athlete_id === athlete.id)

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-2.5 select-none ${
        hasHardViolation ? 'border-red-300' : 'border-amber-300'
      }`}
      style={{
        background: hasHardViolation
          ? 'repeating-linear-gradient(45deg,#fff5f5,#fff5f5 8px,#fef2f2 8px,#fef2f2 16px)'
          : 'repeating-linear-gradient(45deg,#fffbeb,#fffbeb 8px,#fefce8 8px,#fefce8 16px)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-amber-100 text-amber-700 border border-amber-300">
            {athlete.first_name[0]}{athlete.last_name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#1B2E4B] truncate">
              {athlete.first_name} {athlete.last_name}
            </div>
            <div className="text-xs text-amber-600 truncate">
              ↗ {primaryTeamName}
            </div>
          </div>
        </div>
        <button
          onClick={() => onRemove(athlete.id)}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-sm"
          title="Remove crossover"
        >
          ✕
        </button>
      </div>
      {hasHardViolation && (
        <div className="mt-1 text-xs text-red-600 font-medium">⚠ Violation</div>
      )}
    </div>
  )
}

// ─── Crossover Picker Modal ────────────────────────────────────────────────────

function CrossoverPickerModal({ athlete, availableTeams, onSelect, onClose }) {
  if (!athlete) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-80" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-[#1B2E4B]">Add Crossover</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Which team should <span className="font-medium text-[#1B2E4B]">{athlete.first_name} {athlete.last_name}</span> also be on?
          </p>
        </div>
        <div className="p-3 space-y-2">
          {availableTeams.map(team => (
            <button
              key={team.id}
              onClick={() => onSelect(team.id)}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-colors"
            >
              <div className="font-semibold text-[#1B2E4B] text-sm">{team.name}</div>
              {(team.level || team.age_division || team.tier) && (
                <div className="text-xs text-gray-400 mt-0.5 capitalize">
                  {[team.level && `L${team.level}`, team.age_division, team.tier].filter(Boolean).join(' · ')}
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="px-5 pb-4">
          <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Schedule Warning Banners ─────────────────────────────────────────────────

function ScheduleWarnings({ warnings, onDismiss }) {
  if (warnings.length === 0) return null

  return (
    <div className="px-4 pb-2 space-y-2">
      {warnings.map(w => (
        <div
          key={w.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
            w.type === 'conflict'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          <span className="flex-shrink-0 mt-0.5">{w.type === 'conflict' ? '⚠' : '📅'}</span>
          <span className="flex-1">{w.message}</span>
          <button onClick={() => onDismiss(w.id)} className="flex-shrink-0 opacity-40 hover:opacity-100 ml-1">✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Sortable Athlete Card ─────────────────────────────────────────────────────

function SortableAthleteCard({ athlete, flags, onClick, onCrossover, currentTeamIds, allTeams }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: athlete.id,
    data: { athlete },
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AthleteCard
        athlete={athlete}
        flags={flags}
        isDragging={isDragging}
        onClick={onClick}
        onCrossover={onCrossover}
        currentTeamIds={currentTeamIds}
        allTeams={allTeams}
      />
    </div>
  )
}

// ─── Droppable Zone ───────────────────────────────────────────────────────────

function DroppableZone({ id, children, className }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-[#8b002e] ring-inset' : ''}`}>
      {children}
    </div>
  )
}

// ─── Role Checklist ───────────────────────────────────────────────────────────

function RoleChecklist({ team, athletes }) {
  const reqs = team.practice_requirements?.role_requirements || {}
  if (!Object.values(reqs).some(v => v > 0)) return null
  const roleCounts = { flyer: 0, base: 0, back_spot: 0, front_spot: 0, tumbler: 0 }
  athletes.forEach(a => {
    const allRoles = [...(a.athlete_preferences?.preferred_roles || []), ...(a.athlete_preferences?.open_to_roles || [])]
    allRoles.forEach(r => { if (roleCounts[r] !== undefined) roleCounts[r]++ })
  })
  const roleLabels = { flyer: 'FLY', base: 'BASE', back_spot: 'BS', front_spot: 'FS', tumbler: 'TUM' }
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(reqs).map(([role, needed]) => {
        if (!needed) return null
        const have = roleCounts[role] || 0
        const met = have >= needed
        return (
          <span key={role} className={`text-xs px-1.5 py-0.5 rounded font-medium ${met ? 'bg-green-500/20 text-green-200' : 'bg-red-400/30 text-red-100'}`}>
            {roleLabels[role]} {have}/{needed}
          </span>
        )
      })}
    </div>
  )
}

// ─── Team Column ──────────────────────────────────────────────────────────────

function TeamColumn({ team, athletes, crossoverAthletes, allTeams, athleteTeamMap, athletePrimaryTeamMap, flags, onAthleteClick, isAnchor, onCrossoverClick, onRemoveCrossover }) {
  const allInTeam = [...athletes, ...crossoverAthletes]
  const teamFlags = flags.filter(f => f.team_id === team.id || allInTeam.some(a => a.id === f.athlete_id))
  const hardCount = teamFlags.filter(f => f.type === FLAG_TYPES.HARD_VIOLATION).length
  const softCount = teamFlags.filter(f => f.type === FLAG_TYPES.SOFT_FLAG).length

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      <div className={`rounded-t-xl p-3 ${TIER_COLORS[team.tier] || 'bg-gray-500 text-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm flex items-center gap-1.5">
              {team.name}
              {isAnchor && <span className="text-xs opacity-70">🔒</span>}
            </div>
            <div className="text-xs opacity-70 mt-0.5 capitalize">
              {[team.level && `L${team.level}`, team.age_division, team.tier].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{allInTeam.length}</div>
            <div className="text-xs opacity-70">/{team.max_athletes}</div>
          </div>
        </div>
        <RoleChecklist team={team} athletes={allInTeam} />
        {(hardCount > 0 || softCount > 0) && (
          <div className="flex gap-2 mt-2">
            {hardCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
                {hardCount} violation{hardCount > 1 ? 's' : ''}
              </span>
            )}
            {softCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-400 text-white">
                {softCount} warning{softCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      <SortableContext items={athletes.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <DroppableZone
          id={team.id}
          className="flex-1 bg-gray-50 rounded-b-xl border-2 border-t-0 border-gray-200 p-2 space-y-1.5 min-h-48 overflow-y-auto max-h-[calc(100vh-280px)]"
        >
          {allInTeam.length === 0 && (
            <div className="text-center text-gray-300 text-xs py-6">Drop athletes here</div>
          )}

          {/* Primary athletes — sortable/draggable */}
          {athletes.map(athlete => (
            <SortableAthleteCard
              key={athlete.id}
              athlete={athlete}
              flags={flags}
              onClick={() => onAthleteClick(athlete)}
              onCrossover={onCrossoverClick}
              currentTeamIds={athleteTeamMap[athlete.id] || [team.id]}
              allTeams={allTeams}
            />
          ))}

          {/* Crossover ghost cards */}
          {crossoverAthletes.map(athlete => (
            <CrossoverCard
              key={`xo-${athlete.id}`}
              athlete={athlete}
              primaryTeamName={athletePrimaryTeamMap[athlete.id]?.name || 'Another team'}
              flags={flags}
              onRemove={(athleteId) => onRemoveCrossover(athleteId, team.id)}
            />
          ))}
        </DroppableZone>
      </SortableContext>
    </div>
  )
}

// ─── Athlete Detail Drawer ────────────────────────────────────────────────────

function AthleteDrawer({ athlete, flags, onClose }) {
  if (!athlete) return null
  const athleteFlags = flags.filter(f => f.athlete_id === athlete.id)

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <div className="font-bold text-[#1B2E4B]">{athlete.first_name} {athlete.last_name}</div>
          <div className="text-xs text-gray-400 capitalize">
            {[athlete.age_division, athlete.current_level && `L${athlete.current_level}`, athlete.current_tier].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Height', athlete.height_inches ? `${Math.floor(athlete.height_inches/12)}'${athlete.height_inches%12}"` : '—'],
            ['Level', athlete.current_level ? `Level ${athlete.current_level}` : '—'],
            ['Tier', athlete.current_tier || '—'],
            ['Age Div', athlete.age_division || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#F5F6F7] rounded-lg p-2">
              <div className="text-xs text-gray-400">{label}</div>
              <div className="text-sm font-semibold text-[#1B2E4B] capitalize">{value}</div>
            </div>
          ))}
        </div>
        {athlete.athlete_preferences && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preferences</div>
            <div className="space-y-1.5">
              {athlete.athlete_preferences.preferred_roles?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {athlete.athlete_preferences.preferred_roles.map(r => (
                    <span key={r} className="px-2 py-0.5 bg-[#1B2E4B]/10 text-[#1B2E4B] rounded text-xs capitalize">
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
              {athlete.athlete_preferences.willing_crossover && (
                <div className="text-xs text-green-600">Open to crossover</div>
              )}
            </div>
          </div>
        )}
        {athleteFlags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Flags</div>
            <FlagList flags={athleteFlags} />
          </div>
        )}
        {athlete.notes_public && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</div>
            <div className="text-sm text-gray-600">{athlete.notes_public}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AI Scenarios Modal ───────────────────────────────────────────────────────

function ScenariosModal({ scenarios, onSelect, onClose }) {
  if (!scenarios) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1B2E4B]">AI Team Scenarios</h2>
            <p className="text-sm text-gray-400">Select a scenario to load it into the builder</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {scenarios.scenarios ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.scenarios.map(scenario => (
                <div key={scenario.scenario_id} className="border border-gray-200 rounded-xl p-4 hover:border-[#8b002e] transition-colors">
                  <div className="font-bold text-[#1B2E4B] mb-1">{scenario.scenario_label}</div>
                  <div className="text-xs text-gray-500 mb-3">{scenario.rationale}</div>
                  <div className="space-y-2 mb-4">
                    {scenario.teams?.map(team => (
                      <div key={team.team_name} className="text-xs">
                        <span className="font-semibold text-[#1B2E4B]">{team.team_name}</span>
                        <span className="text-gray-400"> — L{team.level} {team.tier} · {team.athlete_ids?.length || 0} athletes</span>
                        {team.hard_violations?.length > 0 && (
                          <div className="text-red-500">{team.hard_violations.length} violation(s)</div>
                        )}
                        {team.notes && <div className="text-gray-400 italic">{team.notes}</div>}
                      </div>
                    ))}
                  </div>
                  <Button variant="gold" size="sm" className="w-full" onClick={() => onSelect(scenario)}>
                    Use This Scenario
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Could not parse AI response.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Placement Page ──────────────────────────────────────────────────────

export default function PlacementPage() {
  const { gymId } = useAuth()

  const [teams, setTeams] = useState([])
  const [allAthletes, setAllAthletes] = useState([])
  const [roster, setRoster] = useState({})           // teamId -> [athlete, ...]  (primary only)
  const [crossovers, setCrossovers] = useState({})   // teamId -> [athlete, ...]  (crossover only)
  const [unassigned, setUnassigned] = useState([])
  const [flags, setFlags] = useState([])
  const [scheduleWarnings, setScheduleWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeAthlete, setActiveAthlete] = useState(null)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [crossoverPicker, setCrossoverPicker] = useState(null) // { athlete, availableTeams }
  const [generatingScenarios, setGeneratingScenarios] = useState(false)
  const [showParamsModal, setShowParamsModal] = useState(false)
  const [scenarios, setScenarios] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // ── Derived maps ──────────────────────────────────────────────────────────

  // athleteTeamMap: athleteId -> [teamId, ...] (all teams, primary + crossover)
  const athleteTeamMap = useMemo(() => {
    const map = {}
    Object.entries(roster).forEach(([teamId, athletes]) => {
      athletes.forEach(a => {
        if (!map[a.id]) map[a.id] = []
        if (!map[a.id].includes(teamId)) map[a.id].push(teamId)
      })
    })
    Object.entries(crossovers).forEach(([teamId, athletes]) => {
      athletes.forEach(a => {
        if (!map[a.id]) map[a.id] = []
        if (!map[a.id].includes(teamId)) map[a.id].push(teamId)
      })
    })
    return map
  }, [roster, crossovers])

  // athletePrimaryTeamMap: athleteId -> team object (primary team only)
  const athletePrimaryTeamMap = useMemo(() => {
    const map = {}
    Object.entries(roster).forEach(([teamId, athletes]) => {
      const team = teams.find(t => t.id === teamId)
      athletes.forEach(a => { map[a.id] = team })
    })
    return map
  }, [roster, teams])

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!gymId) return
    load()
  }, [gymId])

  async function load() {
    try {
      const [{ data: teamsData }, { data: athletesData }] = await Promise.all([
        supabase.from('teams').select('*').eq('gym_id', gymId).order('name'),
        supabase.from('athletes')
          .select('*, athlete_preferences(*)')
          .eq('gym_id', gymId)
          .eq('status', 'active'),
      ])

      setTeams(teamsData || [])
      setAllAthletes(athletesData || [])

      const { data: assignments } = await supabase
        .from('team_athletes')
        .select('team_id, athlete_id, is_primary_team')
        .eq('gym_id', gymId)
        .eq('status', 'active')

      const rosterMap = {}
      const crossoverMap = {}
      teamsData?.forEach(t => { rosterMap[t.id] = []; crossoverMap[t.id] = [] })

      const assignedIds = new Set()
      assignments?.forEach(a => {
        const athlete = athletesData?.find(ath => ath.id === a.athlete_id)
        if (!athlete) return
        if (a.is_primary_team !== false) {
          if (rosterMap[a.team_id]) {
            rosterMap[a.team_id].push(athlete)
            assignedIds.add(a.athlete_id)
          }
        } else {
          if (crossoverMap[a.team_id]) crossoverMap[a.team_id].push(athlete)
        }
      })

      setRoster(rosterMap)
      setCrossovers(crossoverMap)
      setUnassigned(athletesData?.filter(a => !assignedIds.has(a.id)) || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Rules engine ─────────────────────────────────────────────────────────

  useEffect(() => {
    const newFlags = []
    const seasonYear = new Date().getFullYear()

    const allAssignments = []
    Object.entries(roster).forEach(([teamId, athletes]) => {
      const team = teams.find(t => t.id === teamId)
      athletes.forEach(athlete => allAssignments.push({ athlete_id: athlete.id, team }))
    })
    Object.entries(crossovers).forEach(([teamId, athletes]) => {
      const team = teams.find(t => t.id === teamId)
      athletes.forEach(athlete => allAssignments.push({ athlete_id: athlete.id, team }))
    })

    Object.entries(roster).forEach(([teamId, athletes]) => {
      const team = teams.find(t => t.id === teamId)
      if (!team) return
      const allInTeam = [...athletes, ...(crossovers[teamId] || [])]
      if (allInTeam.length > team.max_athletes) {
        newFlags.push({
          type: FLAG_TYPES.HARD_VIOLATION,
          rule: 'TEAM_SIZE',
          message: `${team.name} has ${allInTeam.length} athletes (max ${team.max_athletes}).`,
          team_id: teamId,
        })
      }
      athletes.forEach(athlete => {
        if (!athlete.date_of_birth) return
        newFlags.push(...runAllChecks({ athlete, team, allAssignments, seasonYear: team.season_year || seasonYear }))
      })
    })

    setFlags(newFlags)
  }, [roster, crossovers, teams])

  // ── Crossover management ──────────────────────────────────────────────────

  function openCrossoverPicker(athlete, availableTeams) {
    setCrossoverPicker({ athlete, availableTeams })
  }

  async function addCrossover(targetTeamId) {
    const { athlete } = crossoverPicker
    setCrossoverPicker(null)

    // Don't add if already a crossover on this team
    if (crossovers[targetTeamId]?.some(a => a.id === athlete.id)) return

    setCrossovers(prev => ({
      ...prev,
      [targetTeamId]: [...(prev[targetTeamId] || []), athlete],
    }))

    // Check for schedule conflicts
    await checkScheduleConflict(athlete, targetTeamId)
  }

  function removeCrossover(athleteId, teamId) {
    setCrossovers(prev => ({
      ...prev,
      [teamId]: (prev[teamId] || []).filter(a => a.id !== athleteId),
    }))
    // Remove any warnings for this pairing
    setScheduleWarnings(prev => prev.filter(w => w.id !== `${athleteId}-${teamId}`))
  }

  async function checkScheduleConflict(athlete, crossoverTeamId) {
    // Find athlete's primary team
    const primaryTeamId = Object.entries(roster).find(([, athletes]) =>
      athletes.some(a => a.id === athlete.id)
    )?.[0]
    if (!primaryTeamId) return

    const primaryTeam = teams.find(t => t.id === primaryTeamId)
    const crossoverTeam = teams.find(t => t.id === crossoverTeamId)
    const warningId = `${athlete.id}-${crossoverTeamId}`

    try {
      const { data: schedules } = await supabase
        .from('practice_schedule')
        .select('*')
        .in('team_id', [primaryTeamId, crossoverTeamId])

      const primarySchedules = schedules?.filter(s => s.team_id === primaryTeamId) || []
      const crossoverSchedules = schedules?.filter(s => s.team_id === crossoverTeamId) || []

      if (primarySchedules.length === 0 || crossoverSchedules.length === 0) {
        setScheduleWarnings(prev => [...prev.filter(w => w.id !== warningId), {
          id: warningId,
          type: 'no_schedule',
          message: `${athlete.first_name} ${athlete.last_name} is on two teams but practice schedules aren't set up yet. Go to Schedule to add practice days — CheerCast will then automatically detect any conflicts.`,
        }])
        return
      }

      const primaryDays = new Set(primarySchedules.map(s => s.day_of_week))
      const conflictDays = crossoverSchedules.filter(s => primaryDays.has(s.day_of_week))
      const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

      if (conflictDays.length > 0) {
        setScheduleWarnings(prev => [...prev.filter(w => w.id !== warningId), {
          id: warningId,
          type: 'conflict',
          message: `⚠ ${athlete.first_name} ${athlete.last_name} has a practice conflict on ${conflictDays.map(c => DAYS[c.day_of_week]).join(', ')} between ${primaryTeam?.name} and ${crossoverTeam?.name}.`,
        }])
      }
    } catch (err) {
      console.error('Schedule check error:', err)
    }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function findAthleteContainer(athleteId) {
    for (const [teamId, athletes] of Object.entries(roster)) {
      if (athletes.find(a => a.id === athleteId)) return teamId
    }
    if (unassigned.find(a => a.id === athleteId)) return 'unassigned'
    return null
  }

  function handleDragStart({ active }) {
    setActiveAthlete(allAthletes.find(a => a.id === active.id) || null)
  }

  function resolveContainer(overId) {
    if (overId === 'unassigned') return 'unassigned'
    if (roster[overId] !== undefined) return overId
    return findAthleteContainer(overId)
  }

  function handleDragEnd({ active, over }) {
    setActiveAthlete(null)
    if (!over) return
    const fromContainer = findAthleteContainer(active.id)
    const toContainer = resolveContainer(over.id)
    if (!fromContainer || !toContainer || fromContainer === toContainer) return

    const athlete = allAthletes.find(a => a.id === active.id)
    if (!athlete) return

    // Remove from source
    if (fromContainer === 'unassigned') {
      setUnassigned(prev => prev.filter(a => a.id !== active.id))
    } else {
      setRoster(prev => ({ ...prev, [fromContainer]: prev[fromContainer].filter(a => a.id !== active.id) }))
    }

    // Add to destination
    if (toContainer === 'unassigned') {
      setUnassigned(prev => [...prev, athlete])
    } else {
      setRoster(prev => ({ ...prev, [toContainer]: [...(prev[toContainer] || []), athlete] }))
    }

    // If athlete had crossovers on the new primary team, clean that up
    if (toContainer !== 'unassigned' && crossovers[toContainer]?.some(a => a.id === athlete.id)) {
      setCrossovers(prev => ({ ...prev, [toContainer]: prev[toContainer].filter(a => a.id !== athlete.id) }))
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function saveRoster() {
    setSaving(true)
    try {
      await supabase.from('team_athletes').delete().eq('gym_id', gymId)

      const inserts = []
      Object.entries(roster).forEach(([teamId, athletes]) => {
        athletes.forEach(athlete => {
          inserts.push({ team_id: teamId, athlete_id: athlete.id, gym_id: gymId, is_primary_team: true, status: 'active' })
        })
      })
      Object.entries(crossovers).forEach(([teamId, athletes]) => {
        athletes.forEach((athlete, idx) => {
          inserts.push({ team_id: teamId, athlete_id: athlete.id, gym_id: gymId, is_primary_team: false, crossover_order: idx + 2, status: 'active' })
        })
      })

      if (inserts.length > 0) await supabase.from('team_athletes').insert(inserts)

      // Update current_team_id to primary team
      for (const [teamId, athletes] of Object.entries(roster)) {
        for (const athlete of athletes) {
          await supabase.from('athletes').update({ current_team_id: teamId }).eq('id', athlete.id)
        }
      }
      for (const athlete of unassigned) {
        await supabase.from('athletes').update({ current_team_id: null }).eq('id', athlete.id)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      alert('Could not save roster. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── AI scenarios ──────────────────────────────────────────────────────────

  async function generateScenarios(params = {}) {
    setShowParamsModal(false)
    setGeneratingScenarios(true)
    try {
      const anchorTeams = teams.filter(t => t.is_anchor_team).map(t => ({ ...t, athletes: roster[t.id] || [] }))
      const result = await generateTeamScenarios({
        athletes: allAthletes.map(a => ({ ...a, current_team: teams.find(t => t.id === a.current_team_id)?.name })),
        anchorTeams,
        parameters: { num_teams: teams.length, season_year: new Date().getFullYear(), requested_teams: params.requested_teams || [], additional_notes: params.notes || '' },
        ruleFlags: flags,
      })
      setScenarios(result)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Could not generate scenarios. Please try again.')
    } finally {
      setGeneratingScenarios(false)
    }
  }

  function applyScenario(scenario) {
    const newRoster = {}
    teams.forEach(t => { newRoster[t.id] = [] })
    const assignedIds = new Set()
    scenario.teams?.forEach(scenarioTeam => {
      const team = teams.find(t => t.name.toLowerCase() === scenarioTeam.team_name?.toLowerCase() || t.id === scenarioTeam.team_id)
      if (!team) return
      scenarioTeam.athlete_ids?.forEach(athleteId => {
        const athlete = allAthletes.find(a => a.id === athleteId)
        if (athlete) { newRoster[team.id].push(athlete); assignedIds.add(athleteId) }
      })
    })
    setRoster(newRoster)
    setCrossovers({})
    setUnassigned(allAthletes.filter(a => !assignedIds.has(a.id)))
    setScenarios(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const crossoverCount = Object.values(crossovers).reduce((sum, arr) => sum + arr.length, 0)
  const hardViolationCount = flags.filter(f => f.type === FLAG_TYPES.HARD_VIOLATION).length
  const softFlagCount = flags.filter(f => f.type === FLAG_TYPES.SOFT_FLAG).length
  const totalAssigned = Object.values(roster).reduce((sum, arr) => sum + arr.length, 0)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading placement builder...</div>
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PageHeader
        title="Placement Builder"
        subtitle={`${allAthletes.length} athletes · ${teams.length} teams · ${crossoverCount > 0 ? `${crossoverCount} crossover${crossoverCount > 1 ? 's' : ''} · ` : ''}${hardViolationCount} violations · ${softFlagCount} warnings`}
        actions={
          <div className="flex items-center gap-2">
            {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
            {hardViolationCount > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                {hardViolationCount} violation{hardViolationCount > 1 ? 's' : ''}
              </span>
            )}
            {softFlagCount > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600">
                {softFlagCount} warning{softFlagCount > 1 ? 's' : ''}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={saveRoster} loading={saving}>Save Roster</Button>
            <Button variant="gold" size="sm" onClick={() => setShowParamsModal(true)} loading={generatingScenarios}>
              ✦ Generate AI Scenarios
            </Button>
          </div>
        }
      />

      <ScheduleWarnings warnings={scheduleWarnings} onDismiss={id => setScheduleWarnings(prev => prev.filter(w => w.id !== id))} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-4 h-full items-start">

            {/* Unassigned pool */}
            <div className="flex flex-col w-64 flex-shrink-0">
              <div className="rounded-t-xl p-3 bg-gray-600 text-white">
                <div className="font-bold text-sm">Unassigned</div>
                <div className="text-xs opacity-70">{unassigned.length} athletes</div>
              </div>
              <SortableContext id="unassigned" items={unassigned.map(a => a.id)} strategy={verticalListSortingStrategy}>
                <DroppableZone id="unassigned" className="bg-gray-50 rounded-b-xl border-2 border-t-0 border-gray-200 p-2 space-y-1.5 min-h-48 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {unassigned.length === 0 && (
                    <div className="text-center text-gray-300 text-xs py-6">All athletes assigned</div>
                  )}
                  {unassigned.map(athlete => (
                    <SortableAthleteCard
                      key={athlete.id}
                      athlete={athlete}
                      flags={flags}
                      onClick={() => setSelectedAthlete(athlete)}
                      currentTeamIds={[]}
                      allTeams={[]}
                    />
                  ))}
                </DroppableZone>
              </SortableContext>
            </div>

            {/* Team columns */}
            {teams.map(team => (
              <SortableContext
                key={team.id}
                id={team.id}
                items={(roster[team.id] || []).map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <TeamColumn
                  team={team}
                  athletes={roster[team.id] || []}
                  crossoverAthletes={crossovers[team.id] || []}
                  allTeams={teams}
                  athleteTeamMap={athleteTeamMap}
                  athletePrimaryTeamMap={athletePrimaryTeamMap}
                  flags={flags}
                  onAthleteClick={setSelectedAthlete}
                  isAnchor={team.is_anchor_team}
                  onCrossoverClick={openCrossoverPicker}
                  onRemoveCrossover={removeCrossover}
                />
              </SortableContext>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeAthlete && <AthleteCard athlete={activeAthlete} flags={flags} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Athlete detail drawer */}
      {selectedAthlete && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setSelectedAthlete(null)} />
          <AthleteDrawer
            athlete={allAthletes.find(a => a.id === selectedAthlete.id)}
            flags={flags}
            onClose={() => setSelectedAthlete(null)}
          />
        </>
      )}

      {/* Crossover picker modal */}
      {crossoverPicker && (
        <CrossoverPickerModal
          athlete={crossoverPicker.athlete}
          availableTeams={crossoverPicker.availableTeams}
          onSelect={addCrossover}
          onClose={() => setCrossoverPicker(null)}
        />
      )}

      {/* Scenario params modal */}
      <ScenarioParamsModal
        open={showParamsModal}
        onClose={() => setShowParamsModal(false)}
        onGenerate={generateScenarios}
        loading={generatingScenarios}
      />

      {/* AI Scenarios modal */}
      {scenarios && (
        <ScenariosModal scenarios={scenarios} onSelect={applyScenario} onClose={() => setScenarios(null)} />
      )}
    </div>
  )
}
