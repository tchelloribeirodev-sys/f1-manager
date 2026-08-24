import {
  calcularClassificacaoEquipes,
  calcularClassificacaoPilotos,
  carregarDadosTemporada,
  type DadosTemporada
} from './classificacao';
import type { TipoCarreira } from './types';

// pontos de UMA prova (corrida + sprint), somando o ponto extra de volta se configurado
function pontosDaProva(dados: DadosTemporada, idPiloto: number, idProva: number): number {
  let pts = 0;
  dados.resultados
    .filter((r) => r.id_prova === idProva && r.id_piloto === idPiloto)
    .forEach((r) => {
      if (r.posicao) pts += dados.pontosPorPosicao[r.posicao] ?? 0;
      if (r.volta_mais_rapida && dados.totais?.ponto_volta) pts += 1;
    });
  dados.resultadosSprint
    .filter((r) => r.id_prova === idProva && r.id_piloto === idPiloto && r.posicao)
    .forEach((r) => {
      pts += dados.pontosSprintPorPosicao[r.posicao as number] ?? 0;
    });
  return pts;
}

export type PontoGraficoEquipes = { temporadaLabel: string; [chave: string]: number | string };
export type SerieEquipe = { chave: string; nome: string; cor: string };

// Total acumulado de pontos por equipe, temporada a temporada — cada ponto
// do eixo X é uma temporada inteira daquele ano_jogo (1ª, 2ª, 3ª...), com o
// total de pontos que a equipe fez naquela temporada, e a linha soma o
// acumulado à medida que as temporadas avançam. Só entram temporadas que já
// têm escalação cadastrada (ignora as que ainda nem começaram).
export async function carregarEvolucaoEquipes(
  anoJogo: number,
  tipoCarreira: TipoCarreira
): Promise<{ pontos: PontoGraficoEquipes[]; series: SerieEquipe[] }> {
  const temporadas = Array.from({ length: 10 }, (_, i) => i + 1);
  const dadosPorTemporada = await Promise.all(
    temporadas.map((t) => carregarDadosTemporada(anoJogo, t, tipoCarreira))
  );

  const equipesMap = new Map<number, { nome: string; cor: string }>();
  dadosPorTemporada.forEach((dados) => {
    dados.roster.forEach((r) => equipesMap.set(r.idEquipe, { nome: r.nomeEquipe, cor: r.corEquipe }));
  });

  const acumulado: Record<number, number> = {};
  const pontos: PontoGraficoEquipes[] = [];

  dadosPorTemporada.forEach((dados, i) => {
    if (dados.roster.length === 0) return; // temporada ainda não configurada — não entra no gráfico

    const pilotos = calcularClassificacaoPilotos(dados);
    const equipesDaTemporada = calcularClassificacaoEquipes(pilotos);
    equipesDaTemporada.forEach((eq) => {
      acumulado[eq.idEquipe] = (acumulado[eq.idEquipe] ?? 0) + eq.pontos;
    });

    const registro: PontoGraficoEquipes = { temporadaLabel: `T${temporadas[i]}` };
    equipesMap.forEach((_info, idEquipe) => {
      registro[`eq${idEquipe}`] = acumulado[idEquipe] ?? 0;
    });
    pontos.push(registro);
  });

  const series: SerieEquipe[] = Array.from(equipesMap.entries()).map(([id, info]) => ({
    chave: `eq${id}`,
    nome: info.nome,
    cor: info.cor
  }));

  return { pontos, series };
}

export type PontoGraficoPilotos = { provaLabel: string; [chave: string]: number | string };
export type SeriePiloto = { chave: string; nome: string; cor: string };

// paleta pedida (vermelho, azul, verde, laranja) — "preto" foi trocado por um
// cinza claro porque preto puro fica invisível no fundo escuro do app.
const CORES_PILOTOS = ['#e10600', '#3a86ff', '#c9c9d4', '#2ecc71', '#ff9f1c'];

// Evolução de pontos dos 5 primeiros colocados da temporada, prova a prova.
export async function carregarEvolucaoPilotos(
  anoJogo: number,
  tipoCarreira: TipoCarreira,
  temporada: number
): Promise<{ pontos: PontoGraficoPilotos[]; series: SeriePiloto[] }> {
  const dados = await carregarDadosTemporada(anoJogo, temporada, tipoCarreira);
  const classificacaoFinal = calcularClassificacaoPilotos(dados);
  const top5 = classificacaoFinal.slice(0, 5);

  const acum: Record<number, number> = {};
  const provasOrdenadas = [...dados.provas].sort((a, b) => a.ordem - b.ordem);

  const pontos: PontoGraficoPilotos[] = provasOrdenadas.map((prova) => {
    top5.forEach((p) => {
      const pts = pontosDaProva(dados, p.idPiloto, prova.id);
      if (pts) acum[p.idPiloto] = (acum[p.idPiloto] ?? 0) + pts;
    });
    const registro: PontoGraficoPilotos = { provaLabel: prova.abreviacao_prova };
    top5.forEach((p) => {
      registro[`p${p.idPiloto}`] = acum[p.idPiloto] ?? 0;
    });
    return registro;
  });

  const series: SeriePiloto[] = top5.map((p, i) => ({
    chave: `p${p.idPiloto}`,
    nome: p.nomePiloto,
    cor: CORES_PILOTOS[i] ?? '#e8edf5'
  }));

  return { pontos, series };
}
