import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import DemoTour from './DemoTour'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { path: '/athletes', label: 'Athletes', icon: '◎' },
  { path: '/evaluations', label: 'Evaluations', icon: '✦' },
  { path: '/teams', label: 'Teams', icon: '◈' },
  { path: '/placement', label: 'Placement', icon: '⊞' },
  { path: '/schedule', label: 'Schedule', icon: '◷' },
  { path: '/competitions', label: 'Competitions', icon: '★' },
  { path: '/reports', label: 'Reports', icon: '◫' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout({ children }) {
  const { profile, role } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Filter nav based on role
  const visibleNav = NAV_ITEMS.filter(item => {
    if (role === 'choreographer') return ['/reports'].includes(item.path)
    if (role === 'athlete_parent') return ['/dashboard', '/athletes', '/schedule', '/competitions'].includes(item.path)
    if (role === 'eval_only') return ['/evaluations'].includes(item.path)
    return true
  })

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white flex flex-col shadow-lg border-r border-gray-100">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-center">
          <img src="/CheerCast stacked with tag line).png" alt="CheerCast" className="w-36 object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#8b002e] text-white'
                    : 'text-[#1B2E4B] hover:bg-[#F5F6F7]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User area */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#8b002e]/10 flex items-center justify-center text-[#8b002e] font-semibold text-sm">
              {profile?.full_name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#1B2E4B] text-sm font-medium truncate">{profile?.full_name ?? 'User'}</div>
              <div className="text-gray-400 text-xs capitalize">{role ?? ''}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-2 px-3 py-2 text-gray-400 hover:text-[#8b002e] text-xs text-left rounded-lg hover:bg-[#F5F6F7] transition-all"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Demo tour */}
      <DemoTour />
    </div>
  )
}
