import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [gymSettings, setGymSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      setProfile(data)
      // Also load gym settings for age division config etc.
      if (data?.gym_id) {
        const { data: gym } = await supabase
          .from('gyms')
          .select('settings')
          .eq('id', data.gym_id)
          .single()
        setGymSettings(gym?.settings || null)
      }
    } catch (err) {
      console.error('Error fetching profile:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    profile,
    gymSettings,
    loading,
    gymId: profile?.gym_id,
    role: profile?.role,
    isOwner: profile?.role === 'owner',
    isCoach: profile?.role === 'coach' || profile?.role === 'owner',
    isEvalOnly: profile?.role === 'eval_only',
    isChoreographer: profile?.role === 'choreographer',
    isAthleteParent: profile?.role === 'athlete_parent',
    ageDivisionConfig: gymSettings?.age_division_config || null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
