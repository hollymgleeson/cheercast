import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getGym, updateGym, supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import SkillsConfigTab from '../modules/settings/SkillsConfigTab'
import TeamMembersTab from '../modules/settings/TeamMembersTab'

const TABS = [
  { id: 'gym', label: 'Gym Profile' },
  { id: 'members', label: 'Team Members' },
  { id: 'skills', label: 'Skills Configuration' },
  { id: 'account', label: 'My Account' },
]

export default function SettingsPage() {
  const { gymId } = useAuth()
  const [tab, setTab] = useState('gym')
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    if (!gymId) return
    async function load() {
      try {
        const data = await getGym(gymId)
        setGym(data)
        setForm({
          name: data.name ?? '',
          owner_name: data.owner_name ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gymId])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateGym(gymId, form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
      />
    </div>
  )

  return (
    <div>
      <PageHeader title="Settings" subtitle="Gym profile, season configuration, and skill customization" />

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

      <div className={`p-8 ${tab === 'gym' ? 'max-w-2xl' : ''}`}>
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Gym Profile Tab */}
            {tab === 'gym' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-[#1B2E4B] mb-4">Gym Profile</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                    {field('Gym Name', 'name')}
                    {field('Owner / Director Name', 'owner_name')}
                    {field('Contact Email', 'email', 'email')}
                    {field('Phone', 'phone', 'tel')}
                    {field('Address', 'address')}
                    <div className="flex items-center gap-3 pt-2">
                      <Button type="submit" loading={saving}>Save Changes</Button>
                      {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
                    </div>
                  </form>
                </div>

                {/* Gym type settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-[#1B2E4B] mb-1">Gym Type</h3>
                  <p className="text-sm text-gray-400 mb-4">Controls which features are shown throughout the app.</p>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gym?.settings?.hide_tiers !== true}
                        onChange={async e => {
                          const updated = await updateGym(gymId, {
                            settings: { ...(gym.settings || {}), hide_tiers: !e.target.checked }
                          })
                          setGym(g => ({ ...g, settings: { ...(g.settings || {}), hide_tiers: !e.target.checked } }))
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#8b002e] focus:ring-[#8b002e]"
                      />
                      <div>
                        <div className="text-sm font-medium text-[#1B2E4B]">Use Elite / Prep / Novice tiers</div>
                        <div className="text-xs text-gray-400 mt-0.5">Turn off for rec gyms that don't use competitive tier classifications</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members Tab */}
            {tab === 'members' && <TeamMembersTab />}

            {/* Skills Configuration Tab */}
            {tab === 'skills' && <SkillsConfigTab />}

            {/* My Account Tab */}
            {tab === 'account' && <AccountTab />}
          </>
        )}
      </div>
    </div>
  )
}

function AccountTab() {
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    if (pwForm.next.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.')
      return
    }

    setPwSaving(true)
    try {
      // Re-authenticate with current password first
      const { data: { user } } = await supabase.auth.getUser()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwForm.current,
      })
      if (signInError) {
        setPwError('Current password is incorrect.')
        return
      }

      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error

      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 4000)
    } catch (err) {
      setPwError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-[#1B2E4B] mb-1">Change Password</h3>
        <p className="text-sm text-gray-400 mb-5">Choose a strong password of at least 8 characters.</p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { label: 'Current Password', key: 'current' },
            { label: 'New Password', key: 'next' },
            { label: 'Confirm New Password', key: 'confirm' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="password"
                value={pwForm[key]}
                onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2E4B]"
                required
              />
            </div>
          ))}

          {pwError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
              Password updated successfully!
            </div>
          )}

          <div className="pt-1">
            <Button type="submit" loading={pwSaving}>Update Password</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
