# Importador do legado (Access F1.mdb → Supabase)

Importa os dados do sistema antigo em Delphi/Access pro schema novo no
Supabase: anos, pontuação, calendário, pilotos, equipes, escalação,
resultados (corrida e sprint) e recordes.

## Antes de importar: limpe os dados de teste

Se o que está no Supabase hoje é só teste (não precisa preservar), rode
`limpar-dados-teste.sql` no SQL Editor do Supabase **antes** da importação
— apaga tudo do schema `f1` (pilotos, equipes, provas, resultados,
recordes...) e reseta os IDs pro 1. Não mexe no seu login (Authentication
> Users continua intacto).

Depois disso, como o banco fica vazio, **todos** os anos do legado (2017 a
2025) vão ser importados — não só os que faltavam antes.

## O que já está pronto

A pasta `dados/` já vem com os CSVs exportados do seu `F1.mdb` atual —
não precisa reexportar nada pra rodar a importação de agora. Isso só é
necessário se você importar um `.mdb` diferente no futuro (veja o
comentário no topo de `import-legado.mjs`).

## Como funciona

- **Não sobrescreve o que você já cadastrou pela tela.** Antes de importar
  um `ano_jogo`/`tipo_carreira`, o script confere se já existem pilotos
  cadastrados pra essa combinação no Supabase — se existir, pula. Isso
  protege a temporada atual (2025) que você já vem preenchendo manualmente.
- **Pilotos aposentados** (convenção `ano_jogo = 2000`) são unificados: se
  o mesmo piloto aparece várias vezes no legado (uma por ano em que foi
  usado como referência), só cria UMA linha no Supabase, com o maior valor
  de cada recorde encontrado.
- **Cores das equipes**: convertidas do inteiro do Delphi (`TColor`,
  formato BGR) pro hex usado no app novo — já validei que McLaren vira
  `#FF8000` e Ferrari `#FF0000`, batendo com o esperado.
- **Bandeiras das provas**: o Access não tinha esse campo; usei a própria
  sigla de 3 letras da prova (`Abreviacao_Prova`), que já bate com os
  arquivos em `public/flags/`.

## Como rodar

```bash
cd scripts/import-legado
npm install

# 1) sempre rode em dry-run primeiro e confira os números no terminal —
#    nada é gravado nessa etapa:
node import-legado.mjs --dry-run

# 2) se os números baterem com o que você espera, rode de verdade,
#    usando a SERVICE ROLE KEY do Supabase (Project Settings > API —
#    NUNCA essa chave no app, só aqui, local, uma vez):
SUPABASE_URL=https://xkzuvsrrdimrtikyihda.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrenV2c3JyZGltcnRpa3lpaGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzM2OTEsImV4cCI6MjEwMjkwOTY5MX0.zu74iTbnKr0XqabpBV_lpXooBrGR3RPtY9R3fPwrgxI
node import-legado.mjs
```

## Testei localmente (dry-run) com o seu `F1.mdb` real

```
tb_ano: 9
tb_totais: 9
tb_pontuacao: 90
tb_pontuacao_sprint: 32
tb_prova: 164
tb_piloto (aposentados únicos): 7
tb_piloto (ativos, por ano): 227
tb_equipe: 90
tb_time: 1160          ← 100% dos vínculos piloto/equipe bateram, 0 órfãos
tb_resultado: 22055
tb_resultado_sprint: 9168
tb_recorde: 34
```

Isso cobre os anos 2017 a 2024 (2025 já existe no Supabase e será pulado
automaticamente). Antes de rodar de verdade, vale conferir por amostragem
alguma temporada específica pela tela do app depois de importar, só pra
confirmar que ficou como esperado.

## Limitação conhecida

O Access guardava a pole/volta mais rápida em tabelas à parte
(`Tb_Pole`/`Tb_Volta`), com uma coluna por prova contendo o ID de quem
fez a pole/volta naquela corrida específica. O script já lê isso
corretamente e marca `pole`/`volta_mais_rapida` na linha certa de
`tb_resultado` — mas se alguma dessas tabelas tiver alguma inconsistência
manual do uso antigo (ex.: prova sem pole registrada), o campo
simplesmente fica `false`, sem quebrar a importação.
