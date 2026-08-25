-- Raridade pública dos equipamentos dos funcionários.

alter table public.employee_equipment
  add column if not exists rarity text not null default 'Comum';

alter table public.employee_equipment
  drop constraint if exists employee_equipment_rarity;

alter table public.employee_equipment
  add constraint employee_equipment_rarity
  check (rarity in ('Comum', 'Lendária'));
