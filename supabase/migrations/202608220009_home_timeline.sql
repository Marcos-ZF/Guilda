-- Dados dinâmicos da Home e gerenciamento da linha do tempo.

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

drop policy if exists "Configuracoes publicas podem ser lidas" on public.site_settings;
create policy "Configuracoes publicas podem ser lidas"
on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "Administradores gerenciam configuracoes" on public.site_settings;
create policy "Administradores gerenciam configuracoes"
on public.site_settings for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

insert into public.site_settings (key, value)
values ('service_time', '08')
on conflict (key) do nothing;

create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null,
  entry_date date not null,
  title text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timeline_type_length check (char_length(entry_type) between 2 and 40),
  constraint timeline_title_length check (char_length(title) between 2 and 160),
  constraint timeline_description_length check (char_length(description) between 2 and 5000)
);

alter table public.timeline_entries enable row level security;
grant select on public.timeline_entries to anon, authenticated;
grant insert, update, delete on public.timeline_entries to authenticated;

drop policy if exists "Linha do tempo e publica" on public.timeline_entries;
create policy "Linha do tempo e publica"
on public.timeline_entries for select to anon, authenticated using (true);

drop policy if exists "Administradores criam registros historicos" on public.timeline_entries;
create policy "Administradores criam registros historicos"
on public.timeline_entries for insert to authenticated
with check ((select private.is_admin()));

drop policy if exists "Administradores alteram registros historicos" on public.timeline_entries;
create policy "Administradores alteram registros historicos"
on public.timeline_entries for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Administradores removem registros historicos" on public.timeline_entries;
create policy "Administradores removem registros historicos"
on public.timeline_entries for delete to authenticated
using ((select private.is_admin()));

create index if not exists timeline_entries_date_idx
on public.timeline_entries(entry_date desc, created_at desc);

insert into public.timeline_entries (entry_type, entry_date, title, description)
select seed.entry_type, seed.entry_date::date, seed.title, seed.description
from (values
  ('Comunicado', '2026-08-21', 'Assembleia geral convocada', 'Todos os funcionários devem apresentar-se no salão principal para a definição das próximas operações.'),
  ('Feito', '2026-08-18', 'A passagem de Valebruma', 'A rota entre os povoados do norte foi restaurada e declarada segura.'),
  ('Novo funcionário', '2026-08-14', 'Sienna Ember integra o arquivo', 'A pesquisadora assume a função de Arquivista da Guilda Romanov.'),
  ('Relatório', '2026-08-02', 'Ruínas do Santuário', 'Inventário preliminar dos artefatos recuperados durante a expedição.'),
  ('Feito', '2026-07-24', 'O sino perdido de Eredan', 'A relíquia foi recuperada e devolvida ao povo de Eredan.'),
  ('Comunicado', '2026-07-17', 'Treinamento em dois turnos', 'O salão de treinamento passa a operar em dois turnos nos dias úteis.')
) as seed(entry_type, entry_date, title, description)
where not exists (select 1 from public.timeline_entries);

create or replace function public.home_metrics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'employees', (select count(*) from public.employees where is_active = true),
    'reports', (select count(*) from public.reports),
    'service_time', coalesce((select value from public.site_settings where key = 'service_time'), '08')
  );
$$;

revoke all on function public.home_metrics() from public;
grant execute on function public.home_metrics() to anon, authenticated;
