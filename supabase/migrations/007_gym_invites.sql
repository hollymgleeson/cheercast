-- Gym Invites Table
-- Supports the Team Members tab: invite links for coaches/admins to join a gym

create table if not exists gym_invites (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  email text not null,
  role text not null default 'coach' check (role in ('owner','coach','eval_only','choreographer','athlete_parent')),
  token uuid not null default uuid_generate_v4(),
  invited_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now(),
  unique(token)
);

create index idx_gym_invites_gym_id on gym_invites(gym_id);
create index idx_gym_invites_token on gym_invites(token);

-- RLS
alter table gym_invites enable row level security;

-- Gym owners/coaches can see their own gym's invites
create policy "gym members can view invites"
  on gym_invites for select
  using (
    gym_id in (
      select gym_id from user_profiles where id = auth.uid()
    )
  );

-- Owners and coaches can create invites
create policy "owners and coaches can create invites"
  on gym_invites for insert
  with check (
    gym_id in (
      select gym_id from user_profiles
      where id = auth.uid() and role in ('owner', 'coach')
    )
  );

-- Owners can revoke (delete) invites
create policy "owners can delete invites"
  on gym_invites for delete
  using (
    gym_id in (
      select gym_id from user_profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- Anyone can read an invite by token (needed for the /join/:token page — unauthenticated)
create policy "public can read invite by token"
  on gym_invites for select
  using (true);

-- Anyone can mark an invite as used (needed during signup flow)
create policy "public can mark invite used"
  on gym_invites for update
  using (true)
  with check (true);
