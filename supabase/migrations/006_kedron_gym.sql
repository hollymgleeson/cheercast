-- Kedron Cheerleading Association — Pilot Gym Setup

insert into gyms (id, name, owner_name, email, phone, address, subscription_tier, settings)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'Kedron Cheerleading Association',
  'Jenifer Friel',
  'Kedronad@gmail.com',
  '610-804-8778',
  '3932 Miller Road, Newtown Square, PA 19073',
  'design_partner',
  '{"season_start_date": "2025-08-01"}'
)
on conflict (id) do nothing;
