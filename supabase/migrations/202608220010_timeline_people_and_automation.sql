-- Funcionários envolvidos e registros automáticos no arquivo público.

alter table public.timeline_entries
  add column if not exists source_type text,
  add column if not exists source_id uuid;

create unique index if not exists timeline_entries_source_idx
on public.timeline_entries(source_type, source_id)
where source_type is not null and source_id is not null;

create table if not exists public.timeline_entry_employees (
  timeline_entry_id uuid not null references public.timeline_entries(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (timeline_entry_id, employee_id)
);

alter table public.timeline_entry_employees enable row level security;
grant select on public.timeline_entry_employees to anon, authenticated;
grant insert, delete on public.timeline_entry_employees to authenticated;

drop policy if exists "Envolvidos da linha do tempo sao publicos" on public.timeline_entry_employees;
create policy "Envolvidos da linha do tempo sao publicos"
on public.timeline_entry_employees for select to anon, authenticated using (true);

drop policy if exists "Administradores vinculam envolvidos" on public.timeline_entry_employees;
create policy "Administradores vinculam envolvidos"
on public.timeline_entry_employees for insert to authenticated
with check ((select private.is_admin()));

drop policy if exists "Administradores removem envolvidos" on public.timeline_entry_employees;
create policy "Administradores removem envolvidos"
on public.timeline_entry_employees for delete to authenticated
using ((select private.is_admin()));

create or replace function private.register_employee_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare timeline_id uuid;
begin
  insert into public.timeline_entries
    (entry_type, entry_date, title, description, source_type, source_id)
  values
    ('Novo funcionário', current_date, 'Nova contratação', new.name || ' passou a integrar a Guilda Romanov.', 'employee', new.id)
  on conflict (source_type, source_id) where source_type is not null and source_id is not null do nothing
  returning id into timeline_id;

  if timeline_id is not null then
    insert into public.timeline_entry_employees (timeline_entry_id, employee_id)
    values (timeline_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists employee_created_timeline on public.employees;
create trigger employee_created_timeline
after insert on public.employees
for each row execute function private.register_employee_timeline();

create or replace function private.register_subsidiary_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare timeline_id uuid;
begin
  insert into public.timeline_entries
    (entry_type, entry_date, title, description, source_type, source_id)
  values
    ('Evento', current_date, 'Nova subsidiária', new.name || ' foi registrada como nova subsidiária da Guilda Romanov.', 'subsidiary', new.id)
  on conflict (source_type, source_id) where source_type is not null and source_id is not null do nothing
  returning id into timeline_id;

  if timeline_id is not null and new.responsible_employee_id is not null then
    insert into public.timeline_entry_employees (timeline_entry_id, employee_id)
    values (timeline_id, new.responsible_employee_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists subsidiary_created_timeline on public.subsidiaries;
create trigger subsidiary_created_timeline
after insert on public.subsidiaries
for each row execute function private.register_subsidiary_timeline();

create or replace function private.register_report_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare timeline_id uuid;
begin
  insert into public.timeline_entries
    (entry_type, entry_date, title, description, source_type, source_id)
  values
    ('Relatório', new.report_date, 'Novo relatório', new.title || ' foi arquivado nos documentos da Guilda Romanov.', 'report', new.id)
  on conflict (source_type, source_id) where source_type is not null and source_id is not null do nothing
  returning id into timeline_id;

  if timeline_id is not null and new.author_employee_id is not null then
    insert into public.timeline_entry_employees (timeline_entry_id, employee_id)
    values (timeline_id, new.author_employee_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists report_created_timeline on public.reports;
create trigger report_created_timeline
after insert on public.reports
for each row execute function private.register_report_timeline();
