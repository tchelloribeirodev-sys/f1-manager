-- ============================================================================
-- Inclui a service_role explicitamente nas policies de RLS.
--
-- Em teoria a service_role já ignora RLS automaticamente (atributo
-- BYPASSRLS), mas nesse projeto isso não está acontecendo na prática — o
-- importador (scripts/import-legado/) apanhou com "new row violates
-- row-level security policy" mesmo usando a SERVICE_ROLE_KEY correta e já
-- com os grants da 0006 aplicados.
--
-- Em vez de depender desse comportamento automático (que aqui não está
-- valendo), a policy agora libera explicitamente para "authenticated" E
-- "service_role" — assim funciona independente do BYPASSRLS.
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
    execute format('drop policy if exists auth_all_%s on f1.%I', t, t);
    execute format(
      'create policy auth_all_%s on f1.%I for all to authenticated, service_role using (true) with check (true)',
      t, t
    );
  end loop;
end $$;
