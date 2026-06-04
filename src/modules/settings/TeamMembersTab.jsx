import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Button from '../../components/Button'

const ROLE_LABELS = {
  owner: 'Owner',
  coach: 'Coach',
  eval_only: 'Evaluator Only',
  choreographer: 'Choreographer',
  athlete_parent: 'Athlete/Parent',
}

const ROLE_COLORS = {
  owner: 'bg-[#8b002e] text-white',
  coach: 'bg-[#1B2E4B] text-white',
  eval_only: 'bg-blue-100 text-blue-700',
  choreographer: 'bg-purple-100 text-purple-700',
  athlete_parent: 'bg-gray-100 text-gray-600',
}

export default function TeamMembersTab() {
  const { gymId, user } = useAuth()
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('coach')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (!gymId) return
    load()
  }, [gymId])

  async function load() {
    try {
      const [{ data: profileData }, { data: inviteData }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('gym_id', gymId),
        supabase.from('gym_invites').select('*').eq('gym_id', gymId).is('used_at', null).order('created_at', { ascending: false }),
      ])
      setMembers(profileData || [])
      setInvites(inviteData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function createInvite(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('gym_invites')
        .insert({ gym_id: gymId, email: inviteEmail, role: inviteRole, invited_by: user.id })
        .select()
        .single()
      if (error) throw error
      setInvites(prev => [data, ...prev])
      setInviteEmail('')
      setShowInvite(false)
      // Auto-copy the link
      copyLink(data)
    } catch (err) {
      console.error(err)
      alert('Could not create invite. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  function getInviteLink(invite) {
    const base = window.location.origin
    return `${base}/join/${invite.token}`
  }

  function copyLink(invite) {
    navigator.clipboard.writeText(getInviteLink(invite))
    setCopiedId(invite.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function revokeInvite(inviteId) {
    if (!confirm('Revoke this invite?')) return
    await supabase.from('gym_invites').delete().eq('id', inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  async function updateMemberRole(memberId, newRole) {
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
  }

  async function removeMember(memberId) {
    if (!confirm('Remove this team member? They will lose access to CheerCast.')) return
    await supabase.from('user_profiles').update({ gym_id: null }).eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading team members...</div>

  return (
    <div className="space-y-6">
      {/* Current members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-[#1B2E4B]">Team Members ({members.length})</h3>
          <Button variant="gold" size="sm" onClick={() => setShowInvite(!showInvite)}>
            + Invite Someone
          </Button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="px-6 py-4 bg-[#F5F6F7] border-b border-gray-100">
            <form onSubmit={createInvite} className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  placeholder="coach@yourgym.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={creating} size="sm">Create Invite Link</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
            </form>
            <p className="text-xs text-gray-400 mt-2">
              An invite link will be generated. Copy and send it to them -- no email required.
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#8b002e]/10 flex items-center justify-center text-[#8b002e] font-bold text-sm">
                  {member.full_name?.[0] ?? '?'}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#1B2E4B]">{member.full_name || 'Unnamed user'}</div>
                  {member.id === user?.id && (
                    <div className="text-xs text-gray-400">You</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.id === user?.id ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={e => updateMemberRole(member.id, e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#8b002e]"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                )}
                {member.id !== user?.id && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#1B2E4B]">Pending Invites ({invites.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <div className="text-sm font-medium text-[#1B2E4B]">{invite.email}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {ROLE_LABELS[invite.role]} · Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(invite)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      copiedId === invite.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-[#1B2E4B]/10 text-[#1B2E4B] hover:bg-[#1B2E4B] hover:text-white'
                    }`}
                  >
                    {copiedId === invite.id ? '✓ Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role guide */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-[#1B2E4B] mb-3 text-sm">Role Permissions</h3>
        <div className="space-y-2">
          {[
            { role: 'owner', desc: 'Full access. Can manage team members, settings, billing, and all data.' },
            { role: 'coach', desc: 'Can score evals, add athlete notes, update skills and routine roles.' },
            { role: 'eval_only', desc: 'Can score athletes during active eval sessions only. No other access.' },
            { role: 'choreographer', desc: 'Read-only access to choreography reports for assigned teams.' },
            { role: 'athlete_parent', desc: 'Can view their own athlete\'s profile, schedule, and public notes.' },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 mt-0.5 ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
              <span className="text-sm text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
