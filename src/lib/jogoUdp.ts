import { sobrenome } from './nomes';

// ---- formatos trocados com o bridge (scripts/f1-bridge) ----
export type CarroLive = { i: number; nome: string; pos: number; volta: number; resultado: number };
export type PayloadLive = { t: number; tipo: number; pistaId: number; totalVoltas: number; jogador: number; cars: CarroLive[] };
export type CarroFinal = { i: number; nome: string; pos: number; grid: number; resultado: number; melhorVoltaMs: number };
export type PayloadFinal = { sessionType: number; trackId: number | null; totalLaps: number; cars: CarroFinal[] };
export type SessaoJogo = { id: number; session_uid: string; session_type: number; track_id: number | null; payload: PayloadFinal; created_at: string };

// Tipos de sessão da spec UDP do F1 25 (confira na spec se algum rótulo parecer trocado).
export const TIPOS_SESSAO: Record<number, string> = {
  1: 'Treino 1', 2: 'Treino 2', 3: 'Treino 3', 4: 'Treino curto',
  5: 'Qualificação 1', 6: 'Qualificação 2', 7: 'Qualificação 3', 8: 'Qualificação curta', 9: 'Qualificação única',
  10: 'Sprint qualy 1', 11: 'Sprint qualy 2', 12: 'Sprint qualy 3', 13: 'Sprint qualy curta', 14: 'Sprint qualy única',
  15: 'Corrida', 16: 'Corrida 2', 17: 'Corrida 3', 18: 'Contra-relógio'
};
export const rotuloSessao = (t: number) => `${TIPOS_SESSAO[t] ?? 'Sessão'} (#${t})`;
export const ehCorrida = (t: number) => t >= 15 && t <= 17;
export const ehQualificacao = (t: number) => t >= 5 && t <= 9;
export const resultadoTexto = (r: number) =>
  ({ 3: 'Terminou', 4: 'DNF', 5: 'DSQ', 6: 'Não class.', 7: 'Abandonou' } as Record<number, string>)[r] ?? '—';

// ---- casamento de nomes do jogo com os pilotos cadastrados ----
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const chaveNome = norm;

const LS_ALIAS = 'f1_alias_jogo';
export function carregarAlias(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_ALIAS) ?? '{}');
  } catch {
    return {};
  }
}
export function salvarAlias(novos: Record<string, number>) {
  localStorage.setItem(LS_ALIAS, JSON.stringify({ ...carregarAlias(), ...novos }));
}

type PilotoRef = { idPiloto: number; nomePiloto: string };

function pontuar(r: PilotoRef, n: string): number {
  const full = norm(r.nomePiloto);
  const sob = norm(sobrenome(r.nomePiloto));
  const ultimo = full.split(' ').pop() ?? '';
  if (!n) return 0;
  if (full === n) return 3;
  if (sob === n || ultimo === n) return 2;
  if (n.length >= 3 && (full.includes(n) || (ultimo.length >= 3 && n.split(' ').includes(ultimo)))) return 1;
  return 0;
}

/** índice do nome no jogo -> idPiloto. Só casa quando há um único candidato claro. */
export function casarNomes(roster: PilotoRef[], nomesJogo: string[], alias: Record<string, number> = {}): Map<number, number> {
  const ids = new Set(roster.map((r) => r.idPiloto));
  const escolhido = new Map<number, number>();
  nomesJogo.forEach((nome, k) => {
    const n = norm(nome);
    if (alias[n] && ids.has(alias[n])) return void escolhido.set(k, alias[n]);
    const pontos = roster.map((r) => ({ r, p: pontuar(r, n) })).filter((x) => x.p > 0);
    if (!pontos.length) return;
    const max = Math.max(...pontos.map((x) => x.p));
    const topo = pontos.filter((x) => x.p === max);
    if (topo.length === 1) escolhido.set(k, topo[0].r.idPiloto);
  });
  // dois nomes do jogo apontando para o mesmo piloto = ambíguo, descarta os dois
  const usos = new Map<number, number>();
  escolhido.forEach((id) => usos.set(id, (usos.get(id) ?? 0) + 1));
  [...escolhido.entries()].forEach(([k, id]) => {
    if ((usos.get(id) ?? 0) > 1 && !alias[norm(nomesJogo[k])]) escolhido.delete(k);
  });
  return escolhido;
}

/** idx (no array cars) do piloto com a melhor volta válida da sessão, ou null */
export function indiceMelhorVolta(cars: CarroFinal[]): number | null {
  let melhor: number | null = null;
  cars.forEach((c, k) => {
    if (c.melhorVoltaMs > 0 && (melhor === null || c.melhorVoltaMs < cars[melhor].melhorVoltaMs)) melhor = k;
  });
  return melhor;
}

export const formatarVolta = (ms: number) =>
  ms > 0 ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}` : '—';
