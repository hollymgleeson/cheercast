import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAthletes, getTeams, getEvalSessions, getCompetitions } from '../lib/supabase'
import PageHeader from '../components/PageHeader'

function StatCard({ label, value, sub, color = 'navy', linkTo }) {
  const card = (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow`}>
      <div className="text-3xl font-bold text-[#1B2E4B]">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
  if (linkTo) return <Link to={linkTo}>{card}</Link>
  return card
}

export default function DashboardPage() {
  const { gymId, profile } = useAuth()
  const [stats, setStats] = useState({ athletes: 0, teams: 0, evals: [], competitions: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gymId) return
    async function load() {
      try {
        const [athletes, teams, evals, comps] = await Promise.all([
          getAthletes(gymId, { status: 'active' }),
          getTeams(gymId),
          getEvalSessions(gymId),
          getCompetitions(gymId),
        ])
        setStats({ athletes: athletes.length, teams: teams.length, evals, competitions: comps })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gymId])

  const upcomingComps = stats.competitions
    .filter(c => new Date(c.date_start) >= new Date())
    .slice(0, 3)

  const activeEval = stats.evals.find(e => e.status === 'active' || e.status === 'scoring')

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(' ')[0] ?? 'Coach'}`}
        subtitle="Here is what is happening at your gym today."
      />

      <div className="p-8 space-y-8">
        {/* Active eval banner */}
        {activeEval && (
          <Link to="/evaluations">
            <div className="bg-[#8b002e] rounded-xl p-4 flex items-center justify-between text-white">
              <div>
                <div className="font-bold text-lg">Evaluation Session Active</div>
                <div className="text-sm opacity-80">
                  Round {activeEval.round} — {activeEval.eval_date}
                </div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </Link>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Athletes" value={loading ? '...' : stats.athletes} sub="on roster" linkTo="/athletes" />
          <StatCard label="Teams" value={loading ? '...' : stats.teams} sub="this season" linkTo="/teams" />
          <StatCard label="Eval Sessions" value={loading ? '...' : stats.evals.length} sub="this season" linkTo="/evaluations" />
          <StatCard label="Competitions" value={loading ? '...' : stats.competitions.length} sub="on calendar" linkTo="/competitions" />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming competitions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-[#1B2E4B] mb-4">Upcoming Competitions</h3>
            {upcomingComps.length === 0 ? (
              <p className="text-sm text-gray-400">No competitions scheduled yet.</p>
            ) : (
              <div className="space-y-3">
                {upcomingComps.map(comp => (
                  <div key={comp.id} className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1B2E4B]">{comp.name}</div>
                      <div className="text-xs text-gray-400">{comp.location}</div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {new Date(comp.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/competitions" className="block mt-4 text-xs text-[#8b002e] font-semibold hover:underline">
              View all competitions
            </Link>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-[#1B2E4B] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/athletes" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F5F6F7] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-[#1B2E4B]/10 flex items-center justify-center text-[#1B2E4B] group-hover:bg-[#1B2E4B] group-hover:text-white transition-colors">
                  +
                </div>
                <span className="text-sm font-medium text-gray-700">Add athlete</span>
              </Link>
              <Link to="/evaluations" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F5F6F7] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-[#1B2E4B]/10 flex items-center justify-center text-[#1B2E4B] group-hover:bg-[#1B2E4B] group-hover:text-white transition-colors">
                  ✦
                </div>
                <span className="text-sm font-medium text-gray-700">Start evaluation</span>
              </Link>
              <Link to="/placement" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F5F6F7] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-[#1B2E4B]/10 flex items-center justify-center text-[#1B2E4B] group-hover:bg-[#1B2E4B] group-hover:text-white transition-colors">
                  ⊞
                </div>
                <span className="text-sm font-medium text-gray-700">Open placement builder</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
