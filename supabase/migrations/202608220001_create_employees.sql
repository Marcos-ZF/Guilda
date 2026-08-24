-- Funcionários públicos e gerenciamento administrativo.
-- Execute este arquivo no SQL Editor do Supabase.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  role_title text not null,
  specialty text not null,
  initials text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_code_length check (char_length(code) between 2 and 20),
  constraint employees_name_length check (char_length(name) between 2 and 80),
  constraint employees_role_length check (char_length(role_title) between 2 and 80),
  constraint employees_specialty_length check (char_length(specialty) between 2 and 160),
  constraint employees_initials_length check (char_length(initials) between 1 and 4)
);

alter table public.employees enable row level security;

grant select on public.employees to anon, authenticated;
grant insert, update, delete on public.employees to authenticated;

drop policy if exists "Funcionarios ativos sao publicos" on public.employees;
create policy "Funcionarios ativos sao publicos"
on public.employees
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Administradores visualizam todos os funcionarios" on public.employees;
create policy "Administradores visualizam todos os funcionarios"
on public.employees
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "Administradores criam funcionarios" on public.employees;
create policy "Administradores criam funcionarios"
on public.employees
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "Administradores atualizam funcionarios" on public.employees;
create policy "Administradores atualizam funcionarios"
on public.employees
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Administradores removem funcionarios" on public.employees;
create policy "Administradores removem funcionarios"
on public.employees
for delete
to authenticated
using ((select private.is_admin()));

insert into public.employees
  (code, name, role_title, specialty, initials, sort_order)
values
  ('RR01', 'Rodion Romanovich', 'Comandante', 'Estratégia e liderança', 'RR', 1),
  ('VM02', 'Vera Morozova', 'Vigia-Mor', 'Exploração e reconhecimento', 'VM', 2),
  ('DM03', 'Dimitri Markov', 'Guardião', 'Defesa e linha de frente', 'DM', 3),
  ('AK04', 'Anya Kuznetsova', 'Arquivista', 'Pesquisa e documentação', 'AK', 4)
on conflict (code) do nothing;
