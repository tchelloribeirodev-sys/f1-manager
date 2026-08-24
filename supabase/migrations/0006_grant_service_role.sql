-- ============================================================================
-- Concede acesso ao schema f1 para a role service_role.
--
-- A service_role do Supabase ignora RLS (bypassrls), mas isso não dispensa
-- a permissão básica do Postgres — ela ainda precisa de GRANT no schema e
-- nas tabelas, exatamente como qualquer outra role. As migrações anteriores
-- (0002, 0005) só concederam isso para "anon" e "authenticated"; faltou a
-- service_role, usada pelo script scripts/import-legado/import-legado.mjs.
--
-- Sem isso, o importador falha com "permission denied for table tb_ano"
-- (ou qualquer outra tabela) mesmo usando a SERVICE_ROLE_KEY correta.
-- ============================================================================

grant usage on schema f1 to service_role;
grant select, insert, update, delete on all tables in schema f1 to service_role;
grant usage, select on all sequences in schema f1 to service_role;

-- garante que tabelas criadas no futuro também já nasçam liberadas pra
-- service_role, sem precisar de outra migração de grant
alter default privileges in schema f1
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema f1
  grant usage, select on sequences to service_role;
