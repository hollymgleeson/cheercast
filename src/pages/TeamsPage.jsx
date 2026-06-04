import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTeams } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import AddTeamModal from '../modules/teams/AddTeamModal'

const TIER_COLORS = {
  elite: 'bg-[#1B2E4B] text-white',
  prep: 'bg-[#8b002e] text-white',
  novice: 'bg-gray-200 text-gray-700',
}

export default function TeamsPage() {
  const { gymId } = useAuth()
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gymId) return
    async function load() {
      try {
        const data = await getTeams(gymId)
        setTeams(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gymId])

  return (
    <div>
      <PageHeader
        title="Teams"
        subtitle={`${teams.length} teams this season`}
        actions={<Button variant="gold" onClick={() => setShowAdd(true)}>+ Add Team</Button>}
      />

      <div className="p-8">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">◈</div>
            <div className="font-medium">No teams yet</div>
            <div className="text-sm mt-1">Teams are created through the Placement Builder or added manually.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <div
                key={team.id}
                onClick={() => navigate(`/teams/${team.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[#1B2E4B] text-lg">{team.name}</h3>
                    <div className="text-sm text-gray-500 capitalize mt-0.5">{team.age_division}</div>
                  </div>
                  {team.tier && (
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${TIER_COLORS[team.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                      {team.tier}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  {team.level && <span className="font-medium">Level {team.level}</span>}
                  {team.level && <span>·</span>}
                  <span>{team.team_athletes?.length ?? 0} athletes</span>
                  {team.is_coed && (
                    <>
                      <span>·</span>
                      <span className="text-blue-600 font-medium">Coed</span>
                    </>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                    team.status === 'active' ? 'bg-green-100 text-green-700' :
                    team.status === 'forming' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {team.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddTeamModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={team => {
          setTeams(prev => [...prev, team])
          setShowAdd(false)
        }}
      />
    </div>
  )
}
