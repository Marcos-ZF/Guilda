-- Status completo dos funcionários e memorial público.
-- Execute este arquivo no SQL Editor do Supabase após as migrations anteriores.

alter table public.employees
  add column if not exists employee_status text not null default 'active',
  add column if not exists memento_image_url text,
  add column if not exists memento_text text not null default '',
  add column if not exists memento_url text;

update public.employees
set employee_status = 'inactive'
where is_active = false and employee_status = 'active';

alter table public.employees drop constraint if exists employees_status_check;
alter table public.employees
  add constraint employees_status_check
  check (employee_status in ('active', 'inactive', 'deceased'));

alter table public.employees drop constraint if exists employees_memento_text_length;
alter table public.employees
  add constraint employees_memento_text_length
  check (char_length(memento_text) <= 10000);

alter table public.employees drop constraint if exists employees_memento_url_check;
alter table public.employees
  add constraint employees_memento_url_check
  check (memento_url is null or memento_url ~ '^https?://');

-- Ativos e falecidos permanecem públicos; inativos ficam apenas no arquivo interno.
drop policy if exists "Funcionarios ativos sao publicos" on public.employees;
drop policy if exists "Funcionarios ativos e falecidos sao publicos" on public.employees;
create policy "Funcionarios ativos e falecidos sao publicos"
on public.employees for select to anon, authenticated
using (employee_status in ('active', 'deceased'));

drop policy if exists "Equipamentos de funcionarios ativos sao publicos" on public.employee_equipment;
drop policy if exists "Equipamentos de funcionarios publicos" on public.employee_equipment;
create policy "Equipamentos de funcionarios publicos"
on public.employee_equipment for select to anon, authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = employee_id and e.employee_status in ('active', 'deceased')
  )
);

drop policy if exists "Feitos de funcionarios ativos sao publicos" on public.employee_achievements;
drop policy if exists "Feitos de funcionarios publicos" on public.employee_achievements;
create policy "Feitos de funcionarios publicos"
on public.employee_achievements for select to anon, authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = employee_id and e.employee_status in ('active', 'deceased')
  )
);

-- Campos de status e Memento são administrativos mesmo na ficha vinculada.
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
    or new.employee_status is distinct from old.employee_status
    or new.memento_image_url is distinct from old.memento_image_url
    or new.memento_text is distinct from old.memento_text
    or new.memento_url is distinct from old.memento_url
    or new.sort_order is distinct from old.sort_order
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Campos administrativos da ficha são restritos';
  end if;
  return new;
end;
$$;

-- Funcionários não podem enviar nem remover imagens da pasta reservada ao Memento.
drop policy if exists "Gestores enviam midia de funcionarios" on storage.objects;
create policy "Gestores enviam midia de funcionarios"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'employee-media'
  and (
    (select private.is_admin())
    or (
      coalesce((storage.foldername(name))[2], '') <> 'memento'
      and (select private.can_manage_employee(((storage.foldername(name))[1])::uuid))
    )
  )
);

drop policy if exists "Gestores removem midia de funcionarios" on storage.objects;
create policy "Gestores removem midia de funcionarios"
on storage.objects for delete to authenticated
using (
  bucket_id = 'employee-media'
  and (
    (select private.is_admin())
    or (
      coalesce((storage.foldername(name))[2], '') <> 'memento'
      and (select private.can_manage_employee(((storage.foldername(name))[1])::uuid))
    )
  )
);
