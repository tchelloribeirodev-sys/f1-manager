import { f1 } from './supabaseClient';
import type { TipoCarreira } from './types';

export type PilotoOpcao = { id: number; nome_piloto: string; ano_jogo: number; temporada?: number };

export type Confronto = {
  vitoriasA: number;
  vitoriasB: number;
  polesA: number;
  polesB: number;
  podiosA: number;
  podiosB: number;
  posMediaA: number | null;
  posMediaB: number | null;
  cabeacabecaA: number; // corridas em que A terminou na frente de B (ambos com posição)
  cabeacabecaB: number;
  corridasComparadas: number;
};

// Todos os pilotos que já tiveram resultado lançado neste ano_jogo/carreira —
// não usa a mesma lista de "Cadastro de Recordes" (que já inclui aposentados)
// porque aqui faz sentido comparar só quem realmente correu naquele ano.
export async function carregarPilotosDoAno(anoJogo: number, tipoCarreira: TipoCarreira): Promise<PilotoOpcao[]> {
  const { data } = await f1()
    .from('tb_piloto')
    .select('id, nome_piloto, ano_jogo')
    .eq('ano_jogo', anoJogo)
    .eq('tipo_carreira', tipoCarreira)
    .order('nome_piloto');
  return (data as PilotoOpcao[]) ?? [];
}

// `temporada` opcional: quando informada, compara só as provas daquela
// temporada; quando omitida/null, compara ao longo de todo o ano_jogo (todas
// as temporadas), como sempre fez.
export async function carregarConfronto(
  anoJogo: number,
  tipoCarreira: TipoCarreira,
  idPilotoA: number,
  idPilotoB: number,
  temporada?: number | null
): Promise<Confronto> {
  let query = f1()
    .from('tb_resultado')
    .select('id_prova, temporada, id_piloto, posicao, pole')
    .eq('ano_jogo', anoJogo)
    .eq('tipo_carreira', tipoCarreira)
    .in('id_piloto', [idPilotoA, idPilotoB]);
  if (temporada) query = query.eq('temporada', temporada);
  const { data } = await query;

  const linhas = (data as { id_prova: number; temporada: number; id_piloto: number; posicao: number | null; pole: boolean }[]) ?? [];

  const resultado: Confronto = {
    vitoriasA: 0,
    vitoriasB: 0,
    polesA: 0,
    polesB: 0,
    podiosA: 0,
    podiosB: 0,
    posMediaA: null,
    posMediaB: null,
    cabeacabecaA: 0,
    cabeacabecaB: 0,
    corridasComparadas: 0
  };

  const somaPosA: number[] = [];
  const somaPosB: number[] = [];
  const porProva: Record<string, { a?: number | null; b?: number | null }> = {};

  linhas.forEach((l) => {
    const chave = `${l.temporada}|${l.id_prova}`;
    porProva[chave] = porProva[chave] ?? {};
    if (l.id_piloto === idPilotoA) {
      porProva[chave].a = l.posicao;
      if (l.posicao === 1) resultado.vitoriasA += 1;
      if (l.posicao && l.posicao <= 3) resultado.podiosA += 1;
      if (l.pole) resultado.polesA += 1;
      if (l.posicao) somaPosA.push(l.posicao);
    } else {
      porProva[chave].b = l.posicao;
      if (l.posicao === 1) resultado.vitoriasB += 1;
      if (l.posicao && l.posicao <= 3) resultado.podiosB += 1;
      if (l.pole) resultado.polesB += 1;
      if (l.posicao) somaPosB.push(l.posicao);
    }
  });

  Object.values(porProva).forEach(({ a, b }) => {
    if (!a || !b) return; // só entra na comparação corrida a corrida quando os dois terminaram
    resultado.corridasComparadas += 1;
    if (a < b) resultado.cabeacabecaA += 1;
    else if (b < a) resultado.cabeacabecaB += 1;
  });

  resultado.posMediaA = somaPosA.length ? somaPosA.reduce((a, b) => a + b, 0) / somaPosA.length : null;
  resultado.posMediaB = somaPosB.length ? somaPosB.reduce((a, b) => a + b, 0) / somaPosB.length : null;

  return resultado;
}
