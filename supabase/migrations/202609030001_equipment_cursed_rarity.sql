-- Permite a raridade amaldiçoada entre épica e lendária.
alter table public.employee_equipment
  drop constraint if exists employee_equipment_rarity;

alter table public.employee_equipment
  add constraint employee_equipment_rarity
  check (rarity in ('common', 'rare', 'epic', 'cursed', 'legendary'));
