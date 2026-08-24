-- Fichas individuais, equipamentos, feitos e imagens de funcionários.
-- Execute no SQL Editor depois da migration de criação de employees.

alter table public.employees
  add column if not exists about text not null default '',
  add column if not exists photo_url text;

create table if not exists public.employee_equipment (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  name text not null,
  item_type text not null,
  description text not null default '',
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_achievements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function private.can_manage_employee(target_employee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_admin())
    or exists (
      select 1
      from public.profiles p
      join public.employees e on e.code = p.employee_id
      where p.id = (select auth.uid())
        and e.id = target_employee
    );
$$;

grant execute on function private.can_manage_employee(uuid) to authenticated;

drop policy if exists "Gestores visualizam o proprio funcionario" on public.employees;
create policy "Gestores visualizam o proprio funcionario"
on public.employees for select to authenticated
using ((select private.can_manage_employee(id)));

drop policy if exists "Gestores atualizam o proprio funcionario" on public.employees;
create policy "Gestores atualizam o proprio funcionario"
on public.employees for update to authenticated
using ((select private.can_manage_employee(id)))
with check ((select private.can_manage_employee(id)));

alter table public.employee_equipment enable row level security;
alter table public.employee_achievements enable row level security;
grant select on public.employee_equipment, public.employee_achievements to anon, authenticated;
grant insert, update, delete on public.employee_equipment, public.employee_achievements to authenticated;

drop policy if exists "Equipamentos de funcionarios ativos sao publicos" on public.employee_equipment;
create policy "Equipamentos de funcionarios ativos sao publicos"
on public.employee_equipment for select to anon, authenticated
using (exists (select 1 from public.employees e where e.id = employee_id and e.is_active));
drop policy if exists "Gestores administram equipamentos" on public.employee_equipment;
create policy "Gestores administram equipamentos"
on public.employee_equipment for all to authenticated
using ((select private.can_manage_employee(employee_id)))
with check ((select private.can_manage_employee(employee_id)));

drop policy if exists "Feitos de funcionarios ativos sao publicos" on public.employee_achievements;
create policy "Feitos de funcionarios ativos sao publicos"
on public.employee_achievements for select to anon, authenticated
using (exists (select 1 from public.employees e where e.id = employee_id and e.is_active));
drop policy if exists "Gestores administram feitos" on public.employee_achievements;
create policy "Gestores administram feitos"
on public.employee_achievements for all to authenticated
using ((select private.can_manage_employee(employee_id)))
with check ((select private.can_manage_employee(employee_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-media', 'employee-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Gestores enviam midia de funcionarios" on storage.objects;
create policy "Gestores enviam midia de funcionarios"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'employee-media'
  and (select private.can_manage_employee(((storage.foldername(name))[1])::uuid))
);

drop policy if exists "Gestores visualizam midia de funcionarios" on storage.objects;
create policy "Gestores visualizam midia de funcionarios"
on storage.objects for select to authenticated
using (
  bucket_id = 'employee-media'
  and (select private.can_manage_employee(((storage.foldername(name))[1])::uuid))
);

drop policy if exists "Gestores removem midia de funcionarios" on storage.objects;
create policy "Gestores removem midia de funcionarios"
on storage.objects for delete to authenticated
using (
  bucket_id = 'employee-media'
  and (select private.can_manage_employee(((storage.foldername(name))[1])::uuid))
);

insert into public.employee_achievements (employee_id, title, sort_order)
select e.id, 'Fundação da Guilda Romanov', 1 from public.employees e where e.code = 'RR01'
and not exists (select 1 from public.employee_achievements a where a.employee_id = e.id);
