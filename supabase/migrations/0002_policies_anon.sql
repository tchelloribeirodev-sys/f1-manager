-- ============================================================================
-- Policies de RLS para a chave ANON — necessárias porque o app agora é um
-- SPA (Vite) 100% client-side: o navegador conversa direto com o Supabase
-- usando a anon key (não há mais backend com service role key no meio).
--
-- ATENÇÃO / TRADE-OFF DE SEGURANÇA:
-- Estas policies liberam leitura e escrita para QUALQUER pessoa que tenha
-- a URL do Supabase + a anon key (ambas ficam visíveis no bundle do
-- front-end, é assim que funciona). Isso é aceitável para uma ferramenta
-- pessoal/interna, mas significa que a URL da Vercel não deve ser
-- divulgada publicamente sem alguma proteção extra:
--   - a cortina de senha simples (VITE_APP_PASSWORD, ver README) é uma
--     camada básica, mas NÃO é segurança real (a senha fica no bundle);
--   - a solução correta, se este app for exposto de verdade, é Supabase
--     Auth (login) + policies restritas por usuário — podemos fazer isso
--     numa próxima etapa.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'tb_ano','tb_totais','tb_pontuacao','tb_pontuacao_sprint',
    'tb_prova','tb_piloto','tb_equipe','tb_time'
  ]
  loop
    execute format('drop policy if exists anon_all_%s on f1.%I', t, t);
    execute format(
      'create policy anon_all_%s on f1.%I for all to anon using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- Garante que o "role" anon tem USAGE no schema f1 e permissões nas tabelas
-- (o Supabase já faz isso por padrão para schemas expostos na API, mas não
-- custa deixar explícito).
grant usage on schema f1 to anon;
grant select, insert, update, delete on all tables in schema f1 to anon;
