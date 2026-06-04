-- Add pee_wee to age_division check constraints

alter table teams
  drop constraint if exists teams_age_division_check;

alter table teams
  add constraint teams_age_division_check
  check (age_division in ('tiny','mini','pee_wee','youth','junior','senior','open') or age_division is null);

alter table athletes
  drop constraint if exists athletes_age_division_check;

alter table athletes
  add constraint athletes_age_division_check
  check (age_division in ('tiny','mini','pee_wee','youth','junior','senior','open') or age_division is null);
