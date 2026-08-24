import { calcularClassificacaoPilotos, type DadosTemporada } from './classificacao';
import type { TbProva } from './types';

// Monta um texto pronto pra colar no grupo, tipo "Norris venceu na Espanha e
// ampliou a vantagem pra 14 pontos sobre Piastri, que largou da pole." — só
// usa dados que já foram gravados, sem nenhum trabalho extra.
export function gerarResumoProva(dados: DadosTemporada, prova: TbProva): string | null {
  const resultadosProva = dados.resultados.filter((r) => r.id_prova === prova.id && r.posicao);
  if (resultadosProva.length === 0) return null;

  const nome = (idPiloto: number) => dados.roster.find((r) => r.idPiloto === idPiloto)?.nomePiloto ?? `#${idPiloto}`;

  const ordenado = [...resultadosProva].sort((a, b) => (a.posicao as number) - (b.posicao as number));
  const [vencedor, segundo, terceiro] = ordenado;
  const poleSitter = dados.resultados.find((r) => r.id_prova === prova.id && r.pole);
  const voltaRapida = dados.resultados.find((r) => r.id_prova === prova.id && r.volta_mais_rapida);
  const sprintVencedor = dados.resultadosSprint.find((r) => r.id_prova === prova.id && r.posicao === 1);

  const frases: string[] = [];

  let fraseVitoria = `${nome(vencedor.id_piloto)} venceu em ${prova.nome_prova}`;
  if (segundo) fraseVitoria += `, com ${nome(segundo.id_piloto)} em 2º`;
  if (terceiro) fraseVitoria += ` e ${nome(terceiro.id_piloto)} em 3º`;
  frases.push(fraseVitoria + '.');

  if (poleSitter) {
    frases.push(
      poleSitter.id_piloto === vencedor.id_piloto
        ? `${nome(vencedor.id_piloto)} também fez a pole position.`
        : `${nome(poleSitter.id_piloto)} largou da pole.`
    );
  }
  if (voltaRapida) {
    frases.push(
      voltaRapida.id_piloto === vencedor.id_piloto
        ? `${nome(vencedor.id_piloto)} ainda cravou a volta mais rápida.`
        : `${nome(voltaRapida.id_piloto)} fez a volta mais rápida da corrida.`
    );
  }
  if (sprintVencedor) {
    frases.push(
      sprintVencedor.id_piloto === vencedor.id_piloto
        ? `${nome(vencedor.id_piloto)} também tinha vencido a sprint.`
        : `Na sprint, quem levou a melhor foi ${nome(sprintVencedor.id_piloto)}.`
    );
  }

  const classificacao = calcularClassificacaoPilotos(dados);
  if (classificacao.length >= 2) {
    const [lider, vice] = classificacao;
    const diferenca = lider.pontos - vice.pontos;
    frases.push(
      diferenca > 0
        ? `Na classificação geral, ${lider.nomePiloto} lidera com ${lider.pontos} pontos, ${diferenca} à frente de ${vice.nomePiloto}.`
        : `Na classificação geral, ${lider.nomePiloto} e ${vice.nomePiloto} estão empatados em pontos.`
    );
  }

  return frases.join(' ');
}
