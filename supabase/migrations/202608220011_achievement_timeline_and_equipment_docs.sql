-- Feitos integrados à linha do tempo e documentos opcionais de equipamentos.

alter table public.employee_equipment
  add column if not exists document_url text;

alter table public.employee_equipment
  drop constraint if exists employee_equipment_document_url;

alter table public.employee_equipment
  add constraint employee_equipment_document_url
  check (document_url is null or document_url ~ '^https?://');

create or replace function private.sync_achievement_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  timeline_id uuid;
  employee_name text;
  timeline_description text;
begin
  select name into employee_name from public.employees where id = new.employee_id;
  timeline_description := case
    when length(trim(new.description)) > 0 then new.description
    else employee_name || ' teve um novo feito registrado.'
  end;

  if tg_op = 'INSERT' then
    insert into public.timeline_entries
      (entry_type, entry_date, title, description, source_type, source_id)
    values
      ('Feito', current_date, new.title, timeline_description, 'achievement', new.id)
    on conflict (source_type, source_id) where source_type is not null and source_id is not null
    do update set
      title = excluded.title,
      description = excluded.description,
      updated_at = now()
    returning id into timeline_id;

    insert into public.timeline_entry_employees (timeline_entry_id, employee_id)
    values (timeline_id, new.employee_id)
    on conflict do nothing;
  else
    update public.timeline_entries
    set title = new.title,
        description = timeline_description,
        updated_at = now()
    where source_type = 'achievement' and source_id = new.id
    returning id into timeline_id;

    if timeline_id is null then
      insert into public.timeline_entries
        (entry_type, entry_date, title, description, source_type, source_id)
      values
        ('Feito', current_date, new.title, timeline_description, 'achievement', new.id)
      returning id into timeline_id;
    end if;

    delete from public.timeline_entry_employees where timeline_entry_id = timeline_id;
    insert into public.timeline_entry_employees (timeline_entry_id, employee_id)
    values (timeline_id, new.employee_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function private.remove_achievement_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.timeline_entries
  where source_type = 'achievement' and source_id = old.id;
  return old;
end;
$$;

drop trigger if exists achievement_timeline_insert_update on public.employee_achievements;
create trigger achievement_timeline_insert_update
after insert or update of title, description, employee_id on public.employee_achievements
for each row execute function private.sync_achievement_timeline();

drop trigger if exists achievement_timeline_delete on public.employee_achievements;
create trigger achievement_timeline_delete
after delete on public.employee_achievements
for each row execute function private.remove_achievement_timeline();

-- Registra os feitos que já existiam antes desta automação.
insert into public.timeline_entries
  (entry_type, entry_date, title, description, source_type, source_id)
select
  'Feito',
  coalesce(a.created_at::date, current_date),
  a.title,
  case when length(trim(a.description)) > 0 then a.description else e.name || ' teve um novo feito registrado.' end,
  'achievement',
  a.id
from public.employee_achievements a
join public.employees e on e.id = a.employee_id
where not exists (
  select 1 from public.timeline_entries t
  where t.source_type = 'achievement' and t.source_id = a.id
);

insert into public.timeline_entry_employees (timeline_entry_id, employee_id)
select t.id, a.employee_id
from public.timeline_entries t
join public.employee_achievements a on t.source_type = 'achievement' and t.source_id = a.id
on conflict do nothing;
