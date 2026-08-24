#!/usr/bin/env node
/**
 * Importador do legado (Access F1.mdb) para o Supabase.
 *
 * NÃO lê o .mdb diretamente (Node não tem driver nativo pra Access) — os
 * dados já vêm exportados em CSV na pasta ./dados (um arquivo por tabela do
 * Access, gerado com `mdb-export`). Se você tiver um .mdb mais novo/diferente
 * pra importar no futuro, gere os CSVs de novo assim (Linux/Mac, com
 * mdbtools instalado — `apt install mdbtools` ou `brew install mdbtools`):
 *
 *   for t in Tb_Ano TB_TOTAIS TB_PONTUACAO TB_PONTUACAO_SPRINT Tb_Prova \
 *            Tb_equipe Tb_piloto Tb_Time Tb_Classificacao Tb_Sprint \
 *            Tb_Pole Tb_Volta Tb_Recorde_Vitoria Tb_Recorde_Pole \
 *            Tb_Recorde_Volta TB_Recorde_Podio; do
 *     mdb-export SeuArquivo.mdb "$t" > dados/"$t".csv
 *   done
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node import-legado.mjs --dry-run
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node import-legado.mjs
 *
 * --dry-run mostra tudo que seria gravado, sem gravar nada — sempre rode
 * assim primeiro e confira os números antes de rodar de verdade.
 *
 * Precisa da SERVICE ROLE KEY (não a anon key) porque o schema exige
 * usuário autenticado (ver 0005_auth.sql) e este é um script de uso único,
 * rodado localmente por você — nunca coloque essa chave no app.
 *
 * O script é seguro pra rodar mais de uma vez: antes de importar um
 * ano_jogo/tipo_carreira, ele confere se já existe piloto cadastrado pra
 * essa combinação no Supabase e PULA (não sobrescreve o que você já montou
 * manualmente pela tela, como a temporada atual).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const DRY_RUN = process.argv.includes('--dry-run');
const DIR = new URL('./dados/', import.meta.url);

const SUPABASE_URL = 'https://xkzuvsrrdimrtikyihda.supabase.co';//process.env.SUPABASE_URL';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrenV2c3JyZGltcnRpa3lpaGRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMzMzY5MSwiZXhwIjoyMTAyOTA5NjkxfQ.FeNUh7NgRxYhb4Lf7xruA-TouzhbMZt2anryo0VZ3y4';//process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Faltou SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.');
  process.exit(1);
}
const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'f1' } });

// ---------------------------------------------------------------- helpers --

function csv(nome) {
  const texto = readFileSync(new URL(nome + '.csv', DIR), 'utf8');
  return parse(texto, { columns: true, skip_empty_lines: true });
}

const bool = (v) => v === 'S' || v === 'True' || v === '-1' || v === true;

// Nome completo real de cada piloto (o Access só guardava o sobrenome).
// Alguns eu não tenho certeza — ficam marcados com "?"; se algum estiver
// errado ou for um piloto fictício de vocês, é só me avisar e eu ajusto
// aqui antes de rodar a importação de verdade.
const NOME_COMPLETO = {
  'A.Leclerc': 'Arthur Leclerc',
  Aitken: 'Jack Aitken',
  Albon: 'Alexander Albon',
  Alonso: 'Fernando Alonso',
  Antonelli: 'Andrea Kimi Antonelli',
  Aron: 'Paul Aron',
  Bearman: 'Oliver Bearman',
  Bortoleto: 'Gabriel Bortoleto',
  Bottas: 'Valtteri Bottas',
  Butler: 'Butler', // ? não identificado
  Colapinto: 'Franco Colapinto',
  Daruvala: 'Jehan Daruvala',
  'De Vries': 'Nyck de Vries',
  Doohan: 'Jack Doohan',
  Drugovich: 'Felipe Drugovich',
  Ericsson: 'Marcus Ericsson',
  Fittipaldi: 'Pietro Fittipaldi',
  Gasly: 'Pierre Gasly',
  Ghiotto: 'Luca Ghiotto',
  Giovinazzi: 'Antonio Giovinazzi',
  Grosjean: 'Romain Grosjean',
  Hadjar: 'Isack Hadjar',
  Hamilton: 'Lewis Hamilton',
  Hartley: 'Brendon Hartley',
  Hauger: 'Dennis Hauger',
  Hulkenberg: 'Nico Hülkenberg',
  Iwasa: 'Ayumu Iwasa',
  'Jim Clark': 'Jim Clark',
  Kubica: 'Robert Kubica',
  Kvyat: 'Daniil Kvyat',
  Latifi: 'Nicholas Latifi',
  Lawson: 'Liam Lawson',
  Leclerc: 'Charles Leclerc',
  Magnussen: 'Kevin Magnussen',
  Maloney: 'Zane Maloney',
  Mansel: 'Nigel Mansell',
  Marcelo: 'Marcelo Ribeiro', // piloto fictício criado pra carreira (nome completo: Marcelo Ribeiro)
  Massa: 'Felipe Massa',
  Mazepin: 'Nikita Mazepin',
  Norris: 'Lando Norris',
  Ocon: 'Esteban Ocon',
  'O´Sullivan': "Zak O'Sullivan",
  Palmer: 'Jolyon Palmer',
  Perez: 'Sergio Pérez',
  Piastri: 'Oscar Piastri',
  Pourchaire: 'Théo Pourchaire',
  Prost: 'Alain Prost',
  Raikkonen: 'Kimi Räikkönen',
  Ribeiro: 'Marcelo Ribeiro', // piloto fictício criado pra carreira (mesmo piloto que "Marcelo")
  Ricciardo: 'Daniel Ricciardo',
  Russel: 'George Russell',
  Russell: 'George Russell',
  Sainz: 'Carlos Sainz',
  Sargeant: 'Logan Sargeant',
  Schumacher: 'Michael Schumacher',
  Senna: 'Ayrton Senna',
  Shwartzman: 'Robert Shwartzman',
  Sirotkin: 'Sergey Sirotkin',
  Stroll: 'Lance Stroll',
  Tremblay: 'Tremblay', // ? não identificado
  Tsunoda: 'Yuki Tsunoda',
  Vandoorne: 'Stoffel Vandoorne',
  Verstappen: 'Max Verstappen',
  Vesti: 'Frederik Vesti',
  Vettel: 'Sebastian Vettel',
  Vips: 'Jüri Vips',
  Weber: 'Weber', // ? não identificado
  Werhlein: 'Pascal Wehrlein',
  Zhou: 'Zhou Guanyu'
};
function nomeCompletoPiloto(nomeAntigo) {
  return NOME_COMPLETO[nomeAntigo] ?? nomeAntigo;
}

function tcolorToHex(v) {
  const n = Number(v) || 0;
  const b = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const r = n & 0xff;
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Confere, ANTES de gravar, se os dados batem com as regras que o Supabase
// exige por índice único parcial: no máximo 1 piloto por posição, no máximo
// 1 pole e 1 volta mais rápida por (ano, temporada, prova, tipo de carreira).
// O Access não tinha essas restrições, então dados antigos "furados" podem
// aparecer aqui — reportamos em vez de simplesmente falhar no meio da
// gravação (o que deixaria a importação pela metade).
function validarResultados(rows, { comPoleEVolta }) {
  const porGrupo = new Map(); // "ano|temporada|prova|tipo" -> { posicoes: Map<pos, piloto[]>, poles: piloto[], voltas: piloto[] }
  rows.forEach((r) => {
    const chave = `${r.ano_jogo}|${r.temporada}|${r.id_prova}|${r.tipo_carreira}`;
    if (!porGrupo.has(chave)) porGrupo.set(chave, { posicoes: new Map(), poles: [], voltas: [] });
    const grupo = porGrupo.get(chave);
    if (r.posicao != null) {
      if (!grupo.posicoes.has(r.posicao)) grupo.posicoes.set(r.posicao, []);
      grupo.posicoes.get(r.posicao).push(r.id_piloto);
    }
    if (comPoleEVolta && r.pole) grupo.poles.push(r.id_piloto);
    if (comPoleEVolta && r.volta_mais_rapida) grupo.voltas.push(r.id_piloto);
  });

  const problemas = [];
  porGrupo.forEach((grupo, chave) => {
    grupo.posicoes.forEach((pilotosNaPosicao, pos) => {
      if (pilotosNaPosicao.length > 1) {
        problemas.push(`${chave}: posição ${pos} repetida para os pilotos (novo id) ${pilotosNaPosicao.join(', ')}`);
      }
    });
    if (grupo.poles.length > 1) problemas.push(`${chave}: mais de uma pole (pilotos ${grupo.poles.join(', ')})`);
    if (grupo.voltas.length > 1) problemas.push(`${chave}: mais de uma volta mais rápida (pilotos ${grupo.voltas.join(', ')})`);
  });

  if (problemas.length > 0) {
    console.warn(`\n⚠ Encontrei ${problemas.length} inconsistência(s) nos dados do legado (chave = ano|temporada|id_prova_novo|tipo):`);
    problemas.slice(0, 30).forEach((p) => console.warn('  - ' + p));
    if (problemas.length > 30) console.warn(`  ... e mais ${problemas.length - 30}.`);
    console.warn('Essas linhas vão fazer a gravação falhar (o banco não aceita duplicidade). Ajuste os CSVs de origem ou me avise pra decidirmos juntos como tratar antes de rodar de novo.\n');
  }
  return problemas;
}

let totalInseridos = 0;
async function inserir(tabela, linhas, { onConflict } = {}) {
  if (linhas.length === 0) return [];
  if (DRY_RUN) {
    console.log(`  [dry-run] inseriria ${linhas.length} linha(s) em ${tabela}`);
    return linhas.map((l, i) => ({ ...l, id: -1 - i })); // ids falsos só pra não quebrar o mapeamento no dry-run
  }
  const query = supabase.from(tabela).insert(linhas).select('*');
  const { data, error } = onConflict ? await query.onConflict(onConflict) : await query;
  if (error) throw new Error(`Erro inserindo em ${tabela}: ${error.message}`);
  totalInseridos += data.length;
  return data;
}

// ------------------------------------------------------------- carregando --

const anos = csv('Tb_Ano');
const totais = csv('TB_TOTAIS');
const pontuacao = csv('TB_PONTUACAO');
const pontuacaoSprint = csv('TB_PONTUACAO_SPRINT');
const provas = csv('Tb_Prova');
const equipes = csv('Tb_equipe');
const pilotos = csv('Tb_piloto');
const times = csv('Tb_Time');
const classificacao = csv('Tb_Classificacao');
const sprint = csv('Tb_Sprint');
const poles = csv('Tb_Pole');
const voltas = csv('Tb_Volta');
const recVitoria = csv('Tb_Recorde_Vitoria');
const recPole = csv('Tb_Recorde_Pole');
const recVolta = csv('Tb_Recorde_Volta');
const recPodio = csv('TB_Recorde_Podio');

const ANO_APOSENTADO = 2000;

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nada será gravado ===\n' : '=== IMPORTANDO PARA O SUPABASE ===\n');

  // -- descobre o que já existe no Supabase, pra não pisar em nada --
  const jaExistem = new Set(); // chave "anoJogo|tipoCarreira"
  if (!DRY_RUN) {
    const { data } = await supabase.from('tb_piloto').select('ano_jogo, tipo_carreira');
    (data ?? []).forEach((p) => jaExistem.add(`${p.ano_jogo}|${p.tipo_carreira}`));
  }

  const anosImportar = [...new Set(provas.map((p) => Number(p.Ano_Jogo)))].filter((ano) => {
    const temAlgumTipo = ['Piloto', 'Equipe'].some((t) => !jaExistem.has(`${ano}|${t.toUpperCase()}`));
    return temAlgumTipo;
  });
  console.log('Anos de jogo encontrados no legado:', [...new Set(provas.map((p) => p.Ano_Jogo))].join(', '));
  console.log('Anos que serão importados (ainda não existem no Supabase):', anosImportar.join(', ') || '(nenhum — tudo já importado)');
  console.log();

  // -- tb_ano --
  const anoRows = anos
    .map((a) => Number(a.Ano))
    .filter((ano) => anosImportar.includes(ano))
    .map((ano) => ({ ano }));
  console.log(`tb_ano: ${anoRows.length}`);
  await inserir('tb_ano', anoRows);

  // -- tb_totais --
  const totaisRows = totais
    .filter((t) => anosImportar.includes(Number(t.ANO_JOGO)))
    .map((t) => ({
      ano_jogo: Number(t.ANO_JOGO),
      equipes: Number(t.EQUIPES),
      provas: Number(t.PROVAS),
      ponto_volta: bool(t.PONTO_VOLTA)
    }));
  console.log(`tb_totais: ${totaisRows.length}`);
  await inserir('tb_totais', totaisRows);

  // -- tb_pontuacao / tb_pontuacao_sprint --
  const pontRows = pontuacao
    .filter((p) => anosImportar.includes(Number(p.ANO_JOGO)))
    .map((p) => ({ ano_jogo: Number(p.ANO_JOGO), posicao: Number(p.POSICAO), pontos: Number(p.PONTOS) }));
  console.log(`tb_pontuacao: ${pontRows.length}`);
  await inserir('tb_pontuacao', pontRows);

  const pontSprintRows = pontuacaoSprint
    .filter((p) => anosImportar.includes(Number(p.ANO_JOGO)))
    .map((p) => ({ ano_jogo: Number(p.ANO_JOGO), posicao: Number(p.POSICAO), pontos: Number(p.PONTOS) }));
  console.log(`tb_pontuacao_sprint: ${pontSprintRows.length}`);
  await inserir('tb_pontuacao_sprint', pontSprintRows);

  // -- tb_prova (ordem = posição no calendário daquele ano, pela ordem do Id_Prova) --
  const provasPorAno = new Map(); // ano -> [provas ordenadas]
  provas
    .filter((p) => anosImportar.includes(Number(p.Ano_Jogo)))
    .sort((a, b) => Number(a.Id_Prova) - Number(b.Id_Prova))
    .forEach((p) => {
      const ano = Number(p.Ano_Jogo);
      if (!provasPorAno.has(ano)) provasPorAno.set(ano, []);
      provasPorAno.get(ano).push(p);
    });

  const provaRows = [];
  const provaOldIdParaOrdem = new Map(); // Id_Prova antigo -> { ano, ordem }
  provasPorAno.forEach((lista, ano) => {
    lista.forEach((p, idx) => {
      const ordem = idx + 1;
      provaOldIdParaOrdem.set(Number(p.Id_Prova), { ano, ordem });
      provaRows.push({
        ano_jogo: ano,
        ordem,
        nome_prova: p.Nome_Prova,
        abreviacao_prova: p.Abreviacao_Prova,
        sprint: bool(p.Sprint),
        bandeira: p.Abreviacao_Prova // o Access não tinha bandeira própria; a sigla já bate com public/flags/*.png
      });
    });
  });
  console.log(`tb_prova: ${provaRows.length}`);
  const provaInseridas = await inserir('tb_prova', provaRows);
  // mapa (ano, ordem) -> novo id
  const provaNovoId = new Map();
  provaInseridas.forEach((p) => provaNovoId.set(`${p.ano_jogo}|${p.ordem}`, p.id));

  // -- tb_piloto --
  // aposentados (Ano_Jogo=2000) só entram UMA vez no total, mesmo pilotos
  // ativos entram uma vez por ano_jogo (igual ao legado).
  const pilotoOldIdParaNovoId = new Map(); // Id_Piloto antigo -> novo id
  const aposentadosJaImportados = new Map(); // "nome|tipo" -> novo id (evita duplicar o mesmo aposentado)

  const pilotoRowsNovos = [];
  const pilotoRowsAposentados = [];
  pilotos.forEach((p) => {
    const ano = Number(p.Ano_Jogo);
    const tipo = p.Tipo_Carreira.toUpperCase();
    const aposentado = bool(p.Aposentado);
    if (aposentado) {
      const chave = `${p.Nome_Piloto}|${tipo}`;
      if (!aposentadosJaImportados.has(chave)) {
        aposentadosJaImportados.set(chave, pilotoRowsAposentados.length);
        pilotoRowsAposentados.push({
          _oldIds: [Number(p.Id_Piloto)],
          ano_jogo: ANO_APOSENTADO,
          nome_piloto: nomeCompletoPiloto(p.Nome_Piloto),
          abreviacao_piloto: p.Abreviacao_Piloto,
          aposentado: true,
          tipo_carreira: tipo
        });
      } else {
        pilotoRowsAposentados[aposentadosJaImportados.get(chave)]._oldIds.push(Number(p.Id_Piloto));
      }
    } else if (anosImportar.includes(ano)) {
      pilotoRowsNovos.push({
        _oldId: Number(p.Id_Piloto),
        ano_jogo: ano,
        nome_piloto: nomeCompletoPiloto(p.Nome_Piloto),
        abreviacao_piloto: p.Abreviacao_Piloto,
        aposentado: false,
        tipo_carreira: tipo
      });
    }
  });

  console.log(`tb_piloto (aposentados únicos): ${pilotoRowsAposentados.length}`);
  console.log(`tb_piloto (ativos, por ano): ${pilotoRowsNovos.length}`);

  const aposInseridos = await inserir(
    'tb_piloto',
    pilotoRowsAposentados.map(({ _oldIds, ...rest }) => rest)
  );
  aposInseridos.forEach((novo, i) => pilotoRowsAposentados[i]._oldIds.forEach((oldId) => pilotoOldIdParaNovoId.set(oldId, novo.id)));

  const ativosInseridos = await inserir(
    'tb_piloto',
    pilotoRowsNovos.map(({ _oldId, ...rest }) => rest)
  );
  ativosInseridos.forEach((novo, i) => pilotoOldIdParaNovoId.set(pilotoRowsNovos[i]._oldId, novo.id));

  // -- tb_equipe --
  const equipeOldIdParaNovoId = new Map();
  const equipeRows = equipes
    .filter((e) => anosImportar.includes(Number(e.Ano_Jogo)))
    .map((e) => ({
      _oldId: Number(e.Id_Equipe),
      ano_jogo: Number(e.Ano_Jogo),
      nome_equipe: e.Nome_Equipe,
      cor_equipe: tcolorToHex(e.Cor_Equipe),
      tipo_carreira: e.Tipo_Carreira.toUpperCase()
    }));
  console.log(`tb_equipe: ${equipeRows.length}`);
  const equipeInseridas = await inserir(
    'tb_equipe',
    equipeRows.map(({ _oldId, ...rest }) => rest)
  );
  equipeInseridas.forEach((novo, i) => equipeOldIdParaNovoId.set(equipeRows[i]._oldId, novo.id));

  // -- tb_time --
  const timeRows = times
    .filter((t) => anosImportar.includes(Number(t.Ano_Jogo)))
    .map((t) => ({
      ano_jogo: Number(t.Ano_Jogo),
      temporada: Number(t.Temporada),
      id_equipe: equipeOldIdParaNovoId.get(Number(t.Id_Equipe)),
      id_piloto: pilotoOldIdParaNovoId.get(Number(t.Id_Piloto)),
      status_piloto: Number(t.Status_Piloto),
      tipo_carreira: t.Tipo_Carreira.toUpperCase()
    }))
    .filter((t) => t.id_equipe && t.id_piloto);
  console.log(`tb_time: ${timeRows.length}`);
  await inserir('tb_time', timeRows);

  // -- tb_resultado (Tb_Classificacao "despivotada" + pole/volta de Tb_Pole/Tb_Volta) --
  // Tb_Pole/Tb_Volta: 1 linha por (ano_jogo, temporada, tipo_carreira), e cada
  // coluna Prova{i} contém o Id_Piloto (antigo) de quem fez a pole/volta
  // naquela corrida — não é um flag, é o próprio id do piloto.
  const poleMapa = new Map(); // "ano|temporada|tipo|ordem" -> oldIdPiloto
  poles
    .filter((p) => anosImportar.includes(Number(p.Ano_jogo)))
    .forEach((p) => {
      for (let i = 1; i <= 25; i++) {
        const v = p[`Prova${i}`];
        if (v) poleMapa.set(`${p.Ano_jogo}|${p.Temporada}|${(p.Tipo_Carreira || 'PILOTO').toUpperCase()}|${i}`, Number(v));
      }
    });
  const voltaMapa = new Map();
  voltas
    .filter((p) => anosImportar.includes(Number(p.Ano_jogo)))
    .forEach((p) => {
      for (let i = 1; i <= 25; i++) {
        const v = p[`Prova${i}`];
        if (v) voltaMapa.set(`${p.Ano_jogo}|${p.Temporada}|${(p.Tipo_Carreira || 'PILOTO').toUpperCase()}|${i}`, Number(v));
      }
    });

  // Conflitos reais de posição duplicada no legado, confirmados pelo Marcelo
  // (o Access não impedia dois pilotos com a mesma posição na mesma prova;
  // o Supabase impede). Chave: "anoJogo|temporada|i(ordem da prova no CSV)|
  // tipoCarreira|Id_Piloto antigo" -> o piloto listado fica SEM posição
  // naquela prova (equivalente a "em branco"), o outro piloto envolvido no
  // conflito mantém a posição do CSV.
  const POSICAO_EM_BRANCO_FORCADA = new Set([
    '2023|6|11|PILOTO|170', // França 2023 T6: Tsunoda fica em branco, Drugovich mantém posição 14
    '2024|3|16|PILOTO|204', // Qatar 2024 T3: Albon fica em branco, Leclerc mantém posição 3
    '2018|1|12|PILOTO|30', // Hungria 2018 T1: Stroll fica em branco, Gasly mantém posição 17
    '2018|1|19|PILOTO|30' // México 2018 T1: Stroll fica em branco, Ericsson mantém posição 14
  ]);

  const resultadoRows = [];
  classificacao
    .filter((c) => anosImportar.includes(Number(c.Ano_Jogo)))
    .forEach((c) => {
      const ano = Number(c.Ano_Jogo);
      const temporada = Number(c.Temporada);
      const tipo = (c.Tipo_Carreira || 'PILOTO').toUpperCase();
      const idPilotoNovo = pilotoOldIdParaNovoId.get(Number(c.Id_Piloto));
      if (!idPilotoNovo) return;

      for (let i = 1; i <= 25; i++) {
        // O Access grava 0 (não NULL) nas colunas Pos_ProvaN quando o piloto
        // não correu/não tem posição naquela prova — 0 não é uma posição
        // válida (viola o check posicao > 0 no Supabase), então tratamos
        // 0 e vazio do mesmo jeito: sem posição.
        const posNum = Number(c[`Pos_Prova${i}`]);
        let pos = Number.isFinite(posNum) && posNum > 0 ? posNum : null;
        if (POSICAO_EM_BRANCO_FORCADA.has(`${ano}|${temporada}|${i}|${tipo}|${Number(c.Id_Piloto)}`)) {
          pos = null;
        }
        const idProvaNovo = provaNovoId.get(`${ano}|${i}`);
        if (!idProvaNovo) continue; // esse ano não teve uma i-ésima prova

        const chavePoleVolta = `${ano}|${temporada}|${tipo}|${i}`;
        const teveVolta = voltaMapa.get(chavePoleVolta) === Number(c.Id_Piloto);
        const tevePole = poleMapa.get(chavePoleVolta) === Number(c.Id_Piloto);

        if (!pos && !tevePole && !teveVolta) continue;

        resultadoRows.push({
          ano_jogo: ano,
          temporada,
          id_prova: idProvaNovo,
          id_piloto: idPilotoNovo,
          tipo_carreira: tipo,
          posicao: pos,
          pole: tevePole,
          volta_mais_rapida: teveVolta
        });
      }
    });
  console.log(`tb_resultado: ${resultadoRows.length}`);
  const problemasResultado = validarResultados(resultadoRows, { comPoleEVolta: true });
  if (problemasResultado.length > 0 && !DRY_RUN) {
    throw new Error(`${problemasResultado.length} inconsistência(s) em tb_resultado — veja os avisos acima. Nada foi gravado ainda nesta etapa.`);
  }
  await inserir('tb_resultado', resultadoRows);

  // -- tb_resultado_sprint (Tb_Sprint despivotada) --
  // Mesma lógica de "posição em branco forçada" do tb_resultado, pro
  // conflito confirmado pelo Marcelo no Sprint do Qatar 2025.
  const POSICAO_EM_BRANCO_FORCADA_SPRINT = new Set([
    '2025|4|16|PILOTO|216' // Qatar 2025 T4 (sprint): Tsunoda fica em branco, Leclerc mantém posição 3
  ]);

  const resultadoSprintRows = [];
  sprint
    .filter((c) => anosImportar.includes(Number(c.Ano_Jogo)))
    .forEach((c) => {
      const ano = Number(c.Ano_Jogo);
      const temporada = Number(c.Temporada);
      const tipo = (c.Tipo_Carreira || 'PILOTO').toUpperCase();
      const idPilotoNovo = pilotoOldIdParaNovoId.get(Number(c.Id_Piloto));
      if (!idPilotoNovo) return;

      for (let i = 1; i <= 25; i++) {
        // mesmo caso do tb_resultado: 0 no Access significa "sem posição", não é
        // uma posição válida.
        const posNum = Number(c[`Pos_Prova${i}`]);
        if (!Number.isFinite(posNum) || posNum <= 0) continue;
        if (POSICAO_EM_BRANCO_FORCADA_SPRINT.has(`${ano}|${temporada}|${i}|${tipo}|${Number(c.Id_Piloto)}`)) continue;
        const idProvaNovo = provaNovoId.get(`${ano}|${i}`);
        if (!idProvaNovo) continue;
        resultadoSprintRows.push({
          ano_jogo: ano,
          temporada,
          id_prova: idProvaNovo,
          id_piloto: idPilotoNovo,
          tipo_carreira: tipo,
          posicao: posNum
        });
      }
    });
  console.log(`tb_resultado_sprint: ${resultadoSprintRows.length}`);
  const problemasSprint = validarResultados(resultadoSprintRows, { comPoleEVolta: false });
  if (problemasSprint.length > 0 && !DRY_RUN) {
    throw new Error(`${problemasSprint.length} inconsistência(s) em tb_resultado_sprint — veja os avisos acima. Nada foi gravado ainda nesta etapa.`);
  }
  await inserir('tb_resultado_sprint', resultadoSprintRows);

  // -- tb_recorde --
  // Aposentados: pega o maior valor entre as entradas duplicadas por ano e
  // grava UMA vez com ano_jogo=2000 (valor fixo). Ativos: uma linha por
  // ano_jogo, igual ao legado.
  function montarRecordes(linhasCsv, campoQtd, tipoRecorde) {
    const porAposentado = new Map(); // "nome|tipo" -> maior valor
    const linhasAtivos = [];

    linhasCsv.forEach((l) => {
      const idPilotoAntigo = Number(l.Id_Piloto ?? l.ID_PILOTO);
      const pilotoOriginal = pilotos.find((p) => Number(p.Id_Piloto) === idPilotoAntigo);
      if (!pilotoOriginal) return;
      const qtd = Number(l[campoQtd]);
      const tipo = pilotoOriginal.Tipo_Carreira.toUpperCase();

      if (bool(pilotoOriginal.Aposentado)) {
        const chave = `${nomeCompletoPiloto(pilotoOriginal.Nome_Piloto)}|${tipo}`;
        porAposentado.set(chave, Math.max(porAposentado.get(chave) ?? 0, qtd));
      } else {
        const ano = Number(l.Ano_Jogo);
        if (!anosImportar.includes(ano)) return;
        const idPilotoNovo = pilotoOldIdParaNovoId.get(idPilotoAntigo);
        if (!idPilotoNovo) return;
        linhasAtivos.push({ ano_jogo: ano, tipo_carreira: tipo, id_piloto: idPilotoNovo, [tipoRecorde]: qtd });
      }
    });

    const linhasAposentados = [];
    porAposentado.forEach((qtd, chave) => {
      const [nome, tipo] = chave.split('|');
      const idx = pilotoRowsAposentados.findIndex((p) => p.nome_piloto === nome && p.tipo_carreira === tipo);
      if (idx === -1 || !aposInseridos[idx]) return;
      linhasAposentados.push({
        ano_jogo: ANO_APOSENTADO,
        tipo_carreira: tipo,
        id_piloto: aposInseridos[idx].id,
        [tipoRecorde]: qtd
      });
    });

    return [...linhasAposentados, ...linhasAtivos];
  }

  const recordesVitoria = montarRecordes(recVitoria, 'Qtd_vitoria', 'vitorias');
  const recordesPole = montarRecordes(recPole, 'Qtd_Pole', 'poles');
  const recordesVolta = montarRecordes(recVolta, 'Qtd_Volta', 'voltas_mais_rapidas');
  const recordesPodio = montarRecordes(recPodio, 'QTD_PODIO', 'podios');

  // junta os 4 num único registro por (ano_jogo, tipo_carreira, id_piloto)
  const recordeUnificado = new Map();
  [recordesVitoria, recordesPole, recordesVolta, recordesPodio].forEach((lista) => {
    lista.forEach((l) => {
      const chave = `${l.ano_jogo}|${l.tipo_carreira}|${l.id_piloto}`;
      const atual = recordeUnificado.get(chave) ?? {
        ano_jogo: l.ano_jogo,
        tipo_carreira: l.tipo_carreira,
        id_piloto: l.id_piloto,
        vitorias: 0,
        poles: 0,
        voltas_mais_rapidas: 0,
        podios: 0
      };
      Object.assign(atual, l);
      recordeUnificado.set(chave, atual);
    });
  });
  const recordeRows = [...recordeUnificado.values()];
  console.log(`tb_recorde: ${recordeRows.length}`);
  await inserir('tb_recorde', recordeRows);

  console.log(`\n${DRY_RUN ? 'Dry-run concluído.' : `Importação concluída — ${totalInseridos} linhas gravadas.`}`);
}

main().catch((err) => {
  console.error('\nFALHOU:', err.message);
  process.exit(1);
});
