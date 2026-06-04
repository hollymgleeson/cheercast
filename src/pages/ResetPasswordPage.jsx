import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(err.message || 'Could not update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/CheerCast stacked with tag line).png" alt="CheerCast" className="w-72 object-contain mx-auto" />
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✓</div>
              <h2 className="text-xl font-bold text-[#1B2E4B] mb-2">Password updated!</h2>
              <p className="text-sm text-gray-500">Redirecting you to the dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#1B2E4B] mb-6">Set new password</h2>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                    placeholder="At least 8 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                    placeholder="Same password again" />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">Update Password</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
