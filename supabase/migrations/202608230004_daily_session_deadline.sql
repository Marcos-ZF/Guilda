-- A sessão termina no primeiro limite alcançado:
-- quatro horas após o login ou a meia-noite seguinte em São Paulo.
create or replace function public.current_session_expires_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select least(
    session.created_at + interval '4 hours',
    (
      ((session.created_at at time zone 'America/Sao_Paulo')::date + 1)::timestamp
      at time zone 'America/Sao_Paulo'
    )
  )
  from auth.sessions as session
  where session.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    and session.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_session_expires_at() from public;
grant execute on function public.current_session_expires_at() to authenticated;
