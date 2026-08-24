-- O primeiro perfil administrativo criado é o administrador fundador.
-- Nem outro administrador nem a chave de serviço podem rebaixá-lo.
create or replace function private.protect_founder_admin_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare founder_id uuid;
begin
  if new.role is distinct from old.role and new.role is distinct from 'admin' then
    select profile.id
      into founder_id
      from public.profiles as profile
      where profile.role = 'admin'
      order by profile.created_at asc, profile.id asc
      limit 1;

    if old.id = founder_id then
      raise exception 'O administrador fundador não pode perder o cargo administrativo';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_founder_admin_role on public.profiles;
create trigger protect_founder_admin_role
before update on public.profiles
for each row execute function private.protect_founder_admin_role();
