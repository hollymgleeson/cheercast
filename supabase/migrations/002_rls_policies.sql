-- CheerCast Row Level Security Policies
-- Every table restricts all operations to matching gym_id

-- ─── ENABLE RLS ON ALL TABLES ────────────────────────────────────────────────

alter table gyms enable row level security;
alter table user_profiles enable row level security;
alter table skills enable row level security;
alter table athletes enable row level security;
alter table athlete_preferences enable row level security;
alter table athlete_skills enable row level security;
alter table teams enable row level security;
alter table team_athletes enable row level security;
alter table eval_sessions enable row level security;
alter table eval_scores enable row level security;
alter table eval_groups enable row level security;
alter table athlete_anonymous_numbers enable row level security;
alter table competitions enable row level security;
alter table performance_notes enable row level security;
alter table practice_schedule enable row level security;
alter table attendance enable row level security;

-- ─── HELPER FUNCTION ─────────────────────────────────────────────────────────

-- Returns the gym_id for the current user
create or replace function auth_gym_id()
returns uuid as $$
  select gym_id from user_profiles where id = auth.uid()
$$ language sql security definer stable;

-- Returns the role for the current user
create or replace function auth_role()
returns text as $$
  select role from user_profiles where id = auth.uid()
$$ language sql security definer stable;

-- ─── GYMS ────────────────────────────────────────────────────────────────────

create policy "Users can view their own gym"
  on gyms for select
  using (id = auth_gym_id());

create policy "Owners can update their gym"
  on gyms for update
  using (id = auth_gym_id() and auth_role() = 'owner');

-- ─── USER PROFILES ───────────────────────────────────────────────────────────

create policy "Users can view profiles in their gym"
  on user_profiles for select
  using (gym_id = auth_gym_id() or id = auth.uid());

create policy "Users can update their own profile"
  on user_profiles for update
  using (id = auth.uid());

create policy "Owners can update any profile in their gym"
  on user_profiles for update
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

create policy "Owners can insert profiles in their gym"
  on user_profiles for insert
  with check (gym_id = auth_gym_id() and auth_role() = 'owner');

-- ─── SKILLS (global read, no gym restriction) ────────────────────────────────

create policy "Anyone authenticated can read skills"
  on skills for select
  using (auth.uid() is not null);

-- ─── ATHLETES ────────────────────────────────────────────────────────────────

create policy "Gym members can view athletes"
  on athletes for select
  using (gym_id = auth_gym_id());

create policy "Owners and coaches can insert athletes"
  on athletes for insert
  with check (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));

create policy "Owners and coaches can update athletes"
  on athletes for update
  using (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));

create policy "Owners can delete athletes"
  on athletes for delete
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

-- ─── ATHLETE PREFERENCES ─────────────────────────────────────────────────────

create policy "Gym members can view preferences"
  on athlete_preferences for select
  using (gym_id = auth_gym_id());

create policy "Owners coaches athletes can upsert preferences"
  on athlete_preferences for insert
  with check (gym_id = auth_gym_id());

create policy "Owners coaches athletes can update preferences"
  on athlete_preferences for update
  using (gym_id = auth_gym_id());

-- ─── ATHLETE SKILLS ──────────────────────────────────────────────────────────

create policy "Gym members can view athlete skills"
  on athlete_skills for select
  using (gym_id = auth_gym_id());

create policy "Owners and coaches can insert athlete skills"
  on athlete_skills for insert
  with check (gym_id = auth_gym_id() and auth_role() in ('owner','coach','eval_only'));

create policy "Owners and coaches can update athlete skills"
  on athlete_skills for update
  using (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));

-- ─── TEAMS ───────────────────────────────────────────────────────────────────

create policy "Gym members can view teams"
  on teams for select
  using (gym_id = auth_gym_id());

create policy "Owners can manage teams"
  on teams for all
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

-- ─── TEAM ATHLETES ───────────────────────────────────────────────────────────

create policy "Gym members can view team athletes"
  on team_athletes for select
  using (gym_id = auth_gym_id());

create policy "Owners can manage team athletes"
  on team_athletes for all
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

create policy "Coaches can update routine roles"
  on team_athletes for update
  using (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));

-- ─── EVAL SESSIONS ───────────────────────────────────────────────────────────

create policy "Gym members can view eval sessions"
  on eval_sessions for select
  using (gym_id = auth_gym_id());

create policy "Owners can manage eval sessions"
  on eval_sessions for all
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

-- ─── EVAL SCORES ─────────────────────────────────────────────────────────────

create policy "Gym members can view eval scores"
  on eval_scores for select
  using (gym_id = auth_gym_id());

create policy "Evaluators can insert scores"
  on eval_scores for insert
  with check (gym_id = auth_gym_id() and auth_role() in ('owner','coach','eval_only'));

create policy "Evaluators can update scores"
  on eval_scores for update
  using (gym_id = auth_gym_id() and auth_role() in ('owner','coach','eval_only'));

create policy "Owners can delete scores"
  on eval_scores for delete
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

-- ─── EVAL GROUPS ─────────────────────────────────────────────────────────────

create policy "Gym members can view eval groups"
  on eval_groups for select
  using (gym_id = auth_gym_id());

create policy "Owners and coaches can manage eval groups"
  on eval_groups for all
  using (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));

-- ─── ANONYMOUS NUMBERS ───────────────────────────────────────────────────────

create policy "Gym members can view anonymous numbers"
  on athlete_anonymous_numbers for select
  using (gym_id = auth_gym_id());

create policy "Owners can manage anonymous numbers"
  on athlete_anonymous_numbers for all
  using (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));

-- ─── COMPETITIONS ────────────────────────────────────────────────────────────

create policy "Gym members can view competitions"
  on competitions for select
  using (gym_id = auth_gym_id());

create policy "Owners can manage competitions"
  on competitions for all
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

-- ─── PERFORMANCE NOTES ───────────────────────────────────────────────────────

create policy "Owners see all notes"
  on performance_notes for select
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

create policy "Coaches see coaches_owner and public notes"
  on performance_notes for select
  using (gym_id = auth_gym_id() and auth_role() = 'coach' and visibility in ('coaches_owner','public'));

create policy "Athletes and parents see public notes for their athlete"
  on performance_notes for select
  using (
    gym_id = auth_gym_id()
    and auth_role() = 'athlete_parent'
    and visibility = 'public'
    and athlete_id in (
      select athlete_id from user_profiles where id = auth.uid()
    )
  );

create policy "Owners and coaches can insert notes"
  on performance_notes for insert
  with check (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));

create policy "Authors can update their own notes"
  on performance_notes for update
  using (gym_id = auth_gym_id() and author_id = auth.uid());

-- ─── PRACTICE SCHEDULE ───────────────────────────────────────────────────────

create policy "Gym members can view schedule"
  on practice_schedule for select
  using (gym_id = auth_gym_id());

create policy "Owners can manage schedule"
  on practice_schedule for all
  using (gym_id = auth_gym_id() and auth_role() = 'owner');

-- ─── ATTENDANCE ──────────────────────────────────────────────────────────────

create policy "Gym members can view attendance"
  on attendance for select
  using (gym_id = auth_gym_id());

create policy "Owners and coaches can manage attendance"
  on attendance for all
  using (gym_id = auth_gym_id() and auth_role() in ('owner','coach'));
