import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAthletes } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import AddAthleteModal from '../modules/athletes/AddAthleteModal'
import ImportAthletesModal from '../modules/athletes/ImportAthletesModal'

const TIER_COLORS = {
  elite: 'bg-[#1B2E4B] text-white',
  prep: 'bg-[#8b002e] text-white',
  novice: 'bg-gray-200 text-gray-700',
}

export default function AthletesPage() {
  const { gymId } = useAuth()
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    if (!gymId) return
    async function load() {
      try {
        const data = await getAthletes(gymId, { status: filterStatus || undefined })
        setAthletes(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gymId, filterStatus])

  const filtered = athletes.filter(a => {
    const name = `${a.first_name} ${a.last_name}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div>
      <PageHeader
        title="Athletes"
        subtitle={`${athletes.length} athletes on roster`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>Import CSV</Button>
            <Button variant="gold" onClick={() => setShowAdd(true)}>+ Add Athlete</Button>
          </div>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search athletes..."
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] w-64"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="injured">Injured</option>
            <option value="">All</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading athletes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">◎</div>
            <div className="font-medium">No athletes found</div>
            <div className="text-sm mt-1">Add your first athlete to get started.</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-[#F5F6F7]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Athlete</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Age Div</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Level / Tier</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Team</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(athlete => (
                  <tr key={athlete.id} className="hover:bg-[#F5F6F7] transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1B2E4B]/10 flex items-center justify-center text-[#1B2E4B] font-bold text-sm flex-shrink-0">
                          {athlete.first_name[0]}{athlete.last_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1B2E4B] text-sm">{athlete.first_name} {athlete.last_name}</div>
                          <div className="text-xs text-gray-400">{athlete.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 capitalize">{athlete.age_division ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {athlete.current_level && (
                          <span className="text-sm font-medium text-[#1B2E4B]">L{athlete.current_level}</span>
                        )}
                        {athlete.current_tier && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${TIER_COLORS[athlete.current_tier] ?? 'bg-gray-100 text-gray-600'}`}>
                            {athlete.current_tier}
                          </span>
                        )}
                        {!athlete.current_level && !athlete.current_tier && (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{athlete.current_team?.name ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        athlete.status === 'active' ? 'bg-green-100 text-green-700' :
                        athlete.status === 'injured' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {athlete.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/athletes/${athlete.id}`)}
                        className="text-sm text-[#8b002e] font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddAthleteModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(newAthlete) => {
          setAthletes(prev => [newAthlete, ...prev])
        }}
      />

      <ImportAthletesModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={(count) => {
          setLoading(true)
          getAthletes(gymId, { status: filterStatus || undefined })
            .then(data => { setAthletes(data); setLoading(false) })
        }}
      />
    </div>
  )
}
