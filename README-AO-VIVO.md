# Ao Vivo + Importar do jogo

```
F1 25 ──UDP──► scripts/f1-bridge (no PC do jogo) ──► Supabase ──► app (Vercel)
                 │ posições ao vivo ........ Realtime (broadcast)  -> página "Ao Vivo"
                 └ fim de cada sessão ...... f1.tb_sessao_jogo     -> botão "Importar do jogo" (Prova a Prova)
```
Nada do jogo grava em `tb_resultado`: o botão só **preenche o formulário**; quem grava é você, em Salvar.

## 1. Banco
Rode `supabase/migrations/0011_sessao_jogo.sql` no SQL Editor.

## 2. Usuário do bridge
Supabase › Authentication › Users › Add user (ex.: `bridge@seudominio.com`). O app exige login (RLS `authenticated`), então o bridge entra com esse usuário. Não use a service_role.

## 3. Configurar e rodar o bridge (Node 22+)
```
cp scripts/f1-bridge/.env.example scripts/f1-bridge/.env   # preencha
npm run bridge:test     # testa o parser (sem o jogo)
npm run bridge:debug    # mostra as posições no terminal, para conferir com o jogo
npm run bridge          # uso normal
```

## 4. No jogo (Configurações › Telemetria)
UDP Telemetry: On · Broadcast: Off · IP: `127.0.0.1` (jogo e bridge no mesmo PC) · Porta: `20777` · Taxa: 10–20 Hz · **UDP Format: 2026** (use 2025 se for correr com carros de 2025).

## 5. Fluxo
1. Abra o app › **Resultados › Ao Vivo**: durante a corrida mostra a ordem do jogo e o campeonato "se acabasse agora" (pilotos e equipes, com ▲▼ e pontos ganhos). Se a sessão for a sprint, troque "Esta sessão conta como" para Sprint.
2. Ao terminar as sessões, abra **Prova a Prova › Importar do jogo**: escolha Corrida (e Sprint), a Qualificação que define a pole, confira a tabela, associe nomes não reconhecidos e clique em **Preencher formulário**. Revise e clique em **Salvar**.

## Usando junto com SimHub / Aethernum
Rode também `supabase/migrations/0012_bridge_config.sql`. O destino do repasse é editado no app, em **Ao Vivo › Repasse de pacotes** (formato `IP:porta`, só rede local). O bridge confere a cada 10 s, então trocar o IP não exige reiniciar. Campo vazio = usa o `FORWARD_TO` do `.env`.

Só um programa consegue escutar a mesma porta. Duas formas:
- O jogo envia para o bridge (porta 20777) e o bridge repassa para o outro programa: `FORWARD_TO=127.0.0.1:20778` e configure o outro programa para escutar na 20778 (se ele permitir mudar a porta).
- Se o outro programa só aceita 20777, mude `UDP_PORT` do bridge (ex.: 20779) e faça o outro programa repassar para ela, se tiver essa opção.

## Canal privado (opcional)
Com `LIVE_PRIVATE=true` (bridge) e `VITE_LIVE_PRIVATE=true` (app), crie no SQL Editor (confira a sintaxe atual na documentação de Realtime Authorization do Supabase):
```sql
create policy "auth le broadcast" on realtime.messages for select to authenticated using (true);
create policy "auth envia broadcast" on realtime.messages for insert to authenticated with check (true);
```
Sem isso, o canal é público: use um `LIVE_CHANNEL` difícil de adivinhar (igual em `VITE_LIVE_CHANNEL`).

## Pontos para validar com o jogo de verdade
- Posições: rode `npm run bridge:debug` e compare com o jogo. Se aparecer aviso de tamanho de estrutura, o layout mudou e os offsets em `parser.mjs` precisam de ajuste (spec oficial no topo do arquivo).
- Tipo da sessão da sprint: não sei como o jogo a rotula; por isso Sprint é escolhida manualmente.
- Nomes: o jogo manda o nome que ele usa; o que não casar com o elenco você associa uma vez (fica salvo no navegador).
- Melhor volta e pole vêm da classificação final (menor melhor volta da corrida; P1 da qualificação escolhida).
