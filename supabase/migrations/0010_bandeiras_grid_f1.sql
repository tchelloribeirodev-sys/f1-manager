-- Bandeiras adicionais usadas pelo grid atual da F1.
-- As imagens já existem em public/flags/ no projeto; os códigos passam a
-- ficar disponíveis no catálogo do banco para a importação automática.
insert into f1.tb_bandeira (codigo, nome, url_imagem) values
  ('ALE', 'Alemanha', '/flags/ALE.png'),
  ('ARG', 'Argentina', '/flags/argentina.png'),
  ('FIN', 'Finlândia', '/flags/Fin.png'),
  ('NZL', 'Nova Zelândia', '/flags/nova%20zelandia.png'),
  ('THA', 'Tailândia', '/flags/tailandia.png')
on conflict (codigo) do nothing;
