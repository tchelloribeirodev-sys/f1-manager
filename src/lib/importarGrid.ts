import { f1 } from './supabaseClient';
import type { TipoCarreira } from './types';

const OPENF1 = 'https://api.openf1.org/v1';
const JOLPICA = 'https://api.jolpi.ca/ergast/f1';

export interface GridDriver {
  nome: string;
  abreviacao: string;
  equipe: string;
  corEquipe: string;
  nacionalidade: string | null;
  pais: string | null;
}

export interface BandeiraOpcao {
  codigo: string;
  nome: string;
}

export interface ResultadoImportacaoGrid {
  ano: number;
  temporada: number;
  equipes: number;
  pilotos: number;
  times: number;
  bandeirasNaoEncontradas: string[];
  nacionalidadesNaoEncontradas: string[];
}

type OpenF1Driver = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name_acronym?: string;
  team_name?: string;
  team_colour?: string;
};

type JolpicaDriver = {
  driverId?: string;
  givenName?: string;
  familyName?: string;
  code?: string;
  nationality?: string;
};

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}


function formatarNomePiloto(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((parte) => {
      if (!parte) return parte;
      const minusculo = parte.toLocaleLowerCase('pt-BR');
      return minusculo.charAt(0).toLocaleUpperCase('pt-BR') + minusculo.slice(1);
    })
    .join(' ');
}

function normalizarCor(cor?: string): string {
  const limpa = (cor ?? '').replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(limpa) ? `#${limpa.toUpperCase()}` : '#FFFFFF';
}

// O banco usa códigos próprios (ING, HOL, ALE, EUA etc.) porque eles apontam
// para o catálogo de bandeiras cadastrado no app. A nacionalidade do Jolpica
// é textual, então mantemos aqui apenas a conversão necessária para o catálogo.
const PAIS_POR_NACIONALIDADE: Record<string, string> = {
  australian: 'AUS',
  austrian: 'AUT',
  belgian: 'BEL',
  brazilian: 'BRA',
  canadian: 'CAN',
  chinese: 'CHI',
  dutch: 'HOL',
  finnish: 'FIN',
  french: 'FRA',
  german: 'ALE',
  italian: 'ITA',
  japanese: 'JAP',
  mexican: 'MEX',
  monegasque: 'MON',
  portuguese: 'POR',
  russian: 'RUS',
  singaporean: 'SIN',
  spanish: 'ESP',
  thai: 'THA',
  british: 'ING',
  american: 'EUA',
  argentine: 'ARG',
  argentinian: 'ARG',
  colombian: 'COL',
  danish: 'DIN',
  irish: 'IRL',
  malaysian: 'MAL',
  'new zealander': 'NZL',
  'south african': 'AFS',
  swiss: 'SUI',
  turkish: 'TUR',
  venezuelan: 'VEN',
  polish: 'POL',
  indonesian: 'IND'
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`API respondeu HTTP ${response.status}: ${url}`);
  return response.json() as Promise<T>;
}

async function carregarOpenF1(): Promise<OpenF1Driver[]> {
  // "latest" entrega o grid da sessão mais recente e, além do piloto/equipe,
  // já traz a cor hexadecimal oficial usada pelo OpenF1 para a equipe.
  const data = await getJson<OpenF1Driver[]>(`${OPENF1}/drivers?session_key=latest`);
  const porPiloto = new Map<string, OpenF1Driver>();
  for (const d of data ?? []) {
    const chave = d.name_acronym || normalizar(d.full_name || `${d.first_name ?? ''} ${d.last_name ?? ''}`);
    if (d.team_name && chave) porPiloto.set(chave, d);
  }
  return [...porPiloto.values()];
}

async function carregarJolpica(ano: number): Promise<JolpicaDriver[]> {
  const data = await getJson<any>(`${JOLPICA}/${ano}/drivers.json?limit=100`);
  return (data?.MRData?.DriverTable?.Drivers ?? []) as JolpicaDriver[];
}

function encontrarNacionalidade(open: OpenF1Driver, jolpica: JolpicaDriver[]): string | null {
  const acr = normalizar(open.name_acronym ?? '');
  const nome = normalizar(open.full_name || `${open.first_name ?? ''} ${open.last_name ?? ''}`);
  const candidatos = jolpica.filter((d) => {
    const code = normalizar(d.code ?? '');
    const nomeJ = normalizar(`${d.givenName ?? ''} ${d.familyName ?? ''}`);
    return (acr && code === acr) || (nome && nomeJ === nome);
  });
  return candidatos[0]?.nationality ?? null;
}

export async function buscarGridAtual(ano: number): Promise<GridDriver[]> {
  const [open, jolpica] = await Promise.all([carregarOpenF1(), carregarJolpica(ano)]);

  return open
    .filter((d) => d.team_name && (d.full_name || d.last_name) && d.name_acronym)
    .map((d) => {
      const nacionalidade = encontrarNacionalidade(d, jolpica);
      return {
        nome: formatarNomePiloto(d.full_name || `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim()),
        abreviacao: (d.name_acronym ?? '').toUpperCase(),
        equipe: d.team_name!.trim(),
        corEquipe: normalizarCor(d.team_colour),
        nacionalidade,
        pais: nacionalidade ? PAIS_POR_NACIONALIDADE[normalizar(nacionalidade)] ?? null : null
      };
    });
}

export async function importarGridAtual(
  ano: number,
  _temporada: number,
  tipoCarreira: TipoCarreira,
  paisesSelecionados: Record<string, string> = {}
): Promise<ResultadoImportacaoGrid> {
  if (!ano) throw new Error('Selecione um ano do jogo antes de importar o grid.');
  // A importação do grid inicial sempre pertence à 1ª temporada do ano.
  const temporada = 1;

  const [grid, bandeirasResult] = await Promise.all([
    buscarGridAtual(ano),
    f1().from('tb_bandeira').select('codigo')
  ]);
  if (bandeirasResult.error) throw bandeirasResult.error;

  const codigosBandeiras = new Set((bandeirasResult.data ?? []).map((b: { codigo: string }) => b.codigo.toUpperCase()));
  const paisesNaoEncontrados = new Set<string>();
  const nacionalidadesNaoEncontradas = new Set<string>();

  for (const d of grid) {
    const selecionado = paisesSelecionados[d.abreviacao];
    if (selecionado) d.pais = selecionado.toUpperCase();
    if (d.nacionalidade && !d.pais) nacionalidadesNaoEncontradas.add(d.nacionalidade);
    if (d.pais && !codigosBandeiras.has(d.pais)) {
      paisesNaoEncontrados.add(d.pais);
      d.pais = null;
    }
  }

  // Carrega os registros existentes e atualiza pelo nome/sigla, evitando
  // duplicações ao clicar no botão novamente.
  const [{ data: equipesExistentes, error: erroEq }, { data: pilotosExistentes, error: erroPil }] = await Promise.all([
    f1().from('tb_equipe').select('*').eq('ano_jogo', ano).eq('tipo_carreira', tipoCarreira),
    f1().from('tb_piloto').select('*').eq('ano_jogo', ano).eq('tipo_carreira', tipoCarreira)
  ]);
  if (erroEq) throw erroEq;
  if (erroPil) throw erroPil;

  const equipePorNome = new Map<string, any>((equipesExistentes ?? []).map((e: any) => [normalizar(e.nome_equipe), e]));
  const pilotoPorAbrev = new Map<string, any>((pilotosExistentes ?? []).map((p: any) => [p.abreviacao_piloto.toUpperCase(), p]));
  const pilotoPorNome = new Map<string, any>((pilotosExistentes ?? []).map((p: any) => [normalizar(p.nome_piloto), p]));

  const idsEquipes = new Map<string, number>();
  for (const equipe of [...new Set(grid.map((d) => d.equipe))]) {
    const chave = normalizar(equipe);
    const existente = equipePorNome.get(chave);
    const cor = grid.find((d) => d.equipe === equipe)?.corEquipe ?? '#FFFFFF';
    if (existente) {
      const { data, error } = await f1()
        .from('tb_equipe')
        .update({ nome_equipe: equipe, cor_equipe: cor })
        .eq('id', existente.id)
        .select('*')
        .single();
      if (error) throw error;
      idsEquipes.set(chave, data.id);
      equipePorNome.set(chave, data);
    } else {
      const { data, error } = await f1()
        .from('tb_equipe')
        .insert({ ano_jogo: ano, nome_equipe: equipe, cor_equipe: cor, tipo_carreira: tipoCarreira })
        .select('*')
        .single();
      if (error) throw error;
      idsEquipes.set(chave, data.id);
      equipePorNome.set(chave, data);
    }
  }

  const idsPilotos = new Map<string, number>();
  for (const d of grid) {
    const existente = pilotoPorAbrev.get(d.abreviacao) ?? pilotoPorNome.get(normalizar(d.nome));
    const payload = {
      ano_jogo: ano,
      nome_piloto: d.nome.trim(),
      abreviacao_piloto: d.abreviacao,
      aposentado: false,
      tipo_carreira: tipoCarreira,
      pais: d.pais
    };
    if (existente) {
      const { data, error } = await f1().from('tb_piloto').update(payload).eq('id', existente.id).select('*').single();
      if (error) throw error;
      idsPilotos.set(d.abreviacao, data.id);
      pilotoPorAbrev.set(d.abreviacao, data);
      pilotoPorNome.set(normalizar(d.nome), data);
    } else {
      const { data, error } = await f1().from('tb_piloto').insert(payload).select('*').single();
      if (error) throw error;
      idsPilotos.set(d.abreviacao, data.id);
      pilotoPorAbrev.set(d.abreviacao, data);
      pilotoPorNome.set(normalizar(d.nome), data);
    }
  }

  // O OpenF1 não devolve um número fixo de piloto 1/2; para o cadastro do
  // sistema usamos a ordem do grid retornado, mas garantimos que cada equipe
  // receba exatamente os dois primeiros pilotos disponíveis.
  const porEquipe = new Map<string, GridDriver[]>();
  for (const d of grid) {
    const lista = porEquipe.get(d.equipe) ?? [];
    lista.push(d);
    porEquipe.set(d.equipe, lista);
  }

  let times = 0;
  for (const [nomeEquipe, pilotos] of porEquipe) {
    const idEquipe = idsEquipes.get(normalizar(nomeEquipe));
    if (!idEquipe) continue;
    const escolhidos = pilotos.slice(0, 2);
    // A temporada selecionada é substituída para que a importação seja
    // idempotente: repetir a ação sempre deixa a dupla igual à API atual.
    const { error: erroDelete } = await f1()
      .from('tb_time')
      .delete()
      .eq('ano_jogo', ano)
      .eq('temporada', temporada)
      .eq('id_equipe', idEquipe)
      .eq('tipo_carreira', tipoCarreira);
    if (erroDelete) throw erroDelete;

    for (let i = 0; i < escolhidos.length; i += 1) {
      const idPiloto = idsPilotos.get(escolhidos[i].abreviacao);
      if (!idPiloto) continue;
      const { error } = await f1().from('tb_time').insert({
        ano_jogo: ano,
        temporada,
        id_equipe: idEquipe,
        id_piloto: idPiloto,
        status_piloto: i + 1,
        tipo_carreira: tipoCarreira
      });
      if (error) throw error;
      times += 1;
    }
  }

  return {
    ano,
    temporada,
    equipes: idsEquipes.size,
    pilotos: idsPilotos.size,
    times,
    bandeirasNaoEncontradas: [...paisesNaoEncontrados],
    nacionalidadesNaoEncontradas: [...nacionalidadesNaoEncontradas]
  };
}
