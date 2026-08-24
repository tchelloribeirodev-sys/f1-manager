import { useEffect, useMemo, useRef, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import type { TbProva, TbResultado, TbResultadoSprint } from '../lib/types';
import { carregarDadosTemporada } from '../lib/classificacao';
import { gerarResumoProva } from '../lib/resumo';
import { sobrenome, sobrenomesComDesambiguacao } from '../lib/nomes';

type Roster = {
  idPiloto: number;
  nomePiloto: string;
  idEquipe: number;
  nomeEquipe: string;
  corEquipe: string;
};

type LinhaForm = {
  posicao: string;
  pole: boolean;
  voltaMaisRapida: boolean;
  posicaoSprint: string;
};

export default function ProvaAProvaPage() {
  const { anoJogo, tipoCarreira, temporada } = useAppContext();
  const [provas, setProvas] = useState<TbProva[]>([]);
  const [provaId, setProvaId] = useState<number | null>(null);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [linhas, setLinhas] = useState<Record<number, LinhaForm>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [quickPiloto, setQuickPiloto] = useState<number | ''>('');
  const [quickPosicao, setQuickPosicao] = useState('');
  const [quickPosicaoSprint, setQuickPosicaoSprint] = useState('');
  const quickPosicaoRef = useRef<HTMLInputElement>(null);
  const quickPosicaoSprintRef = useRef<HTMLInputElement>(null);

  const [resumo, setResumo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const provaAtual = useMemo(() => provas.find((p) => p.id === provaId) ?? null, [provas, provaId]);

  // pilotos ainda sem posição lançada nesta prova — para agilizar o preenchimento
  // sequencial: assim que um piloto recebe posição, ele some da lista do combo rápido.
  const rosterOrdenado = useMemo(
    () => [...roster].sort((a, b) => a.nomePiloto.localeCompare(b.nomePiloto)),
    [roster]
  );
  // sobrenome curto pra exibir no combo — com desambiguação automática se
  // dois pilotos do elenco tiverem o mesmo sobrenome
  const sobrenomesCurto = useMemo(
    () => sobrenomesComDesambiguacao(rosterOrdenado, (r) => r.nomePiloto),
    [rosterOrdenado]
  );
  const pilotosSemPosicao = useMemo(
    () => rosterOrdenado.filter((r) => !linhas[r.idPiloto]?.posicao),
    [rosterOrdenado, linhas]
  );

  // ---- carregar calendário + escalação quando ano/carreira/temporada mudam ----
  useEffect(() => {
    async function carregarBase() {
      setErro(null);
      setAviso(null);
      if (!anoJogo) {
        setProvas([]);
        setRoster([]);
        return;
      }

      const [{ data: provasData }, { data: timeData }] = await Promise.all([
        f1().from('tb_prova').select('*').eq('ano_jogo', anoJogo).order('ordem'),
        f1()
          .from('tb_time')
          .select('id_piloto, id_equipe, tb_piloto(nome_piloto), tb_equipe(nome_equipe, cor_equipe)')
          .eq('ano_jogo', anoJogo)
          .eq('tipo_carreira', tipoCarreira)
          .eq('temporada', temporada)
          .order('id_equipe')
      ]);

      const listaProvas = (provasData as TbProva[]) ?? [];
      setProvas(listaProvas);
      setProvaId((atual) => atual ?? listaProvas[0]?.id ?? null);

      const listaRoster: Roster[] = ((timeData as any[]) ?? []).map((t) => ({
        idPiloto: t.id_piloto,
        nomePiloto: t.tb_piloto?.nome_piloto ?? `#${t.id_piloto}`,
        idEquipe: t.id_equipe,
        nomeEquipe: t.tb_equipe?.nome_equipe ?? `#${t.id_equipe}`,
        corEquipe: t.tb_equipe?.cor_equipe ?? '#666'
      }));
      setRoster(listaRoster);
      if (listaRoster.length === 0) {
        setAviso('Não há pilotos escalados nesta temporada — cadastre a escalação em Times antes de lançar resultados.');
      }
    }
    carregarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo, tipoCarreira, temporada]);

  // ---- carregar resultados já lançados da prova selecionada ----
  useEffect(() => {
    async function carregarResultadosDaProva() {
      if (!anoJogo || !provaId || roster.length === 0) return;

      const [{ data: resData }, { data: sprintData }] = await Promise.all([
        f1()
          .from('tb_resultado')
          .select('*')
          .eq('ano_jogo', anoJogo)
          .eq('temporada', temporada)
          .eq('tipo_carreira', tipoCarreira)
          .eq('id_prova', provaId),
        f1()
          .from('tb_resultado_sprint')
          .select('*')
          .eq('ano_jogo', anoJogo)
          .eq('temporada', temporada)
          .eq('tipo_carreira', tipoCarreira)
          .eq('id_prova', provaId)
      ]);

      const porPiloto: Record<number, TbResultado> = {};
      ((resData as TbResultado[]) ?? []).forEach((r) => (porPiloto[r.id_piloto] = r));
      const sprintPorPiloto: Record<number, TbResultadoSprint> = {};
      ((sprintData as TbResultadoSprint[]) ?? []).forEach((r) => (sprintPorPiloto[r.id_piloto] = r));

      const novasLinhas: Record<number, LinhaForm> = {};
      roster.forEach((r) => {
        const res = porPiloto[r.idPiloto];
        const sprintRes = sprintPorPiloto[r.idPiloto];
        novasLinhas[r.idPiloto] = {
          posicao: res?.posicao ? String(res.posicao) : '',
          pole: res?.pole ?? false,
          voltaMaisRapida: res?.volta_mais_rapida ?? false,
          posicaoSprint: sprintRes?.posicao ? String(sprintRes.posicao) : ''
        };
      });
      setLinhas(novasLinhas);
      setQuickPiloto('');
      setQuickPosicao('');
      setQuickPosicaoSprint('');
    }
    carregarResultadosDaProva();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provaId, roster]);

  function atualizarLinha(idPiloto: number, patch: Partial<LinhaForm>) {
    setLinhas((atual) => ({ ...atual, [idPiloto]: { ...atual[idPiloto], ...patch } }));
  }

  // Resumo automático da prova selecionada: precisa da temporada inteira (não
  // só desta prova) pra poder falar a diferença de pontos na classificação
  // geral após esta corrida.
  async function atualizarResumo() {
    if (!anoJogo || !provaId || !provaAtual) return setResumo(null);
    const dados = await carregarDadosTemporada(anoJogo, temporada, tipoCarreira);
    setResumo(gerarResumoProva(dados, provaAtual));
  }

  useEffect(() => {
    setCopiado(false);
    atualizarResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provaId, provaAtual]);

  function copiarResumo() {
    if (!resumo) return;
    navigator.clipboard.writeText(resumo).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  // preenche a posição (e, em corrida sprint, a posição da sprint) do piloto
  // escolhido no combo rápido (sem gravar no banco — isso só acontece quando
  // "Salvar" é clicado) e já prepara o próximo piloto pendente, para permitir
  // ir digitando posição a posição sem tirar a mão do teclado.
  function adicionarRapido() {
    if (!quickPiloto || (!quickPosicao && !quickPosicaoSprint)) return;
    const patch: Partial<LinhaForm> = {};
    if (quickPosicao) patch.posicao = quickPosicao;
    if (quickPosicaoSprint) patch.posicaoSprint = quickPosicaoSprint;
    atualizarLinha(quickPiloto, patch);

    const proximo = pilotosSemPosicao.find((r) => r.idPiloto !== quickPiloto);
    setQuickPiloto(proximo?.idPiloto ?? '');
    setQuickPosicao('');
    setQuickPosicaoSprint('');
    quickPosicaoRef.current?.focus();
  }

  function definirPole(idPiloto: number) {
    setLinhas((atual) => {
      const novo: Record<number, LinhaForm> = {};
      const jaEraPole = atual[idPiloto]?.pole;
      for (const [id, linha] of Object.entries(atual)) {
        novo[Number(id)] = { ...linha, pole: !jaEraPole && Number(id) === idPiloto };
      }
      return novo;
    });
  }

  function definirVoltaMaisRapida(idPiloto: number) {
    setLinhas((atual) => {
      const novo: Record<number, LinhaForm> = {};
      const jaEra = atual[idPiloto]?.voltaMaisRapida;
      for (const [id, linha] of Object.entries(atual)) {
        novo[Number(id)] = { ...linha, voltaMaisRapida: !jaEra && Number(id) === idPiloto };
      }
      return novo;
    });
  }

  // Grava resultado principal e/ou de sprint — de forma independente: dá pra
  // gravar só a sprint primeiro (deixando a posição principal em branco) e,
  // num segundo momento, voltar nesta mesma tela e gravar o resultado
  // principal, sem perder o que já foi salvo da sprint.
  async function salvar() {
    if (!anoJogo || !provaId) return;
    setSalvando(true);
    setErro(null);

    const filtroBase = {
      ano_jogo: anoJogo,
      temporada,
      id_prova: provaId,
      tipo_carreira: tipoCarreira
    };

    // substitui por completo o resultado desta prova/temporada — mais simples
    // do que ficar comparando linha a linha o que mudou ou não.
    const { error: errDel } = await f1()
      .from('tb_resultado')
      .delete()
      .match(filtroBase);
    if (errDel) {
      setSalvando(false);
      return setErro(errDel.message);
    }

    const linhasResultado = roster
      .map((r) => {
        const l = linhas[r.idPiloto];
        if (!l) return null;
        const posicao = l.posicao ? Number(l.posicao) : null;
        if (!posicao && !l.pole && !l.voltaMaisRapida) return null;
        return { ...filtroBase, id_piloto: r.idPiloto, posicao, pole: l.pole, volta_mais_rapida: l.voltaMaisRapida };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (linhasResultado.length > 0) {
      const { error: errIns } = await f1().from('tb_resultado').insert(linhasResultado);
      if (errIns) {
        setSalvando(false);
        return setErro(errIns.message);
      }
    }

    if (provaAtual?.sprint) {
      const { error: errDelSprint } = await f1().from('tb_resultado_sprint').delete().match(filtroBase);
      if (errDelSprint) {
        setSalvando(false);
        return setErro(errDelSprint.message);
      }

      const linhasSprint = roster
        .map((r) => {
          const l = linhas[r.idPiloto];
          if (!l?.posicaoSprint) return null;
          return { ...filtroBase, id_piloto: r.idPiloto, posicao: Number(l.posicaoSprint) };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (linhasSprint.length > 0) {
        const { error: errInsSprint } = await f1().from('tb_resultado_sprint').insert(linhasSprint);
        if (errInsSprint) {
          setSalvando(false);
          return setErro(errInsSprint.message);
        }
      }
    }

    setSalvando(false);
    await atualizarResumo();
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}
      {aviso && <div className="banner-warn">{aviso}</div>}

      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>
      ) : roster.length === 0 ? null : (
        <>
          <div className="form-card form-grid">
            <div className="field">
              <label>Prova</label>
              <div className="select-wrap">
                <select value={provaId ?? ''} onChange={(e) => setProvaId(Number(e.target.value))}>
                  {provas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {String(p.ordem).padStart(2, '0')} — {p.nome_prova}
                      {p.sprint ? ' (sprint)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Add rápido — piloto</label>
              <div className="select-wrap">
                <select
                  value={quickPiloto}
                  onChange={(e) => setQuickPiloto(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Selecione...</option>
                  {rosterOrdenado.map((r) => (
                    <option key={r.idPiloto} value={r.idPiloto} disabled={!!linhas[r.idPiloto]?.posicao}>
                      {sobrenomesCurto.get(r) ?? sobrenome(r.nomePiloto)}
                      {linhas[r.idPiloto]?.posicao ? ` (P${linhas[r.idPiloto].posicao})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Posição</label>
              <input
                ref={quickPosicaoRef}
                type="number"
                min={1}
                value={quickPosicao}
                onChange={(e) => setQuickPosicao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (provaAtual?.sprint) quickPosicaoSprintRef.current?.focus();
                    else adicionarRapido();
                  }
                }}
                style={{ width: 80, minWidth: 0 }}
              />
            </div>
            {provaAtual?.sprint && (
              <div className="field">
                <label>Sprint</label>
                <input
                  ref={quickPosicaoSprintRef}
                  type="number"
                  min={1}
                  value={quickPosicaoSprint}
                  onChange={(e) => setQuickPosicaoSprint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarRapido();
                    }
                  }}
                  style={{ width: 80, minWidth: 0 }}
                />
              </div>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={adicionarRapido}
              disabled={!quickPiloto || (!quickPosicao && !quickPosicaoSprint)}
            >
              Add
            </button>

            <button type="button" className="btn-primary" onClick={salvar} disabled={salvando || !provaId}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          {resumo && (
            <div className="resumo-card">
              <div className="resumo-head">
                <strong>Resumo automático</strong>
                <button type="button" className="btn-ghost" onClick={copiarResumo}>
                  {copiado ? 'Copiado ✓' : 'Copiar'}
                </button>
              </div>
              <p>{resumo}</p>
            </div>
          )}

          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Piloto</th>
                    <th>Equipe</th>
                    <th>Posição</th>
                    <th>Pole</th>
                    <th>VR</th>
                    {provaAtual?.sprint && <th>Pos. Sprint</th>}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r) => {
                    const linha = linhas[r.idPiloto] ?? { posicao: '', pole: false, voltaMaisRapida: false, posicaoSprint: '' };
                    return (
                      <tr key={r.idPiloto}>
                        <td>
                          <div className="driver-cell">
                            <strong>{r.nomePiloto}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="team-cell">
                            <span className="team-dot" style={{ background: r.corEquipe }} />
                            {r.nomeEquipe}
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            value={linha.posicao}
                            onChange={(e) => atualizarLinha(r.idPiloto, { posicao: e.target.value })}
                            style={{ width: 60, minWidth: 0 }}
                          />
                        </td>
                        <td>
                          <input type="checkbox" checked={linha.pole} onChange={() => definirPole(r.idPiloto)} />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={linha.voltaMaisRapida}
                            onChange={() => definirVoltaMaisRapida(r.idPiloto)}
                          />
                        </td>
                        {provaAtual?.sprint && (
                          <td>
                            <input
                              type="number"
                              min={1}
                              value={linha.posicaoSprint}
                              onChange={(e) => atualizarLinha(r.idPiloto, { posicaoSprint: e.target.value })}
                              style={{ width: 60, minWidth: 0 }}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
