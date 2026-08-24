# Grid Manager — Web (React + Vite + Supabase)

Conversão do pacote anterior (Next.js) para **React + Vite**, com a
identidade visual do seu mockup `F1 Manager.html` (o de `F1_Chat`): sidebar
escura, marca "F1" em degradê vermelho, cards e tabelas no mesmo estilo.

Esta pasta substitui os arquivos do Next.js em `F1_Claude`. O conteúdo de
negócio é o mesmo da Parte 1 que já tínhamos: Ano do jogo, Parâmetros,
Pontuação, Calendário/Provas, Pilotos, Equipes e Times.

## O que muda do Next.js para o Vite

| Next.js (antes)                          | React + Vite (agora)                         |
|--------------------------------------------|-------------------------------------------------|
| Server Components + Server Actions          | Componentes React comuns + chamadas diretas ao Supabase no navegador |
| `service_role key` (só no servidor)          | `anon key` (fica no navegador — ver "Segurança" abaixo) |
| Contexto ano/carreira/temporada em cookies    | Contexto em `localStorage` (`AppContextProvider`) |
| `.env.local` com `NEXT_PUBLIC_*` / `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` com `VITE_*` (ver `.env.local.example`) |
| Deploy na Vercel como app Next.js             | Deploy na Vercel (ou qualquer host estático) como build Vite (`dist/`) |

O **schema do banco não muda** — é o mesmo `supabase/migrations/0001_init.sql`
de antes. Só adicionei `0002_policies_anon.sql`, necessário porque agora
quem lê/grava é o navegador do usuário (via anon key), não mais um servidor
com a chave privilegiada.

## Identidade visual

Extraí o CSS real do seu `F1 Manager.html` (schema de cores, sidebar, cards,
tabelas, tipografia Inter) e ele está em `src/styles.css`, no topo do
arquivo, sem alterações. Por baixo dele adicionei só as classes que
faltavam para formulários de cadastro (inputs, botões, chips de bandeira,
swatch de cor) — usando os mesmos tokens de cor do mockup (fundo `#080b11`,
cards `#0e141e`, bordas `#202a38`, vermelho de destaque `#e10600`).

O menu lateral do mockup tinha 5 itens pensados para o app final
(Classificação, Pilotos, Equipes, Provas, Recordes). Como esta é a Parte 1
(cadastros), troquei por 7 itens equivalentes às telas que já existem:
Ano do jogo, Parâmetros, Pontuação, Calendário/Provas, Pilotos, Equipes e
Times. Quando entrarmos na Parte 2/3, dá para reaproveitar exatamente este
mesmo shell (`Sidebar`/`ContextSelectors`/`styles.css`) para as telas de
Classificação e Recordes do mockup original.

As bandeiras agora aparecem como imagem de verdade (`public/flags/*.png`,
convertidas dos `.bmp` que vieram no seu `F1.zip`), não só o código em
texto.

## Passo a passo

### 1. Instalar dependências
```
cd F1_Claude
npm install
```

### 2. Variáveis de ambiente
Se você já tinha um `.env.local` do pacote Next.js anterior, ele **não
funciona mais como está** — as variáveis mudaram de nome e de chave (agora
é a anon key, não a service role key):
```
cp .env.local.example .env.local
```
Preencha com a mesma URL do projeto Supabase de antes, mas com a
**anon public key** (Settings > API no painel do Supabase).

### 3. Rodar a nova policy no Supabase
No SQL Editor do Supabase, rode `supabase/migrations/0002_policies_anon.sql`
(o `0001_init.sql` você já rodou antes — não precisa rodar de novo, a menos
que esteja criando um projeto novo do zero).

### 4. Rodar localmente
```
npm run dev
```
Abre em http://localhost:5173.

### 5. Build e deploy na Vercel
```
npm run build
```
Isso gera a pasta `dist/`. Na Vercel, ao importar o repositório, configure:
- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Environment Variables: as mesmas do `.env.local` (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, e opcionalmente `VITE_APP_PASSWORD`)

## Segurança / Autenticação

Este app usa **Supabase Auth** de verdade agora: para ler ou gravar qualquer
dado é preciso estar logado (e-mail + senha). A antiga cortina de senha
(`VITE_APP_PASSWORD`) foi removida.

Para criar os primeiros usuários (você e quem mais for administrar a liga),
use o Supabase Dashboard: **Authentication > Users > Add user** (e-mail +
senha). Não existe cadastro público dentro do app, de propósito.

No SQL Editor do Supabase, rode as migrações que ainda não rodou, **nesta
ordem**:
1. `0001_init.sql` (se for um projeto novo)
2. `0002_policies_anon.sql`
3. `0003_resultados.sql`
4. `0004_recordes.sql` — tabela de Recordes
5. `0005_auth.sql` — troca todas as policies de "aberto para anon" para
   "exige usuário autenticado" (rode por último, depois de já ter criado
   seu usuário no passo acima, ou você fica sem acesso até logar)

## Novidades desta etapa

- **Login** com Supabase Auth (substitui a cortina de senha).
- **Cadastro de Recordes**: grave o total de vitórias/poles/voltas mais
  rápidas/pódios de cada piloto acumulado até o ano anterior. Pilotos
  aposentados gravam um valor fixo (mesma convenção do ano_jogo = 2000 já
  usada em Pilotos). Tem um botão **"Importar recordes"** que busca esses
  totais reais na [Jolpica-F1](https://api.jolpi.ca/) (API pública e
  gratuita, sucessora da Ergast, dados reais de F1 desde 1950) casando pelo
  nome do piloto, mostra tudo numa prévia — incluindo o que já está gravado
  hoje — e só grava depois que você conferir e marcar o que quer importar.
  Se dois pilotos reais tiverem o mesmo sobrenome, a tela deixa você
  escolher manualmente quem é. **Não uso o StatsF1** pra isso: o site deles
  não tem API e os termos de uso proíbem reaproveitar o conteúdo em outro
  lugar; a Jolpica-F1 é livre para esse tipo de uso. Uma ressalva: a
  Jolpica só tem dado de volta mais rápida a partir de ~2004, então pilotos
  de décadas anteriores podem sair com esse número subcontado — vale
  conferir manualmente esses casos antes de gravar.
- **Recordes** (leitura): soma o valor gravado com o que já foi disputado
  nas temporadas do ano selecionado.
- **Prova a Prova**: removida a classificação da tela (já existe em
  Classificação Geral/Prova a Prova); botão "Add" e "Salvar" com o mesmo
  visual; campo "Pos. Sprint" grava a sprint independente do resultado
  principal — dá para lançar a sprint primeiro e voltar depois para lançar
  a corrida principal.
- **Dashboards** (Pilotos / Equipes), com gráficos de linha via `recharts`
  (nova dependência — rode `npm install` de novo se já tinha o projeto
  instalado):
  - Equipes: total de pontos acumulado por equipe, **temporada a temporada**
    (1ª, 2ª, 3ª... dentro do ano_jogo selecionado), com a cor cadastrada de
    cada equipe. Só entram temporadas que já têm escalação cadastrada.
  - Pilotos: pontos acumulados dos 5 primeiros colocados, prova a prova,
    com cores fixas (vermelho/azul/cinza-claro/verde/laranja — usei
    cinza-claro no lugar do preto pedido porque preto puro fica invisível
    no fundo escuro do app).

## Seus dados reais

`migrated-data/` é de uma tentativa de migração anterior (só tabelas de
referência — ano, equipes, pilotos, pontuação, calendário, escalação — sem
os resultados das corridas em si) e eu não sei se ela chegou a ser
aplicada no seu Supabase. Antes de rodar o importador novo
(`scripts/import-legado/`), dá uma olhada no seu Supabase: se a tela de
Pilotos já mostra nomes pra anos como 2020 ou 2022, essa migração antiga já
rodou — nesse caso tudo bem, o importador novo pula qualquer ano_jogo que
já tenha piloto cadastrado, então não duplica nada. Se dela vazio, ele
importa os anos inteiros do zero, resultados incluídos.

## Importador do legado (histórico completo, com resultados)

`scripts/import-legado/` é um script Node separado (não faz parte do app
publicado) que lê os dados exportados do seu `F1.mdb` real — calendário,
pilotos, equipes, escalação, **e os resultados de cada corrida e sprint,
pole e volta mais rápida** — e grava tudo no Supabase, ano por ano.
Diferente do `migrated-data/`, ele já veio testado (`--dry-run`) contra o
seu arquivo de verdade: 2017 a 2024 prontos pra importar (2025 é pulado
por já existir). Instruções completas em
`scripts/import-legado/README.md`.

## Cara a Cara e resumo automático

- **Cara a Cara**: nova tela que compara dois pilotos ao longo de um
  ano_jogo inteiro — cabeça a cabeça (quem terminou na frente em quantas
  provas), vitórias, pódios, poles e posição média.
- **Resumo automático**: na tela Prova a Prova, depois de lançar (ou ao
  abrir uma prova já lançada), aparece um texto pronto tipo "Norris venceu
  em Ímola, com Piastri em 2º... Na classificação geral, Norris lidera com
  X pontos..." — com um botão pra copiar e mandar no grupo.
