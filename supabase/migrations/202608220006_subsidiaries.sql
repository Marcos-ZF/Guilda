create sequence if not exists public.subsidiary_code_seq start 1;
create table if not exists public.subsidiaries (
 id uuid primary key default gen_random_uuid(), code text not null unique default ('SUB-'||lpad(nextval('public.subsidiary_code_seq')::text,3,'0')),
 name text not null, responsible_employee_id uuid not null references public.employees(id), description text not null default '', location text not null default '',
 status text not null default 'Ativa' check(status in ('Ativa','Inativa','Suspensa')), image_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.subsidiary_services (
 id uuid primary key default gen_random_uuid(), subsidiary_id uuid not null references public.subsidiaries(id) on delete cascade,
 name text not null, description text not null default '', sort_order integer not null default 0, created_at timestamptz not null default now()
);
create or replace function private.can_manage_subsidiary(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select private.is_admin()) or exists(select 1 from public.subsidiaries s join public.employees e on e.id=s.responsible_employee_id join public.profiles p on p.employee_id=e.code where s.id=target and p.id=(select auth.uid()));
$$;
grant execute on function private.can_manage_subsidiary(uuid) to authenticated;
create or replace function private.protect_subsidiary_admin_fields() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if not (select private.is_admin()) and (new.name is distinct from old.name or new.responsible_employee_id is distinct from old.responsible_employee_id) then raise exception 'Somente administradores alteram nome ou responsável'; end if; return new; end $$;
drop trigger if exists protect_subsidiary_admin_fields on public.subsidiaries;
create trigger protect_subsidiary_admin_fields before update on public.subsidiaries for each row execute function private.protect_subsidiary_admin_fields();
alter table public.subsidiaries enable row level security;alter table public.subsidiary_services enable row level security;
grant select on public.subsidiaries,public.subsidiary_services to anon,authenticated;grant insert,update,delete on public.subsidiaries,public.subsidiary_services to authenticated;
create policy "Subsidiarias ativas sao publicas" on public.subsidiaries for select to anon,authenticated using(status='Ativa');
create policy "Gestores visualizam subsidiarias" on public.subsidiaries for select to authenticated using((select private.can_manage_subsidiary(id)));
create policy "Administradores criam subsidiarias" on public.subsidiaries for insert to authenticated with check((select private.is_admin()));
create policy "Gestores atualizam subsidiarias" on public.subsidiaries for update to authenticated using((select private.can_manage_subsidiary(id))) with check((select private.can_manage_subsidiary(id)));
create policy "Administradores excluem subsidiarias" on public.subsidiaries for delete to authenticated using((select private.is_admin()));
create policy "Servicos ativos sao publicos" on public.subsidiary_services for select to anon,authenticated using(exists(select 1 from public.subsidiaries s where s.id=subsidiary_id and s.status='Ativa'));
create policy "Gestores visualizam servicos" on public.subsidiary_services for select to authenticated using((select private.can_manage_subsidiary(subsidiary_id)));
create policy "Gestores criam servicos" on public.subsidiary_services for insert to authenticated with check((select private.can_manage_subsidiary(subsidiary_id)));
create policy "Gestores atualizam servicos" on public.subsidiary_services for update to authenticated using((select private.can_manage_subsidiary(subsidiary_id))) with check((select private.can_manage_subsidiary(subsidiary_id)));
create policy "Gestores excluem servicos" on public.subsidiary_services for delete to authenticated using((select private.can_manage_subsidiary(subsidiary_id)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('subsidiary-media','subsidiary-media',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
create policy "Gestores enviam imagens de subsidiarias" on storage.objects for insert to authenticated with check(bucket_id='subsidiary-media' and (select private.can_manage_subsidiary(((storage.foldername(name))[1])::uuid)));
