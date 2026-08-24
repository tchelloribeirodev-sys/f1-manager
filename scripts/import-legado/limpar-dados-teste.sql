-- ============================================================================
-- Limpa TODOS os dados do schema f1 (dados de teste) antes de rodar a
-- importação do legado de verdade.
--
-- NÃO mexe em Authentication > Users (seu login continua funcionando
-- depois de rodar isso) — só apaga as tabelas de dados do jogo.
--
-- RESTART IDENTITY reseta os contadores de ID de volta pro 1, pra não
-- ficar com buracos na numeração por causa dos dados de teste apagados.
--
-- Rode isso no SQL Editor do Supabase. CASCADE cuida da ordem das chaves
-- estrangeiras automaticamente, mas listei as tabelas de qualquer forma
-- pra ficar claro o que está sendo apagado.
-- ============================================================================

truncate table
  f1.tb_recorde,
  f1.tb_resultado_sprint,
  f1.tb_resultado,
  f1.tb_time,
  f1.tb_equipe,
  f1.tb_piloto,
  f1.tb_prova,
  f1.tb_pontuacao_sprint,
  f1.tb_pontuacao,
  f1.tb_totais,
  f1.tb_ano
restart identity cascade;
