import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'

export default function JoinPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState(null)
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', password: '', confirm: '' })
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function loadInvite() {
      try {
        const { data: inviteData, error: inviteErr } = await supabase
          .from('gym_invites')
          .select('*, gym:gyms(name)')
          .eq('token', token)
          .is('used_at', null)
          .single()

        if (inviteErr || !inviteData) {
          setError('This invite link is invalid or has already been used.')
          return
        }

        if (new Date(inviteData.expires_at) < new Date()) {
          setError('This invite link has expired. Please ask your gym owner for a new one.')
          return
        }

        setInvite(inviteData)
        setGym(inviteData.gym)
      } catch (err) {
        setError('Could not load invite. Please check the link and try again.')
      } finally {
        setLoading(false)
      }
    }
    loadInvite()
  }, [token])

  async function handleJoin(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setJoining(true)
    setError('')

    try {
      // Sign up the user
      const { data: authData, error: signupErr } = await supabase.auth.signUp({
        email: invite.email,
        password: form.password,
        options: { data: { full_name: form.name, role: invite.role } },
      })

      if (signupErr) throw signupErr

      const userId = authData.user?.id
      if (!userId) throw new Error('Could not create account.')

      // Link to gym
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          gym_id: invite.gym_id,
          full_name: form.name,
          role: invite.role,
        })
      if (profileErr) throw profileErr

      // Mark invite as used
      await supabase
        .from('gym_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)

      // Sign in
      await supabase.auth.signInWithPassword({ email: invite.email, password: form.password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F7] flex items-center justify-center">
        <div className="text-gray-400">Loading invite...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/CheerCast stacked with tag line).png" alt="CheerCast" className="w-56 object-contain mx-auto" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {error && !invite ? (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠</div>
              <div className="font-bold text-[#1B2E4B] mb-2">Invalid Invite</div>
              <div className="text-sm text-gray-500">{error}</div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#1B2E4B]">You've been invited!</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-[#1B2E4B]">{gym?.name}</span> has invited you to join CheerCast as a{' '}
                  <span className="font-semibold text-[#8b002e] capitalize">{invite?.role?.replace(/_/g, ' ')}</span>.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="Your full name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={invite?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    required
                    placeholder="Same password again"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                  />
                </div>
                <Button type="submit" loading={joining} className="w-full" size="lg">
                  Join {gym?.name}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">CheerCast by Gleeson Consulting</p>
      </div>
    </div>
  )
}
