-- CheerCast Initial Schema
-- Phase 1 — All tables from BRIEF Section 4

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── GYMS ────────────────────────────────────────────────────────────────────

create table gyms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_name text,
  email text,
  phone text,
  address text,
  facilities jsonb default '[]',
  elite_athlete_count int default 0,
  subscription_tier text default 'design_partner' check (subscription_tier in ('design_partner','active','inactive')),
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── USER PROFILES ────────────────────────────────────────────────────────────
-- One row per auth user. Created by trigger on auth.users insert.

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid references gyms(id) on delete cascade,
  full_name text,
  role text not null default 'coach' check (role in ('owner','coach','eval_only','choreographer','athlete_parent')),
  athlete_id uuid, -- for athlete_parent role: which athlete they belong to
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── SKILLS MASTER LIST ───────────────────────────────────────────────────────

create table skills (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null check (category in (
    'tumbling_standing','tumbling_running',
    'stunt_two_leg','stunt_one_leg',
    'basket_toss','jump',
    'flying','back_spot','front_spot','base'
  )),
  level_min int not null check (level_min between 1 and 7),
  level_max int not null check (level_max between 1 and 7),
  tier text default 'level_appropriate' check (tier in ('level_appropriate','advanced','elite')),
  usasf_allowed_tiers jsonb default '["elite","prep","novice"]',
  description text,
  prerequisite_skill_ids jsonb default '[]',
  is_thin_division_flag boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ATHLETES ────────────────────────────────────────────────────────────────

create table athletes (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  email text,
  parent_name text,
  parent_email text,
  phone text,
  height_inches int,
  weight_lbs int,
  still_growing boolean default false,
  years_at_gym int default 0,
  join_date date,
  status text default 'active' check (status in ('active','inactive','injured','withdrawn')),
  profile_photo_url text,
  current_team_id uuid,
  current_level text,
  current_tier text check (current_tier in ('elite','prep','novice') or current_tier is null),
  age_division text check (age_division in ('tiny','mini','pee_wee','youth','junior','senior','open') or age_division is null),
  notes_coach_private text,
  notes_owner_private text,
  notes_public text,
  attendance_score decimal(5,2) default 0,
  competition_etiquette_score decimal(5,2) default 0,
  performance_badges jsonb default '[]',
  badge_bonus_points int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ATHLETE PREFERENCES ─────────────────────────────────────────────────────

create table athlete_preferences (
  athlete_id uuid primary key references athletes(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  preferred_roles jsonb default '[]',
  open_to_roles jsonb default '[]',
  preferred_tier text check (preferred_tier in ('elite','prep','either') or preferred_tier is null),
  willing_crossover boolean default false,
  preferred_friends jsonb default '[]',
  age_preference text default 'no_preference' check (age_preference in ('same_age','older','no_preference')),
  priority text default 'no_preference' check (priority in ('flying','day_of_week','friends','level_advancement','no_preference')),
  unavailable_dates jsonb default '[]',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ATHLETE SKILLS ──────────────────────────────────────────────────────────

create table athlete_skills (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  status text default 'not_attempted' check (status in ('not_attempted','in_progress','inconsistent','mastered','lost')),
  eval_score int check (eval_score between 1 and 5 or eval_score is null),
  performance_flag text check (performance_flag in ('performance_star','performance_ready','avoid_performance') or performance_flag is null),
  coach_notes text,
  private_lesson_notes text,
  last_updated timestamptz default now(),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(athlete_id, skill_id)
);

-- ─── TEAMS ───────────────────────────────────────────────────────────────────

create table teams (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  level text,
  tier text check (tier in ('elite','prep','novice') or tier is null),
  age_division text check (age_division in ('tiny','mini','pee_wee','youth','junior','senior','open') or age_division is null),
  is_coed boolean default false,
  season_year int default extract(year from now()),
  status text default 'forming' check (status in ('forming','active','competing','complete')),
  head_coach_id uuid references auth.users(id),
  assistant_coach_ids jsonb default '[]',
  max_athletes int default 30,
  min_athletes int default 5,
  practice_requirements jsonb default '{}',
  competition_schedule jsonb default '[]',
  routine_duration_seconds int,
  is_anchor_team boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add FK from athletes.current_team_id now that teams exists
alter table athletes add constraint fk_athletes_current_team
  foreign key (current_team_id) references teams(id) on delete set null;

-- ─── TEAM ATHLETES (junction) ────────────────────────────────────────────────

create table team_athletes (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  is_primary_team boolean default true,
  crossover_order int check (crossover_order between 1 and 3 or crossover_order is null),
  routine_roles jsonb default '[]',
  joined_date date default current_date,
  status text default 'active' check (status in ('active','injured','suspended','withdrawn')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(team_id, athlete_id)
);

-- ─── EVAL SESSIONS ───────────────────────────────────────────────────────────

create table eval_sessions (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  season_year int not null default extract(year from now()),
  round int not null check (round in (1,2)),
  status text default 'scheduled' check (status in ('scheduled','active','scoring','complete')),
  eval_date date,
  notes text,
  ai_report_generated boolean default false,
  ai_report jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── EVAL SCORES ─────────────────────────────────────────────────────────────

create table eval_scores (
  id uuid primary key default uuid_generate_v4(),
  eval_session_id uuid not null references eval_sessions(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  evaluator_id uuid references auth.users(id),
  score int check (score between 1 and 5 or score is null),
  is_excluded boolean default false,
  exclude_reason text,
  weight_override decimal(3,2) default 1.0,
  video_url text,
  notes text,
  created_at timestamptz default now(),
  unique(eval_session_id, athlete_id, skill_id)
);

-- ─── EVAL GROUPS (Round 2) ───────────────────────────────────────────────────

create table eval_groups (
  id uuid primary key default uuid_generate_v4(),
  eval_session_id uuid not null references eval_sessions(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  group_number int not null,
  time_slot text,
  athlete_ids jsonb default '[]',
  roles_assigned jsonb default '[]',
  notes text,
  rotation_sequence int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ATHLETE ANONYMOUS NUMBERS ───────────────────────────────────────────────

create table athlete_anonymous_numbers (
  eval_session_id uuid not null references eval_sessions(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  number int not null,
  created_at timestamptz default now(),
  primary key (eval_session_id, athlete_id)
);

-- ─── COMPETITIONS ────────────────────────────────────────────────────────────

create table competitions (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  producer text,
  location text,
  date_start date,
  date_end date,
  is_major boolean default false,
  sanctioning_body text default 'USASF',
  divisions_entered jsonb default '[]',
  notes text,
  results_logged boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PERFORMANCE NOTES ───────────────────────────────────────────────────────

create table performance_notes (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid references competitions(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  athlete_id uuid references athletes(id) on delete cascade,
  author_id uuid references auth.users(id),
  note text not null,
  visibility text default 'coaches_owner' check (visibility in ('owner_only','coaches_owner','public')),
  badge_awarded jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PRACTICE SCHEDULE ───────────────────────────────────────────────────────

create table practice_schedule (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  facility_name text,
  day_of_week int check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  effective_date date,
  end_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ATTENDANCE ──────────────────────────────────────────────────────────────

create table attendance (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  session_date date not null,
  session_type text default 'practice' check (session_type in ('practice','competition','private_lesson')),
  status text not null check (status in ('present','absent','excused','late')),
  notes text,
  created_at timestamptz default now()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index idx_athletes_gym_id on athletes(gym_id);
create index idx_athletes_status on athletes(status);
create index idx_athletes_current_team on athletes(current_team_id);
create index idx_teams_gym_id on teams(gym_id);
create index idx_team_athletes_team_id on team_athletes(team_id);
create index idx_team_athletes_athlete_id on team_athletes(athlete_id);
create index idx_eval_sessions_gym_id on eval_sessions(gym_id);
create index idx_eval_scores_session_id on eval_scores(eval_session_id);
create index idx_eval_scores_athlete_id on eval_scores(athlete_id);
create index idx_athlete_skills_athlete_id on athlete_skills(athlete_id);
create index idx_competitions_gym_id on competitions(gym_id);
create index idx_competitions_date on competitions(date_start);
create index idx_attendance_athlete_id on attendance(athlete_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger gyms_updated_at before update on gyms for each row execute function update_updated_at();
create trigger user_profiles_updated_at before update on user_profiles for each row execute function update_updated_at();
create trigger athletes_updated_at before update on athletes for each row execute function update_updated_at();
create trigger athlete_preferences_updated_at before update on athlete_preferences for each row execute function update_updated_at();
create trigger athlete_skills_updated_at before update on athlete_skills for each row execute function update_updated_at();
create trigger teams_updated_at before update on teams for each row execute function update_updated_at();
create trigger team_athletes_updated_at before update on team_athletes for each row execute function update_updated_at();
create trigger eval_sessions_updated_at before update on eval_sessions for each row execute function update_updated_at();
create trigger eval_groups_updated_at before update on eval_groups for each row execute function update_updated_at();
create trigger competitions_updated_at before update on competitions for each row execute function update_updated_at();
create trigger performance_notes_updated_at before update on performance_notes for each row execute function update_updated_at();
create trigger practice_schedule_updated_at before update on practice_schedule for each row execute function update_updated_at();

-- ─── AUTO-CREATE USER PROFILE ON SIGNUP ─────────────────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'coach')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
