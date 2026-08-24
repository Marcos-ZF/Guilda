alter table public.employees
  add column if not exists position_title text,
  add column if not exists honor_title text;

alter table public.employees drop constraint if exists employees_honor_title_check;

alter table public.employees
  add constraint employees_honor_title_check
  check (honor_title is null or honor_title in ('Katyusha', 'Ilya', 'Dobrynya', 'Alyosha', 'Rasputin', 'Baba Yaga', 'Vasilisa'));
