import { buscarTudoPaginado, f1 } from './supabaseClient';
import { ANO_APOSENTADO } from './types';
import type { TbRecorde, TipoCarreira } from './types';

type LinhaResultado = { id_piloto: number; posicao: number | null; pole: boolean; volta_mais_rapida: boolean };

export type LinhaRecorde = {
  idPiloto: number;
  nomePiloto: string;
  aposentado: boolean;
  vitorias: number;
  poles: number;
  voltasMaisRapidas: number;
  podios: number;
};

// Recordes "atuais" para o ano_jogo e temporada selecionados: para pilotos em
// atividade, soma o valor-base gravado em Cadastro de Recordes (acumulado até
// o ano anterior) com tudo que já foi disputado nas temporadas do ano_jogo
// corrente ATÉ a temporada informada (tb_resultado, temporada <= a
// selecionada) — assim o total cresce temporada a temporada, e não já conta
// de uma vez tudo que ainda vai rolar nas temporadas seguintes. Pilotos
// aposentados (ano_jogo=2000) não têm resultados em nenhum ano_jogo real,
// então o total mostrado é sempre igual ao valor-base — fixo, como deve ser.
export async function carregarRecordesAtuais(
  anoJogo: number,
  tipoCarreira: TipoCarreira,
  temporada: number
): Promise<LinhaRecorde[]> {
  const [{ data: recData }, { data: pilotosData }, resData] = await Promise.all([
    f1()
      .from('tb_recorde')
      .select('*')
      .eq('tipo_carreira', tipoCarreira)
      .or(`ano_jogo.eq.${anoJogo},ano_jogo.eq.${ANO_APOSENTADO}`),
    f1()
      .from('tb_piloto')
      .select('id, nome_piloto, aposentado')
      .or(`and(ano_jogo.eq.${anoJogo},tipo_carreira.eq.${tipoCarreira}),ano_jogo.eq.${ANO_APOSENTADO}`),
    // Paginado: com várias temporadas somadas, essa consulta facilmente passa
    // das 1000 linhas que o Supabase devolve por padrão numa única resposta —
    // sem paginar, as linhas das temporadas mais recentes (inseridas depois,
    // portanto no fim da ordenação) ficavam de fora EM SILÊNCIO, fazendo o
    // total mostrado na tela "parar" numa temporada anterior à selecionada.
    buscarTudoPaginado<LinhaResultado>((from, to) =>
      f1()
        .from('tb_resultado')
        .select('id_piloto, posicao, pole, volta_mais_rapida')
        .eq('ano_jogo', anoJogo)
        .eq('tipo_carreira', tipoCarreira)
        .lte('temporada', temporada)
        .range(from, to)
    )
  ]);

  const recPorPiloto = new Map<number, TbRecorde>();
  ((recData as TbRecorde[]) ?? []).forEach((r) => recPorPiloto.set(r.id_piloto, r));

  type Agregado = { vitorias: number; poles: number; voltas: number; podios: number };
  const agregadoAno: Record<number, Agregado> = {};
  resData.forEach((r) => {
    const item = (agregadoAno[r.id_piloto] ??= { vitorias: 0, poles: 0, voltas: 0, podios: 0 });
    if (r.posicao === 1) item.vitorias += 1;
    if (r.posicao && r.posicao <= 3) item.podios += 1;
    if (r.pole) item.poles += 1;
    if (r.volta_mais_rapida) item.voltas += 1;
  });

  // Percorre TODOS os pilotos elegíveis (não só os que já têm linha em
  // tb_recorde) — senão um piloto que só tem resultados lançados em Prova a
  // Prova, mas nunca passou por Cadastro de Recordes, some da tela inteira
  // em vez de aparecer com a base zerada + o que ele já correu.
  return ((pilotosData as { id: number; nome_piloto: string; aposentado: boolean }[]) ?? []).map((p) => {
    const rec = recPorPiloto.get(p.id);
    const ao = agregadoAno[p.id];
    return {
      idPiloto: p.id,
      nomePiloto: p.nome_piloto,
      aposentado: p.aposentado,
      vitorias: (rec?.vitorias ?? 0) + (ao?.vitorias ?? 0),
      poles: (rec?.poles ?? 0) + (ao?.poles ?? 0),
      voltasMaisRapidas: (rec?.voltas_mais_rapidas ?? 0) + (ao?.voltas ?? 0),
      podios: (rec?.podios ?? 0) + (ao?.podios ?? 0)
    };
  });
}

// Pilotos elegíveis para receber um registro de recorde: os aposentados
// (base fixa) + os pilotos do ano_jogo/carreira selecionados atualmente —
// mesma consulta usada em PilotosPage.
export async function carregarPilotosParaRecorde(anoJogo: number, tipoCarreira: TipoCarreira) {
  const { data } = await f1()
    .from('tb_piloto')
    .select('id, nome_piloto, ano_jogo, aposentado')
    .or(`and(ano_jogo.eq.${anoJogo},tipo_carreira.eq.${tipoCarreira}),ano_jogo.eq.${ANO_APOSENTADO}`)
    .order('nome_piloto');
  return (data as { id: number; nome_piloto: string; ano_jogo: number; aposentado: boolean }[]) ?? [];
}
