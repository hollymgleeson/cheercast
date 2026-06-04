-- Add parent_phone field to athletes table
alter table athletes add column if not exists parent_phone text;
