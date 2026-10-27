-- MetaView — corrige o erro "permission denied for table profiles"
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez sem problema.
-- Dá aos usuários logados (role "authenticated") acesso às tabelas.
-- A segurança por pessoa continua garantida pelas políticas RLS já criadas.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on public.profiles, public.habits, public.daily_logs, public.events
  to authenticated;
