-- ============================================================================
-- Autenticação real (Supabase Auth) — troca as policies "abertas para anon"
-- (criadas em 0002_policies_anon.sql e 0004_recordes.sql) por policies que
-- exigem um usuário autenticado.
--
-- Depois desta migration, é preciso estar logado (supabase.auth.signInWithPassword,
-- ver src/components/AuthGate.tsx) para ler ou gravar QUALQUER dado do app —
-- a chave no navegador continua sendo a anon key (é assim que o Supabase Auth
-- funciona em SPA), mas o token de sessão do usuário logado é o que passa a
-- liberar o acesso, via role "authenticated".
--
-- Não há tela de cadastro público no app: para criar os primeiros usuários,
-- use o Supabase Dashboard > Authentication > Users > Add user (e-mail + senha).
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'tb_ano','tb_totais','tb_pontuacao','tb_pontuacao_sprint',
    'tb_prova','tb_piloto','tb_equipe','tb_time',
    'tb_resultado','tb_resultado_sprint','tb_recorde'
  ]
  loop
    execute format('drop policy if exists anon_all_%s on f1.%I', t, t);
    execute format('drop policy if exists auth_all_%s on f1.%I', t, t);
    execute format(
      'create policy auth_all_%s on f1.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

revoke select, insert, update, delete on all tables in schema f1 from anon;
grant usage on schema f1 to authenticated;
grant select, insert, update, delete on all tables in schema f1 to authenticated;
