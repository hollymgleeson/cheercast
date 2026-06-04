import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email. Please try again.')
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

          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-bold text-[#1B2E4B] mb-6">Sign in to your account</h2>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                    placeholder="you@yourgym.com"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError('') }}
                      className="text-xs text-[#8b002e] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">Sign in</Button>
              </form>
            </>
          ) : resetSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📧</div>
              <h2 className="text-xl font-bold text-[#1B2E4B] mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 mb-6">We sent a password reset link to <strong>{email}</strong>. Click the link in that email to set a new password.</p>
              <button onClick={() => { setMode('login'); setResetSent(false) }} className="text-sm text-[#8b002e] hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => { setMode('login'); setError('') }} className="text-gray-400 hover:text-gray-600">←</button>
                <h2 className="text-xl font-bold text-[#1B2E4B]">Reset your password</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Enter your email and we'll send you a link to reset your password.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b002e]"
                    placeholder="you@yourgym.com"
                  />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">Send Reset Link</Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">CheerCast by Gleeson Consulting</p>
      </div>
    </div>
  )
}
