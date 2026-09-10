-- Execute no SQL Editor do Supabase antes de publicar esta versão.
-- Não altera saldos nem remove movimentações existentes.
begin;

alter table public.treasury_transactions
  add column if not exists counterparty_employee_id uuid
  references public.employees(id) on delete set null;

-- O vínculo é consultado novamente no banco; nomes/IDs enviados pelo cliente
-- não concedem autorização. profiles.employee_id contém o código da ficha.
create or replace function private.treasury_own_character(character_id uuid, character_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join public.employees e on e.code = p.employee_id
    where p.id = (select auth.uid()) and p.role = 'funcionario'
      and e.id = character_id and e.name = character_name
  );
$$;
revoke all on function private.treasury_own_character(uuid, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.treasury_own_character(uuid, text) to authenticated;

drop policy if exists "Funcionarios registram entradas proprias" on public.treasury_transactions;
create policy "Funcionarios registram entradas proprias"
on public.treasury_transactions for insert to authenticated
with check (
  movement_type = 'entrada'
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and private.treasury_own_character(counterparty_employee_id, counterparty)
  and bronze between 0 and 999999999999
  and prata between 0 and 999999999999
  and ouro between 0 and 999999999999
  and platina between 0 and 999999999999
);

-- SELECT, UPDATE e DELETE da tabela continuam exclusivos dos administradores.
-- A função entrega apenas os quatro totais, sem expor o histórico aos funcionários.
create or replace function public.treasury_balances()
returns table (bronze bigint, prata bigint, ouro bigint, platina bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'funcionario')
  ) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  return query select
    coalesce(sum(case when t.movement_type = 'entrada' then t.bronze else -t.bronze end), 0)::bigint,
    coalesce(sum(case when t.movement_type = 'entrada' then t.prata else -t.prata end), 0)::bigint,
    coalesce(sum(case when t.movement_type = 'entrada' then t.ouro else -t.ouro end), 0)::bigint,
    coalesce(sum(case when t.movement_type = 'entrada' then t.platina else -t.platina end), 0)::bigint
  from public.treasury_transactions t;
end;
$$;
revoke all on function public.treasury_balances() from public, anon;
grant execute on function public.treasury_balances() to authenticated;

commit;
