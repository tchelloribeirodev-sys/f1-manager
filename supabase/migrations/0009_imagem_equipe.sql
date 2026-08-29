-- ============================================================================
-- Imagem da equipe — mesmo padrão de 0008_bandeiras.sql: upload feito pela
-- própria tela (Equipes) para o Supabase Storage (bucket "equipes"), com a
-- URL pública gravada em f1.tb_equipe.imagem_url. Usada para exibir o logo
-- da equipe no Prova a Prova, na Classificação Geral (torre de equipes,
-- grid prova a prova e torre de pilotos, ao lado do nome de cada piloto).
--
-- Diferente de tb_bandeira (catálogo compartilhado entre várias linhas),
-- aqui é uma coluna direta em tb_equipe: cada equipe tem sua própria
-- imagem, sem precisar de tabela à parte.
-- ============================================================================

alter table f1.tb_equipe add column if not exists imagem_url text;

comment on column f1.tb_equipe.imagem_url is 'URL pública do logo/imagem da equipe (Supabase Storage, bucket "equipes"). Opcional — sem imagem, o front-end usa o color-dot (cor_equipe) como antes.';

-- ----------------------------------------------------------------------------
-- Storage: bucket público "equipes". Público pelo mesmo motivo do bucket
-- "bandeiras" (ver 0008_bandeiras.sql) — a imagem é exibida via <img src>
-- puro, sem header de autenticação, nas telas de Prova a Prova e
-- Classificação Geral.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('equipes', 'equipes', true)
on conflict (id) do nothing;

drop policy if exists equipes_leitura_publica on storage.objects;
create policy equipes_leitura_publica
  on storage.objects for select
  to public
  using (bucket_id = 'equipes');

drop policy if exists equipes_escrita_autenticado on storage.objects;
create policy equipes_escrita_autenticado
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'equipes');

drop policy if exists equipes_update_autenticado on storage.objects;
create policy equipes_update_autenticado
  on storage.objects for update
  to authenticated
  using (bucket_id = 'equipes')
  with check (bucket_id = 'equipes');

drop policy if exists equipes_delete_autenticado on storage.objects;
create policy equipes_delete_autenticado
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'equipes');
