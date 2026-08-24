#!/usr/bin/env node
/**
 * Diagnóstico do bug "total de vitórias/poles/pódios não bate por temporada"
 * na página Recordes. Rodar isso AQUI FORA da sandbox (no seu terminal
 * normal, com internet de verdade) porque tanto o ambiente do Claude quanto
 * a VM isolada usada pra acessar seus arquivos não têm rota de rede até o
 * Supabase.
 *
 * Uso (na raiz do projeto, onde já existe node_modules com @supabase/supabase-js):
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... DIAG_EMAIL=voce@... DIAG_SENHA=sua-senha \
 *     node scripts/diag-recordes.mjs "Marcelo Ribeiro" 2029 PILOTO
 *
 * (Pode copiar os dois primeiros valores direto do seu .env.local, e usar o
 * MESMO e-mail/senha que você usa pra entrar no app — senão só rode:
 *   node --env-file=.env.local scripts/diag-recordes.mjs "Marcelo Ribeiro" 2029 PILOTO
 * se sua versão do Node suportar --env-file, mas ainda assim precisa passar
 * DIAG_EMAIL/DIAG_SENHA na linha de comando, veja abaixo o porquê.)
 *
 * IMPORTANTE: desde a migração pra login (0005_auth.sql), as tabelas só
 * podem ser lidas por um usuário AUTENTICADO — a chave anon sozinha, sem
 * login, não dá erro nenhum, só devolve ZERO linhas pra qualquer consulta
 * (é assim que a política de RLS do Supabase funciona: nega em silêncio).
 * Foi exatamente isso que aconteceu nas tentativas anteriores — "nenhum
 * piloto encontrado" não significava que os dados não existem, e sim que a
 * consulta nunca chegou a ver o banco de verdade. Por isso agora o script
 * pede DIAG_EMAIL/DIAG_SENHA e faz login antes de consultar, do mesmo jeito
 * que o app faz na tela de entrada.
 *
 * O que ele mostra:
 *  1. Todas as linhas de tb_piloto que casam com o nome informado, pra
 *     qualquer ano_jogo/tipo_carreira — revela na hora se existem DUAS
 *     linhas de piloto com o mesmo nome no mesmo ano_jogo (ex.: um cadastro
 *     duplicado, ou um id novo criado no meio do campeonato por troca de
 *     equipe) que dividiriam as estatísticas em dois ids diferentes.
 *  2. Pra cada id encontrado, o total de vitórias/poles/pódios/voltas em
 *     tb_resultado E em tb_resultado_sprint, agrupado por temporada — assim
 *     dá pra ver exatamente em qual temporada/tabela cada vitória está
 *     gravada, e se alguma vitória "sprint" está sendo ignorada.
 */
import { createClient } from '@supabase/supabase-js';

// Os dois argumentos depois do nome (ano_jogo e PILOTO/EQUIPE) são
// aceitos em qualquer ordem, e podem ser omitidos — isso evita o problema
// de passar "" pra "pular" um argumento posicional, que em alguns
// terminais (PowerShell/cmd) simplesmente desaparece da lista de args em
// vez de virar uma string vazia, empurrando os argumentos seguintes pra
// posição errada.
const [nome, ...resto] = process.argv.slice(2);
if (!nome) {
  console.error('Uso: node scripts/diag-recordes.mjs "Nome do Piloto" [anoJogo] [PILOTO|EQUIPE]');
  process.exit(1);
}
let anoJogo = null;
let tipoCarreira = 'PILOTO';
for (const arg of resto) {
  if (/^(PILOTO|EQUIPE)$/i.test(arg)) tipoCarreira = arg.toUpperCase();
  else if (/^\d+$/.test(arg)) anoJogo = Number(arg);
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.DIAG_EMAIL;
const senha = process.env.DIAG_SENHA;
if (!url || !key) {
  console.error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no ambiente (copie do .env.local).');
  process.exit(1);
}
if (!email || !senha) {
  console.error(
    'Faltam DIAG_EMAIL / DIAG_SENHA no ambiente — use o MESMO e-mail/senha que você usa pra entrar no app.\n' +
      'Sem login, a chave anon não consegue ler nada (RLS bloqueia em silêncio, sem dar erro).'
  );
  process.exit(1);
}

const supabase = createClient(url, key);
const f1 = () => supabase.schema('f1');

function linha(...cols) {
  console.log(cols.join(' | '));
}

async function main() {
  const { data: authData, error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (erroLogin || !authData.session) {
    console.error('Falha no login:', erroLogin?.message ?? '(sem sessão retornada)');
    process.exit(1);
  }
  console.log(`Login OK como ${authData.user.email}.`);

  let q = f1().from('tb_piloto').select('id, nome_piloto, ano_jogo, tipo_carreira, aposentado').ilike('nome_piloto', `%${nome}%`);
  if (anoJogo) q = q.eq('ano_jogo', anoJogo);
  q = q.eq('tipo_carreira', tipoCarreira);
  const { data: pilotos, error: erroPilotos } = await q;
  if (erroPilotos) {
    console.error('Erro consultando tb_piloto:', erroPilotos);
    process.exit(1);
  }

  console.log(`\n=== tb_piloto que casam com "${nome}" (ano_jogo=${anoJogo ?? 'qualquer'}, tipo=${tipoCarreira}) ===`);
  linha('id', 'nome_piloto', 'ano_jogo', 'tipo_carreira', 'aposentado');
  pilotos.forEach((p) => linha(p.id, p.nome_piloto, p.ano_jogo, p.tipo_carreira, p.aposentado));
  if (pilotos.length > 1) {
    console.log(
      `\n>>> ATENÇÃO: ${pilotos.length} linhas de piloto encontradas pro mesmo nome/ano_jogo/carreira. ` +
        `Se forem IDs diferentes, as estatísticas do Recordes são somadas POR ID — vitórias lançadas ` +
        `num id não aparecem no total do outro id.\n`
    );
  }
  if (pilotos.length === 0) {
    console.log('Nenhum piloto encontrado com esse filtro — confira o nome/ano_jogo/tipo_carreira.');
    return;
  }

  for (const p of pilotos) {
    console.log(`\n=== id_piloto ${p.id} (${p.nome_piloto}) — tb_resultado por temporada ===`);
    const { data: res, error: erroRes } = await f1()
      .from('tb_resultado')
      .select('temporada, posicao, pole, volta_mais_rapida')
      .eq('id_piloto', p.id)
      .eq('ano_jogo', p.ano_jogo)
      .eq('tipo_carreira', p.tipo_carreira)
      .order('temporada');
    if (erroRes) {
      console.error('Erro consultando tb_resultado:', erroRes);
      continue;
    }
    const porTemp = new Map();
    (res ?? []).forEach((r) => {
      const t = (porTemp.get(r.temporada) ?? { vitorias: 0, poles: 0, podios: 0, voltas: 0 });
      if (r.posicao === 1) t.vitorias += 1;
      if (r.posicao && r.posicao <= 3) t.podios += 1;
      if (r.pole) t.poles += 1;
      if (r.volta_mais_rapida) t.voltas += 1;
      porTemp.set(r.temporada, t);
    });
    linha('temporada', 'vitorias', 'poles', 'podios', 'voltas_mais_rapidas');
    [...porTemp.entries()].sort((a, b) => a[0] - b[0]).forEach(([t, v]) =>
      linha(t, v.vitorias, v.poles, v.podios, v.voltas)
    );

    console.log(`\n=== id_piloto ${p.id} (${p.nome_piloto}) — tb_resultado_sprint por temporada ===`);
    const { data: sprint, error: erroSprint } = await f1()
      .from('tb_resultado_sprint')
      .select('temporada, posicao')
      .eq('id_piloto', p.id)
      .eq('ano_jogo', p.ano_jogo)
      .eq('tipo_carreira', p.tipo_carreira)
      .order('temporada');
    if (erroSprint) {
      console.error('Erro consultando tb_resultado_sprint (pode não existir a tabela, ok ignorar):', erroSprint.message);
      continue;
    }
    const porTempSprint = new Map();
    (sprint ?? []).forEach((r) => {
      const t = porTempSprint.get(r.temporada) ?? { vitorias: 0, podios: 0 };
      if (r.posicao === 1) t.vitorias += 1;
      if (r.posicao && r.posicao <= 3) t.podios += 1;
      porTempSprint.set(r.temporada, t);
    });
    if (porTempSprint.size === 0) {
      console.log('(nenhum resultado de sprint pra esse piloto)');
    } else {
      linha('temporada', 'vitorias_sprint', 'podios_sprint');
      [...porTempSprint.entries()].sort((a, b) => a[0] - b[0]).forEach(([t, v]) => linha(t, v.vitorias, v.podios));
      console.log(
        '\n>>> Essas vitórias/pódios de SPRINT NÃO entram no total da página Recordes hoje ' +
          '(carregarRecordesAtuais só olha tb_resultado) — se alguma vitória da 5ª temporada foi de sprint, é essa a causa.'
      );
    }

    console.log(`\n=== id_piloto ${p.id} — linha em tb_recorde (base acumulada) ===`);
    const { data: rec } = await f1()
      .from('tb_recorde')
      .select('ano_jogo, tipo_carreira, vitorias, poles, voltas_mais_rapidas, podios')
      .eq('id_piloto', p.id);
    console.log(rec ?? '(nenhuma linha em tb_recorde pra esse id)');
  }
}

main();
