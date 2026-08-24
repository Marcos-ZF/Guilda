-- Retorna o encerramento absoluto da sessão atual.
-- A duração é calculada usando auth.sessions.created_at, portanto a renovação
-- normal do JWT não prolonga o limite máximo de quatro horas.
create or replace function public.current_session_expires_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select session.created_at + interval '4 hours'
  from auth.sessions as session
  where session.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    and session.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_session_expires_at() from public;
grant execute on function public.current_session_expires_at() to authenticated;
