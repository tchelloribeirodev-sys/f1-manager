import { f1 } from './supabaseClient';
import type { TbPontuacao, TbProva, TbResultado, TbResultadoSprint, TbTotais, TipoCarreira } from './types';

export type RosterItem = {
  idPiloto: number;
  nomePiloto: string;
  abreviacaoPiloto: string;
  idEquipe: number;
  nomeEquipe: string;
  corEquipe: string;
};

export type DadosTemporada = {
  provas: TbProva[];
  roster: RosterItem[];
  totais: TbTotais | null;
  pontosPorPosicao: Record<number, number>;
  pontosSprintPorPosicao: Record<number, number>;
  resultados: TbResultado[];
  resultadosSprint: TbResultadoSprint[];
  erros: string[];
};

// Carrega tudo que é necessário para montar qualquer tela de classificação
// (Geral ou Prova a Prova) de uma vez só: calendário, escalação, pontuação
// configurada e todos os resultados já lançados na temporada.
export async function carregarDadosTemporada(
  anoJogo: number,
  temporada: number,
  tipoCarreira: TipoCarreira
): Promise<DadosTemporada> {
  const [
    { data: provasData, error: errProvas },
    { data: timeData, error: errTime },
    { data: totaisData, error: errTotais },
    { data: pontuacaoData, error: errPontuacao },
    { data: pontuacaoSprintData, error: errPontuacaoSprint },
    { data: resData, error: errRes },
    { data: sprintData, error: errSprint }
  ] = await Promise.all([
    f1().from('tb_prova').select('*').eq('ano_jogo', anoJogo).order('ordem'),
    f1()
      .from('tb_time')
      .select('id_piloto, id_equipe, tb_piloto(nome_piloto, abreviacao_piloto), tb_equipe(nome_equipe, cor_equipe)')
      .eq('ano_jogo', anoJogo)
      .eq('tipo_carreira', tipoCarreira)
      .eq('temporada', temporada)
      .order('id_equipe'),
    f1().from('tb_totais').select('*').eq('ano_jogo', anoJogo).maybeSingle(),
    f1().from('tb_pontuacao').select('*').eq('ano_jogo', anoJogo),
    f1().from('tb_pontuacao_sprint').select('*').eq('ano_jogo', anoJogo),
    f1()
      .from('tb_resultado')
      .select('*')
      .eq('ano_jogo', anoJogo)
      .eq('temporada', temporada)
      .eq('tipo_carreira', tipoCarreira),
    f1()
      .from('tb_resultado_sprint')
      .select('*')
      .eq('ano_jogo', anoJogo)
      .eq('temporada', temporada)
      .eq('tipo_carreira', tipoCarreira)
  ]);

  const roster: RosterItem[] = ((timeData as any[]) ?? []).map((t) => ({
    idPiloto: t.id_piloto,
    nomePiloto: t.tb_piloto?.nome_piloto ?? `#${t.id_piloto}`,
    abreviacaoPiloto: t.tb_piloto?.abreviacao_piloto ?? '???',
    idEquipe: t.id_equipe,
    nomeEquipe: t.tb_equipe?.nome_equipe ?? `#${t.id_equipe}`,
    corEquipe: t.tb_equipe?.cor_equipe ?? '#666'
  }));

  const pontosPorPosicao: Record<number, number> = {};
  ((pontuacaoData as TbPontuacao[]) ?? []).forEach((p) => (pontosPorPosicao[p.posicao] = p.pontos));
  const pontosSprintPorPosicao: Record<number, number> = {};
  ((pontuacaoSprintData as TbPontuacao[]) ?? []).forEach((p) => (pontosSprintPorPosicao[p.posicao] = p.pontos));

  const erros = [errProvas, errTime, errTotais, errPontuacao, errPontuacaoSprint, errRes, errSprint]
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map((e) => e.message);
  if (erros.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[classificacao] erro ao carregar dados da temporada:', erros);
  }

  return {
    provas: (provasData as TbProva[]) ?? [],
    roster,
    totais: (totaisData as TbTotais) ?? null,
    pontosPorPosicao,
    pontosSprintPorPosicao,
    resultados: (resData as TbResultado[]) ?? [],
    resultadosSprint: (sprintData as TbResultadoSprint[]) ?? [],
    erros
  };
}

export type LinhaClassificacao = {
  idPiloto: number;
  nomePiloto: string;
  idEquipe: number;
  nomeEquipe: string;
  corEquipe: string;
  pontos: number;
  vitorias: number;
  poles: number;
  voltas: number;
  podios: number;
};

// Calcula a classificação de pilotos. Se `idsProvasConsideradas` for informado,
// só entram no cálculo os resultados dessas provas (usado pela tela "até esta prova");
// se omitido, considera tudo que já foi lançado na temporada (tela "Geral").
export function calcularClassificacaoPilotos(
  dados: DadosTemporada,
  idsProvasConsideradas?: Set<number>
): LinhaClassificacao[] {
  const acumulado: Record<number, LinhaClassificacao> = {};
  dados.roster.forEach((r) => {
    acumulado[r.idPiloto] = {
      idPiloto: r.idPiloto,
      nomePiloto: r.nomePiloto,
      idEquipe: r.idEquipe,
      nomeEquipe: r.nomeEquipe,
      corEquipe: r.corEquipe,
      pontos: 0,
      vitorias: 0,
      poles: 0,
      voltas: 0,
      podios: 0
    };
  });

  dados.resultados.forEach((r) => {
    if (idsProvasConsideradas && !idsProvasConsideradas.has(r.id_prova)) return;
    const item = acumulado[r.id_piloto];
    if (!item) return;
    if (r.posicao) {
      item.pontos += dados.pontosPorPosicao[r.posicao] ?? 0;
      if (r.posicao === 1) item.vitorias += 1;
      if (r.posicao <= 3) item.podios += 1;
    }
    if (r.pole) item.poles += 1;
    if (r.volta_mais_rapida) {
      item.voltas += 1;
      if (dados.totais?.ponto_volta) item.pontos += 1;
    }
  });

  dados.resultadosSprint.forEach((r) => {
    if (idsProvasConsideradas && !idsProvasConsideradas.has(r.id_prova)) return;
    const item = acumulado[r.id_piloto];
    if (!item || !r.posicao) return;
    item.pontos += dados.pontosSprintPorPosicao[r.posicao] ?? 0;
  });

  return Object.values(acumulado).sort((a, b) => b.pontos - a.pontos);
}

export type LinhaEquipe = {
  idEquipe: number;
  nomeEquipe: string;
  corEquipe: string;
  pontos: number;
  vitorias: number;
  poles: number;
  voltas: number;
  podios: number;
};

// Agrega a classificação de pilotos por equipe (a equipe de cada piloto na
// temporada já vem fixada pela escalação em Times).
export function calcularClassificacaoEquipes(pilotos: LinhaClassificacao[]): LinhaEquipe[] {
  const acumulado: Record<number, LinhaEquipe> = {};
  pilotos.forEach((p) => {
    if (!acumulado[p.idEquipe]) {
      acumulado[p.idEquipe] = {
        idEquipe: p.idEquipe,
        nomeEquipe: p.nomeEquipe,
        corEquipe: p.corEquipe,
        pontos: 0,
        vitorias: 0,
        poles: 0,
        voltas: 0,
        podios: 0
      };
    }
    const eq = acumulado[p.idEquipe];
    eq.pontos += p.pontos;
    eq.vitorias += p.vitorias;
    eq.poles += p.poles;
    eq.voltas += p.voltas;
    eq.podios += p.podios;
  });
  return Object.values(acumulado).sort((a, b) => b.pontos - a.pontos);
}

export type SituacaoTitulo = {
  provasRestantes: number;
  sprintsRestantes: number;
  pilotos: { liderNome: string | null; diferenca: number; pontosEmDisputa: number; decidido: boolean };
  equipes: { liderNome: string | null; diferenca: number; pontosEmDisputa: number; decidido: boolean };
};

// Mesma lógica do sistema em Delphi: uma prova "resta" quando ainda não tem
// nenhum resultado lançado nesta temporada. Para cada prova restante, soma o
// máximo de pontos que ainda podem ser disputados (1º lugar + ponto de volta
// mais rápida, e sprint quando a prova tem sprint) — usando a pontuação
// configurada deste ano_jogo, em vez de valores fixos como no Delphi. Se a
// vantagem do líder já for maior que esse máximo, o 2º colocado não alcança
// mais: título matematicamente decidido.
export function calcularSituacaoTitulo(
  dados: DadosTemporada,
  pilotos: LinhaClassificacao[],
  equipes: LinhaEquipe[]
): SituacaoTitulo {
  const idsComResultado = new Set(dados.resultados.map((r) => r.id_prova));
  const provasRestantes = dados.provas.filter((p) => !idsComResultado.has(p.id));

  const pontoVolta = dados.totais?.ponto_volta ? 1 : 0;
  const p1 = dados.pontosPorPosicao[1] ?? 0;
  const p2 = dados.pontosPorPosicao[2] ?? 0;
  const s1 = dados.pontosSprintPorPosicao[1] ?? 0;
  const s2 = dados.pontosSprintPorPosicao[2] ?? 0;

  let maxPiloto = 0;
  let maxEquipe = 0;
  provasRestantes.forEach((p) => {
    maxPiloto += p1 + pontoVolta;
    maxEquipe += p1 + p2 + pontoVolta;
    if (p.sprint) {
      maxPiloto += s1;
      maxEquipe += s1 + s2;
    }
  });

  const diferencaPilotos = (pilotos[0]?.pontos ?? 0) - (pilotos[1]?.pontos ?? 0);
  const diferencaEquipes = (equipes[0]?.pontos ?? 0) - (equipes[1]?.pontos ?? 0);

  return {
    provasRestantes: provasRestantes.length,
    sprintsRestantes: provasRestantes.filter((p) => p.sprint).length,
    pilotos: {
      liderNome: pilotos[0]?.nomePiloto ?? null,
      diferenca: diferencaPilotos,
      pontosEmDisputa: maxPiloto,
      decidido: pilotos.length > 0 && diferencaPilotos > maxPiloto
    },
    equipes: {
      liderNome: equipes[0]?.nomeEquipe ?? null,
      diferenca: diferencaEquipes,
      pontosEmDisputa: maxEquipe,
      decidido: equipes.length > 0 && diferencaEquipes > maxEquipe
    }
  };
}
