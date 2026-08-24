-- Tesouraria administrativa da Companhia Romanov.
-- As quatro moedas possuem saldos independentes e são calculadas pelo histórico.

create table if not exists public.treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  movement_type text not null,
  transaction_date date not null default current_date,
  bronze bigint not null default 0,
  prata bigint not null default 0,
  ouro bigint not null default 0,
  platina bigint not null default 0,
  counterparty text not null,
  description text not null,
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint treasury_transactions_created_by_fkey
    foreign key (created_by) references public.profiles(id),
  constraint treasury_transactions_updated_by_fkey
    foreign key (updated_by) references public.profiles(id),
  constraint treasury_transactions_type_check
    check (movement_type in ('entrada', 'saida')),
  constraint treasury_transactions_amounts_check
    check (
      bronze >= 0 and prata >= 0 and ouro >= 0 and platina >= 0
      and (bronze + prata + ouro + platina) > 0
    ),
  constraint treasury_transactions_counterparty_length
    check (char_length(counterparty) between 2 and 160),
  constraint treasury_transactions_description_length
    check (char_length(description) <= 3000)
);

alter table public.treasury_transactions enable row level security;

revoke all on public.treasury_transactions from anon;
grant select, insert, update, delete on public.treasury_transactions to authenticated;

drop policy if exists "Administradores visualizam tesouraria" on public.treasury_transactions;
create policy "Administradores visualizam tesouraria"
on public.treasury_transactions for select to authenticated
using ((select private.is_admin()));

drop policy if exists "Administradores registram movimentacoes" on public.treasury_transactions;
create policy "Administradores registram movimentacoes"
on public.treasury_transactions for insert to authenticated
with check (
  (select private.is_admin())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

drop policy if exists "Administradores atualizam movimentacoes" on public.treasury_transactions;
create policy "Administradores atualizam movimentacoes"
on public.treasury_transactions for update to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and updated_by = (select auth.uid())
);

drop policy if exists "Administradores excluem movimentacoes" on public.treasury_transactions;
create policy "Administradores excluem movimentacoes"
on public.treasury_transactions for delete to authenticated
using ((select private.is_admin()));

create index if not exists treasury_transactions_date_idx
on public.treasury_transactions (transaction_date desc, created_at desc);

create index if not exists treasury_transactions_counterparty_idx
on public.treasury_transactions (counterparty);

create or replace function public.treasury_balances()
returns table (bronze bigint, prata bigint, ouro bigint, platina bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(case when movement_type = 'entrada' then bronze else -bronze end), 0)::bigint,
    coalesce(sum(case when movement_type = 'entrada' then prata else -prata end), 0)::bigint,
    coalesce(sum(case when movement_type = 'entrada' then ouro else -ouro end), 0)::bigint,
    coalesce(sum(case when movement_type = 'entrada' then platina else -platina end), 0)::bigint
  from public.treasury_transactions;
$$;

revoke all on function public.treasury_balances() from anon;
grant execute on function public.treasury_balances() to authenticated;
