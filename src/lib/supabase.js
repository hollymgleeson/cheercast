import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ─── Gyms ────────────────────────────────────────────────────────────────────

export async function getGym(gymId) {
  const { data, error } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', gymId)
    .single()
  if (error) throw error
  return data
}

export async function updateGym(gymId, updates) {
  const { data, error } = await supabase
    .from('gyms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', gymId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Athletes ────────────────────────────────────────────────────────────────

export async function getAthletes(gymId, filters = {}) {
  let query = supabase
    .from('athletes')
    .select('*, athlete_preferences(*), current_team:teams(id, name, level, tier)')
    .eq('gym_id', gymId)
    .order('last_name')

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.team_id) query = query.eq('current_team_id', filters.team_id)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAthlete(athleteId) {
  const { data, error } = await supabase
    .from('athletes')
    .select('*, athlete_preferences(*), athlete_skills(*, skill:skills(*))')
    .eq('id', athleteId)
    .single()
  if (error) throw error
  return data
}

export async function createAthlete(athleteData) {
  const { data, error } = await supabase
    .from('athletes')
    .insert(athleteData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAthlete(athleteId, updates) {
  const { data, error } = await supabase
    .from('athletes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', athleteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export async function getTeams(gymId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_athletes(athlete_id)')
    .eq('gym_id', gymId)
    .order('name')
  if (error) throw error
  return data
}

export async function getTeam(teamId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_athletes(*, athlete:athletes(*))')
    .eq('id', teamId)
    .single()
  if (error) throw error
  return data
}

export async function createTeam(teamData) {
  const { data, error } = await supabase
    .from('teams')
    .insert(teamData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTeam(teamId, updates) {
  const { data, error } = await supabase
    .from('teams')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Eval Sessions ───────────────────────────────────────────────────────────

export async function getEvalSessions(gymId) {
  const { data, error } = await supabase
    .from('eval_sessions')
    .select('*')
    .eq('gym_id', gymId)
    .order('eval_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createEvalSession(sessionData) {
  const { data, error } = await supabase
    .from('eval_sessions')
    .insert(sessionData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvalSession(sessionId, updates) {
  const { data, error } = await supabase
    .from('eval_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Eval Scores ─────────────────────────────────────────────────────────────

export async function upsertEvalScore(scoreData) {
  const { data, error } = await supabase
    .from('eval_scores')
    .upsert(scoreData, { onConflict: 'eval_session_id,athlete_id,skill_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getEvalScores(sessionId) {
  const { data, error } = await supabase
    .from('eval_scores')
    .select('*, athlete:athletes(id, first_name, last_name), skill:skills(*)')
    .eq('eval_session_id', sessionId)
  if (error) throw error
  return data
}

// ─── Skills ──────────────────────────────────────────────────────────────────

export async function getSkills(filters = {}) {
  let query = supabase.from('skills').select('*').order('category').order('level_min').order('name')
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.level_min) query = query.lte('level_min', filters.level_min)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ─── Competitions ────────────────────────────────────────────────────────────

export async function getCompetitions(gymId) {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('gym_id', gymId)
    .order('date_start')
  if (error) throw error
  return data
}

export async function createCompetition(competitionData) {
  const { data, error } = await supabase
    .from('competitions')
    .insert(competitionData)
    .select()
    .single()
  if (error) throw error
  return data
}
