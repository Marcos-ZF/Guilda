-- Novos dados gerais da ficha do funcionário.
alter table public.employees
  add column if not exists height text,
  add column if not exists race text,
  add column if not exists age integer,
  add column if not exists sex text,
  add column if not exists document_url text;

alter table public.employees drop constraint if exists employees_age_range;
alter table public.employees add constraint employees_age_range check (age is null or age between 0 and 9999);
