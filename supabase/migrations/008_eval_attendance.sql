-- Eval dates (up to 4 per session) + attendance tracking

-- Add eval_dates array to eval_sessions
alter table eval_sessions
  add column if not exists eval_dates jsonb default '[]';

-- Eval attendance table
create table if not exists eval_attendance (
  id uuid primary key default uuid_generate_v4(),
  eval_session_id uuid not null references eval_sessions(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  eval_date date not null,
  attended boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(eval_session_id, athlete_id, eval_date)
);

create index idx_eval_attendance_session on eval_attendance(eval_session_id);
create index idx_eval_attendance_athlete on eval_attendance(athlete_id);

alter table eval_attendance enable row level security;

create policy "gym members can manage eval attendance"
  on eval_attendance for all
  using (
    gym_id in (select gym_id from user_profiles where id = auth.uid())
  );

create trigger eval_attendance_updated_at
  before update on eval_attendance
  for each row execute function update_updated_at();
