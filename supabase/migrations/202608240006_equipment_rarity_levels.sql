-- Padroniza a raridade internamente e deixa o gênero do rótulo para a interface.
alter table public.employee_equipment
  add column if not exists rarity text not null default 'common';

alter table public.employee_equipment
  drop constraint if exists employee_equipment_rarity;

update public.employee_equipment
set rarity = case rarity
  when 'Comum' then 'common'
  when 'Rara' then 'rare'
  when 'Raro' then 'rare'
  when 'Épica' then 'epic'
  when 'Épico' then 'epic'
  when 'Lendária' then 'legendary'
  when 'Lendário' then 'legendary'
  when 'common' then 'common'
  when 'rare' then 'rare'
  when 'epic' then 'epic'
  when 'legendary' then 'legendary'
  else 'common'
end;

alter table public.employee_equipment
  alter column rarity set default 'common';

alter table public.employee_equipment
  add constraint employee_equipment_rarity
  check (rarity in ('common', 'rare', 'epic', 'legendary'));
