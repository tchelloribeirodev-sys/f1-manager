import { f1 } from './supabaseClient';
import type { TipoCarreira } from './types';

// ============================================================================
// Importação — usada na tela "Ano do jogo" logo depois de gravar um ano
// novo, quando o ano anterior já tem dados. Copia parâmetros, pontuação
// (corrida + sprint), equipes e, dos Times, só a 1ª temporada do ano
// anterior (é a escalação mais próxima da realidade pra começar um ano
// novo — depois disso o usuário ajusta manualmente o que mudou).
// ============================================================================

export type ResumoImportacaoAno = {
  parametros: boolean;
  pontuacao: number;
  pontuacaoSprint: number;
  equipes: number;
  pilotos: number;
  times: number;
};

export async function importarAnoAnterior(
  anoOrigem: number,
  anoDestino: number,
  tipoCarreira: TipoCarreira
): Promise<ResumoImportacaoAno> {
  const resumo: ResumoImportacaoAno = {
    parametros: false,
    pontuacao: 0,
    pontuacaoSprint: 0,
    equipes: 0,
    pilotos: 0,
    times: 0
  };

  // 1) Parâmetros (tb_totais) — uma linha por ano_jogo, não depende de
  // tipo_carreira (é comum aos dois modos de carreira)
  const { data: totaisOrigem, error: erroTotaisSel } = await f1()
    .from('tb_totais')
    .select('equipes, provas, ponto_volta')
    .eq('ano_jogo', anoOrigem)
    .maybeSingle();
  if (erroTotaisSel) throw erroTotaisSel;
  if (totaisOrigem) {
    const { error } = await f1()
      .from('tb_totais')
      .insert({ ano_jogo: anoDestino, ...totaisOrigem });
    if (error) throw error;
    resumo.parametros = true;
  }

  // 2) Pontuação — corrida normal e sprint, também não depende de tipo_carreira
  const { data: pontuacaoOrigem, error: erroPontSel } = await f1()
    .from('tb_pontuacao')
    .select('posicao, pontos')
    .eq('ano_jogo', anoOrigem);
  if (erroPontSel) throw erroPontSel;
  if (pontuacaoOrigem && pontuacaoOrigem.length > 0) {
    const payload = pontuacaoOrigem.map((p) => ({ ano_jogo: anoDestino, ...p }));
    const { error } = await f1().from('tb_pontuacao').insert(payload);
    if (error) throw error;
    resumo.pontuacao = payload.length;
  }

  const { data: pontuacaoSprintOrigem, error: erroPontSprintSel } = await f1()
    .from('tb_pontuacao_sprint')
    .select('posicao, pontos')
    .eq('ano_jogo', anoOrigem);
  if (erroPontSprintSel) throw erroPontSprintSel;
  if (pontuacaoSprintOrigem && pontuacaoSprintOrigem.length > 0) {
    const payload = pontuacaoSprintOrigem.map((p) => ({ ano_jogo: anoDestino, ...p }));
    const { error } = await f1().from('tb_pontuacao_sprint').insert(payload);
    if (error) throw error;
    resumo.pontuacaoSprint = payload.length;
  }

  // 3) Equipes — copia todas as do ano anterior (mesmo tipo_carreira),
  // guardando id-antigo -> id-novo pra montar os Times a seguir
  const { data: equipesOrigem, error: erroEquipesSel } = await f1()
    .from('tb_equipe')
    .select('id, nome_equipe, cor_equipe, imagem_url')
    .eq('ano_jogo', anoOrigem)
    .eq('tipo_carreira', tipoCarreira);
  if (erroEquipesSel) throw erroEquipesSel;

  const mapaEquipes = new Map<number, number>();
  for (const eq of equipesOrigem ?? []) {
    const { data: nova, error } = await f1()
      .from('tb_equipe')
      .insert({
        ano_jogo: anoDestino,
        tipo_carreira: tipoCarreira,
        nome_equipe: eq.nome_equipe,
        cor_equipe: eq.cor_equipe,
        imagem_url: eq.imagem_url
      })
      .select('id')
      .single();
    if (error) throw error;
    mapaEquipes.set(eq.id, (nova as { id: number }).id);
    resumo.equipes++;
  }

  // 4) Pilotos — só os que correram na 1ª temporada do ano anterior
  const { data: timeOrigem, error: erroTimeSel } = await f1()
    .from('tb_time')
    .select('id_equipe, id_piloto, status_piloto, tb_piloto(nome_piloto, abreviacao_piloto, pais)')
    .eq('ano_jogo', anoOrigem)
    .eq('tipo_carreira', tipoCarreira)
    .eq('temporada', 1);
  if (erroTimeSel) throw erroTimeSel;

  const linhasTime = (timeOrigem as any[]) ?? [];
  const mapaPilotos = new Map<number, number>();
  for (const t of linhasTime) {
    if (mapaPilotos.has(t.id_piloto)) continue;
    const piloto = t.tb_piloto;
    const { data: novo, error } = await f1()
      .from('tb_piloto')
      .insert({
        ano_jogo: anoDestino,
        tipo_carreira: tipoCarreira,
        nome_piloto: piloto?.nome_piloto ?? `#${t.id_piloto}`,
        abreviacao_piloto: piloto?.abreviacao_piloto ?? '???',
        pais: piloto?.pais ?? null,
        aposentado: false
      })
      .select('id')
      .single();
    if (error) throw error;
    mapaPilotos.set(t.id_piloto, (novo as { id: number }).id);
    resumo.pilotos++;
  }

  // 5) Times — recria a escalação da 1ª temporada, já com os ids novos
  for (const t of linhasTime) {
    const novoIdEquipe = mapaEquipes.get(t.id_equipe);
    const novoIdPiloto = mapaPilotos.get(t.id_piloto);
    if (!novoIdEquipe || !novoIdPiloto) continue;
    const { error } = await f1().from('tb_time').insert({
      ano_jogo: anoDestino,
      tipo_carreira: tipoCarreira,
      temporada: 1,
      id_equipe: novoIdEquipe,
      id_piloto: novoIdPiloto,
      status_piloto: t.status_piloto
    });
    if (error) throw error;
    resumo.times++;
  }

  return resumo;
}

// acha o ano mais recente ANTES do informado que já tem parâmetros
// gravados (tb_totais é o indicador mais confiável de "ano configurado")
export async function buscarAnoAnteriorComParametros(ano: number): Promise<number | null> {
  const { data, error } = await f1()
    .from('tb_totais')
    .select('ano_jogo')
    .lt('ano_jogo', ano)
    .order('ano_jogo', { ascending: false })
    .limit(1);
  if (error) throw error;
  const linha = (data as { ano_jogo: number }[] | null)?.[0];
  return linha ? linha.ano_jogo : null;
}

// ============================================================================
// Exclusão de um ano — apaga de vez parâmetros, pontuação, equipes, pilotos, times
// e recordes do ano (nos dois tipos de carreira), o calendário de provas
// (tb_prova, com seus resultados) e, por fim, o próprio registro do ano em
// tb_ano — exclusão real, o ano deixa de existir no sistema.
//
// Ordem importa por causa das FKs:
//  - tb_time restringe (ON DELETE RESTRICT) a exclusão de equipe/piloto
//    enquanto houver escalação apontando pra eles, então vai primeiro;
//  - tb_totais/tb_pontuacao/tb_pontuacao_sprint/tb_prova/tb_equipe/tb_time
//    referenciam tb_ano(ano) — todos precisam estar limpos antes de apagar
//    a linha de tb_ano, senão o banco bloqueia a exclusão.
// ============================================================================
export async function excluirAno(ano: number): Promise<void> {
  // resultados (prova a prova) — tb_resultado/tb_resultado_sprint também
  // seriam apagados em cascata ao excluir piloto/prova, mas apagar explícito
  // aqui deixa a ordem clara e não depende de nenhuma cascade específica
  let { error } = await f1().from('tb_resultado').delete().eq('ano_jogo', ano);
  if (error) throw error;

  ({ error } = await f1().from('tb_resultado_sprint').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_time').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_recorde').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_equipe').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_piloto').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_prova').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_totais').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_pontuacao').delete().eq('ano_jogo', ano));
  if (error) throw error;

  ({ error } = await f1().from('tb_pontuacao_sprint').delete().eq('ano_jogo', ano));
  if (error) throw error;

  // por último: o registro do ano em si
  ({ error } = await f1().from('tb_ano').delete().eq('ano', ano));
  if (error) throw error;
}
