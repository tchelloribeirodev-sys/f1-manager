const BASE = 'https://api.jolpi.ca/ergast/f1';

export type DriverJolpica = {
  driverId: string;
  givenName: string;
  familyName: string;
  nationality?: string;
  dateOfBirth?: string;
};

export type CandidatoDriver = DriverJolpica & { score: 'exato' | 'sobrenome' };

export type TotaisJolpica = {
  vitorias: number;
  poles: number;
  voltasMaisRapidas: number;
  podios: number;
  polesPossivelmenteIncompletas: boolean;
};

// A Jolpica-F1 (e a Ergast, de onde ela herdou a base) não tem dado de
// classificação de largada (qualifying) confiável antes desta temporada —
// pilotos que correram antes disso (Prost, Senna, Schumacher no início da
// carreira etc.) saem com poles zeradas ou muito subcontadas, mesmo que
// vitórias/pódios (que vêm do endpoint de resultado de corrida, esse sim
// completo desde 1950) estejam certos.
const PRIMEIRA_TEMPORADA_COM_QUALIFYING_CONFIAVEL = 1994;

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

async function fetchJson(url: string): Promise<any> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Jolpica-F1 respondeu ${resp.status} — tente novamente em alguns segundos.`);
  return resp.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// A Jolpica-F1 (como a Ergast original) ignora um "limit" maior que 100 e
// SEMPRE devolve no máximo 100 registros por página, mesmo que a gente peça
// mais — sem paginar, qualquer lista com mais de 100 itens (a de pilotos tem
// ~880; o histórico de corridas de pilotos como Hamilton passa de 390) vinha
// cortada silenciosamente, e é por isso que pilotos "recentes" (que caem
// depois do corte alfabético/cronológico dos primeiros 100) não apareciam.
async function fetchTodasAsPaginas<T>(urlBase: string, extrair: (data: any) => T[]): Promise<T[]> {
  const LIMITE_POR_PAGINA = 100;
  const sep = urlBase.includes('?') ? '&' : '?';
  let offset = 0;
  let total = Infinity;
  const todos: T[] = [];
  while (offset < total) {
    const data = await fetchJson(`${urlBase}${sep}limit=${LIMITE_POR_PAGINA}&offset=${offset}`);
    total = Number(data?.MRData?.total ?? todos.length);
    const pagina = extrair(data);
    if (pagina.length === 0) break;
    todos.push(...pagina);
    offset += LIMITE_POR_PAGINA;
    if (offset < total) await sleep(120); // não martelar a API pública entre páginas
  }
  return todos;
}

let cacheDrivers: DriverJolpica[] | null = null;

// Lista completa de pilotos da história da F1 (~880) — cacheada em memória
// pra não refazer essa busca a cada piloto durante uma importação. Pagina
// até trazer todo mundo (ver fetchTodasAsPaginas).
export async function carregarTodosDrivers(): Promise<DriverJolpica[]> {
  if (cacheDrivers) return cacheDrivers;
  const lista = await fetchTodasAsPaginas<any>(`${BASE}/drivers/`, (data) => data?.MRData?.DriverTable?.Drivers ?? []);
  cacheDrivers = lista.map((d) => ({
    driverId: d.driverId,
    givenName: d.givenName,
    familyName: d.familyName,
    nationality: d.nationality,
    dateOfBirth: d.dateOfBirth
  }));
  return cacheDrivers;
}

// Casa "Michael Schumacher" / "Ayrton Senna" contra a base da Jolpica: primeiro
// tenta nome completo exato (ignorando acento/maiúsculas), senão cai para
// sobrenome (podem aparecer vários — nesse caso quem usa a tela escolhe).
export function encontrarCandidatos(nomePiloto: string, drivers: DriverJolpica[]): CandidatoDriver[] {
  const alvo = normalizar(nomePiloto);
  const exatos = drivers.filter((d) => normalizar(`${d.givenName} ${d.familyName}`) === alvo);
  if (exatos.length > 0) return exatos.map((d) => ({ ...d, score: 'exato' }));

  const partes = alvo.split(' ').filter(Boolean);
  const sobrenome = partes[partes.length - 1];
  if (!sobrenome) return [];
  return drivers.filter((d) => normalizar(d.familyName) === sobrenome).map((d) => ({ ...d, score: 'sobrenome' }));
}

// Total de vitórias, poles, voltas mais rápidas e pódios de um piloto real até
// (e incluindo) o ano informado. Pagina resultados e classificações inteiros
// (ver fetchTodasAsPaginas) — sem isso, pilotos com muitas corridas (ex.:
// Hamilton, +390) saíam subcontados porque só a primeira página vinha.
// Observação: a Jolpica só tem dado de volta mais rápida a partir de ~2004 —
// temporadas mais antigas podem sair subcontadas nesse campo especificamente.
export async function buscarTotaisAte(driverId: string, anoCorte: number): Promise<TotaisJolpica> {
  const [resultados, qualis] = await Promise.all([
    fetchTodasAsPaginas<any>(`${BASE}/drivers/${driverId}/results.json`, (data) => data?.MRData?.RaceTable?.Races ?? []),
    fetchTodasAsPaginas<any>(`${BASE}/drivers/${driverId}/qualifying.json`, (data) => data?.MRData?.RaceTable?.Races ?? [])
  ]);

  let vitorias = 0;
  let podios = 0;
  let voltasMaisRapidas = 0;
  let primeiraTemporadaComResultado = Infinity;
  resultados.forEach((race) => {
    const ano = Number(race.season);
    if (ano > anoCorte) return;
    if (ano < primeiraTemporadaComResultado) primeiraTemporadaComResultado = ano;
    const res = race.Results?.[0];
    if (!res) return;
    const pos = Number(res.position);
    if (pos === 1) vitorias += 1;
    if (pos >= 1 && pos <= 3) podios += 1;
    if (res.FastestLap?.rank === '1') voltasMaisRapidas += 1;
  });

  let poles = 0;
  qualis.forEach((race) => {
    if (Number(race.season) > anoCorte) return;
    const q = race.QualifyingResults?.[0];
    if (q && Number(q.position) === 1) poles += 1;
  });

  // se o piloto já corria antes de 1994 (considerando só as temporadas até o
  // corte pedido), a Jolpica não tem qualifying pra essa parte da carreira —
  // então as poles contadas aqui são, na melhor das hipóteses, parciais.
  const polesPossivelmenteIncompletas = primeiraTemporadaComResultado < PRIMEIRA_TEMPORADA_COM_QUALIFYING_CONFIAVEL;

  return { vitorias, poles, voltasMaisRapidas, podios, polesPossivelmenteIncompletas };
}
