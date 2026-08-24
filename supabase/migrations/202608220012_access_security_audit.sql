-- Auditoria de acesso: perfis, funcionários e feitos.

-- Cada usuário autenticado lê e atualiza somente a própria conta.
-- Administradores continuam podendo gerenciar todas as contas.
alter table public.profiles enable row level security;

do $$
declare existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', existing_policy.policyname);
  end loop;
end $$;

revoke all on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;
grant select, update on public.profiles to authenticated;

create policy "Usuarios visualizam a propria conta"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));

create policy "Usuarios atualizam a propria conta"
on public.profiles for update to authenticated
using (id = (select auth.uid()) or (select private.is_admin()))
with check (id = (select auth.uid()) or (select private.is_admin()));

create or replace function private.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare is_service_role boolean;
begin
  is_service_role := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  if not is_service_role and not (select private.is_admin()) and (
    new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.employee_id is distinct from old.employee_id
  ) then
    raise exception 'Usuários não podem alterar o próprio cargo ou vínculo';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_access_fields on public.profiles;
create trigger protect_profile_access_fields
before update on public.profiles
for each row execute function private.protect_profile_access_fields();

-- Funcionários podem editar a ficha vinculada, mas não os campos administrativos.
create or replace function private.protect_employee_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare is_service_role boolean;
begin
  is_service_role := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
  if not is_service_role and not (select private.is_admin()) and (
    new.id is distinct from old.id
    or new.code is distinct from old.code
    or new.initials is distinct from old.initials
    or new.is_active is distinct from old.is_active
    or new.sort_order is distinct from old.sort_order
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Campos administrativos da ficha são restritos';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_employee_admin_fields on public.employees;
create trigger protect_employee_admin_fields
before update on public.employees
for each row execute function private.protect_employee_admin_fields();

-- Feitos são públicos para leitura, mas somente administradores podem alterá-los.
drop policy if exists "Gestores administram feitos" on public.employee_achievements;
drop policy if exists "Administradores criam feitos" on public.employee_achievements;
drop policy if exists "Administradores atualizam feitos" on public.employee_achievements;
drop policy if exists "Administradores removem feitos" on public.employee_achievements;

revoke insert, update, delete on public.employee_achievements from anon;
grant insert, update, delete on public.employee_achievements to authenticated;

create policy "Administradores criam feitos"
on public.employee_achievements for insert to authenticated
with check ((select private.is_admin()));

create policy "Administradores atualizam feitos"
on public.employee_achievements for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Administradores removem feitos"
on public.employee_achievements for delete to authenticated
using ((select private.is_admin()));
