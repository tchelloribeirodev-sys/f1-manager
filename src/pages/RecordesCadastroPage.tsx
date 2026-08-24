import { useEffect, useMemo, useRef, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { carregarPilotosParaRecorde } from '../lib/recordes';
import { ANO_APOSENTADO } from '../lib/types';
import type { TbRecorde } from '../lib/types';
import {
  buscarTotaisAte,
  carregarTodosDrivers,
  encontrarCandidatos,
  type CandidatoDriver,
  type TotaisJolpica
} from '../lib/jolpica';

type PilotoOpcao = { id: number; nome_piloto: string; ano_jogo: number; aposentado: boolean };

type LinhaImport = {
  idPiloto: number;
  nomePiloto: string;
  aposentado: boolean;
  status: 'ok' | 'ambiguo' | 'nao_encontrado' | 'erro';
  candidatos?: CandidatoDriver[];
  driverId?: string;
  nomeReal?: string;
  totais?: TotaisJolpica;
  jaGravado?: TbRecorde;
  incluir: boolean;
  mensagemErro?: string;
};

export default function RecordesCadastroPage() {
  const { anoJogo, tipoCarreira } = useAppContext();
  const [pilotos, setPilotos] = useState<PilotoOpcao[]>([]);
  const [recordes, setRecordes] = useState<TbRecorde[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [pilotoId, setPilotoId] = useState<number | ''>('');
  const [vitorias, setVitorias] = useState('0');
  const [poles, setPoles] = useState('0');
  const [voltas, setVoltas] = useState('0');
  const [podios, setPodios] = useState('0');
  const [erro, setErro] = useState<string | null>(null);
  const pilotoRef = useRef<HTMLSelectElement>(null);

  // ---- importação da Jolpica-F1 ----
  const [importAberto, setImportAberto] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erroImport, setErroImport] = useState<string | null>(null);
  const [linhasImport, setLinhasImport] = useState<LinhaImport[]>([]);
  const [gravandoImport, setGravandoImport] = useState(false);

  const pilotoSelecionado = useMemo(() => pilotos.find((p) => p.id === pilotoId) ?? null, [pilotos, pilotoId]);
  const anoCorte = anoJogo ? anoJogo - 1 : null;

  async function carregar() {
    if (!anoJogo) {
      setPilotos([]);
      setRecordes([]);
      return;
    }
    const [listaPilotos, { data: recData }] = await Promise.all([
      carregarPilotosParaRecorde(anoJogo, tipoCarreira),
      f1()
        .from('tb_recorde')
        .select('*, tb_piloto(nome_piloto, aposentado)')
        .eq('tipo_carreira', tipoCarreira)
        .or(`ano_jogo.eq.${anoJogo},ano_jogo.eq.${ANO_APOSENTADO}`)
        .order('id')
    ]);
    setPilotos(listaPilotos);
    setRecordes(
      ((recData as any[]) ?? []).map((r) => ({
        ...r,
        nome_piloto: r.tb_piloto?.nome_piloto ?? `#${r.id_piloto}`,
        aposentado: r.tb_piloto?.aposentado ?? false
      }))
    );
  }

  useEffect(() => {
    carregar();
    cancelarEdicao();
    setImportAberto(false);
    setLinhasImport([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo, tipoCarreira]);

  function editar(r: TbRecorde) {
    setEditandoId(r.id);
    setPilotoId(r.id_piloto);
    setVitorias(String(r.vitorias));
    setPoles(String(r.poles));
    setVoltas(String(r.voltas_mais_rapidas));
    setPodios(String(r.podios));
    setErro(null);
    pilotoRef.current?.focus();
  }

  // ao trocar o piloto selecionado no combo do formulário: se ele já tem
  // recorde gravado para este ano/carreira, carrega os valores automaticamente
  // e já entra em modo "alterar" (senão o Gravar tentaria inserir de novo e
  // violaria a constraint única de ano_jogo+tipo_carreira+id_piloto). Se não
  // tem, limpa os campos pra um cadastro novo.
  function selecionarPiloto(idSelecionado: number | '') {
    if (!idSelecionado) {
      cancelarEdicao();
      return;
    }
    const existente = recordes.find((r) => r.id_piloto === idSelecionado);
    setPilotoId(idSelecionado);
    setErro(null);
    if (existente) {
      setEditandoId(existente.id);
      setVitorias(String(existente.vitorias));
      setPoles(String(existente.poles));
      setVoltas(String(existente.voltas_mais_rapidas));
      setPodios(String(existente.podios));
    } else {
      setEditandoId(null);
      setVitorias('0');
      setPoles('0');
      setVoltas('0');
      setPodios('0');
    }
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setPilotoId('');
    setVitorias('0');
    setPoles('0');
    setVoltas('0');
    setPodios('0');
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoJogo || !pilotoId) return setErro('Selecione um piloto.');

    const piloto = pilotos.find((p) => p.id === pilotoId);
    const ano_jogo_recorde = piloto?.aposentado ? ANO_APOSENTADO : anoJogo;

    const payload = {
      ano_jogo: ano_jogo_recorde,
      tipo_carreira: tipoCarreira,
      id_piloto: pilotoId,
      vitorias: Number(vitorias) || 0,
      poles: Number(poles) || 0,
      voltas_mais_rapidas: Number(voltas) || 0,
      podios: Number(podios) || 0
    };

    const { error } = editandoId
      ? await f1().from('tb_recorde').update(payload).eq('id', editandoId)
      : await f1().from('tb_recorde').insert(payload);
    if (error) return setErro(error.message);

    cancelarEdicao();
    setErro(null);
    await carregar();
  }

  async function excluir(id: number) {
    const { error } = await f1().from('tb_recorde').delete().eq('id', id);
    if (error) return setErro(error.message);
    if (editandoId === id) cancelarEdicao();
    await carregar();
  }

  // ---- importação: busca na Jolpica-F1 pra cada piloto cadastrado ----
  async function iniciarImportacao() {
    if (!anoJogo || anoCorte === null) return;
    setImportando(true);
    setErroImport(null);
    setLinhasImport([]);
    try {
      const todosDrivers = await carregarTodosDrivers();
      const resultado: LinhaImport[] = [];

      for (let i = 0; i < pilotos.length; i++) {
        const p = pilotos[i];
        setProgresso(`Buscando ${i + 1}/${pilotos.length} — ${p.nome_piloto}...`);
        const jaGravado = recordes.find((r) => r.id_piloto === p.id);
        const candidatos = encontrarCandidatos(p.nome_piloto, todosDrivers);

        if (candidatos.length === 0) {
          resultado.push({ idPiloto: p.id, nomePiloto: p.nome_piloto, aposentado: p.aposentado, status: 'nao_encontrado', incluir: false, jaGravado });
        } else if (candidatos.length > 1) {
          resultado.push({ idPiloto: p.id, nomePiloto: p.nome_piloto, aposentado: p.aposentado, status: 'ambiguo', candidatos, incluir: false, jaGravado });
        } else {
          const escolhido = candidatos[0];
          try {
            const totais = await buscarTotaisAte(escolhido.driverId, anoCorte);
            resultado.push({
              idPiloto: p.id,
              nomePiloto: p.nome_piloto,
              aposentado: p.aposentado,
              status: 'ok',
              driverId: escolhido.driverId,
              nomeReal: `${escolhido.givenName} ${escolhido.familyName}`,
              totais,
              jaGravado,
              incluir: true
            });
          } catch (e: any) {
            resultado.push({ idPiloto: p.id, nomePiloto: p.nome_piloto, aposentado: p.aposentado, status: 'erro', incluir: false, jaGravado, mensagemErro: e?.message });
          }
          await new Promise((r) => setTimeout(r, 250)); // não martelar a API pública
        }
      }
      setLinhasImport(resultado);
    } catch (e: any) {
      setErroImport(e?.message ?? 'Não consegui acessar a Jolpica-F1. Tente novamente em instantes.');
    } finally {
      setImportando(false);
      setProgresso(null);
    }
  }

  async function resolverAmbiguo(idPiloto: number, candidato: CandidatoDriver) {
    if (anoCorte === null) return;
    setLinhasImport((atual) =>
      atual.map((l) => (l.idPiloto === idPiloto ? { ...l, status: 'ok', driverId: candidato.driverId, nomeReal: `${candidato.givenName} ${candidato.familyName}` } : l))
    );
    try {
      const totais = await buscarTotaisAte(candidato.driverId, anoCorte);
      setLinhasImport((atual) => atual.map((l) => (l.idPiloto === idPiloto ? { ...l, totais, incluir: true } : l)));
    } catch (e: any) {
      setLinhasImport((atual) => atual.map((l) => (l.idPiloto === idPiloto ? { ...l, status: 'erro', mensagemErro: e?.message } : l)));
    }
  }

  function alternarIncluir(idPiloto: number) {
    setLinhasImport((atual) => atual.map((l) => (l.idPiloto === idPiloto ? { ...l, incluir: !l.incluir } : l)));
  }

  // só pilotos com status "ok" (já com totais buscados) têm checkbox pra marcar
  const linhasMarcaveis = linhasImport.filter((l) => l.status === 'ok');
  const todasMarcadas = linhasMarcaveis.length > 0 && linhasMarcaveis.every((l) => l.incluir);

  function alternarTodos() {
    const marcar = !todasMarcadas;
    setLinhasImport((atual) => atual.map((l) => (l.status === 'ok' ? { ...l, incluir: marcar } : l)));
  }

  async function gravarImportados() {
    if (!anoJogo) return;
    setGravandoImport(true);
    const selecionadas = linhasImport.filter((l) => l.incluir && l.totais);
    for (const l of selecionadas) {
      const ano_jogo_recorde = l.aposentado ? ANO_APOSENTADO : anoJogo;
      const payload = {
        ano_jogo: ano_jogo_recorde,
        tipo_carreira: tipoCarreira,
        id_piloto: l.idPiloto,
        vitorias: l.totais!.vitorias,
        poles: l.totais!.poles,
        voltas_mais_rapidas: l.totais!.voltasMaisRapidas,
        podios: l.totais!.podios
      };
      if (l.jaGravado) {
        await f1().from('tb_recorde').update(payload).eq('id', l.jaGravado.id);
      } else {
        await f1().from('tb_recorde').insert(payload);
      }
    }
    setGravandoImport(false);
    setImportAberto(false);
    setLinhasImport([]);
    await carregar();
  }

  return (
    <div>
      <div className="banner-info">
        Grave aqui o total acumulado de cada piloto <strong>até o ano anterior</strong> a {anoJogo ?? '—'}. A tela
        de Recordes soma esse valor com tudo que já foi disputado nas temporadas deste ano_jogo. Pilotos
        aposentados gravam um valor fixo (não mudam mais).
      </div>

      {erro && <div className="banner-error">{erro}</div>}

      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>
      ) : (
        <>
          <form className="form-card form-grid" onSubmit={gravar}>
            <div className="field">
              <label>Piloto</label>
              <div className="select-wrap">
                <select
                  ref={pilotoRef}
                  value={pilotoId}
                  onChange={(e) => selecionarPiloto(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Selecione...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome_piloto}
                      {p.aposentado ? ' (aposentado)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Vitórias</label>
              <input type="number" min={0} value={vitorias} onChange={(e) => setVitorias(e.target.value)} style={{ width: 90 }} />
            </div>
            <div className="field">
              <label>Poles</label>
              <input type="number" min={0} value={poles} onChange={(e) => setPoles(e.target.value)} style={{ width: 90 }} />
            </div>
            <div className="field">
              <label>Voltas mais rápidas</label>
              <input type="number" min={0} value={voltas} onChange={(e) => setVoltas(e.target.value)} style={{ width: 90 }} />
            </div>
            <div className="field">
              <label>Pódios</label>
              <input type="number" min={0} value={podios} onChange={(e) => setPodios(e.target.value)} style={{ width: 90 }} />
            </div>
            <button type="submit" className="btn-primary">
              {editandoId ? 'Atualizar recorde' : 'Gravar recorde'}
            </button>
            {editandoId && (
              <button type="button" className="btn-ghost" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </form>

          {pilotoSelecionado && (
            <div className="banner-info" style={{ marginTop: -10 }}>
              {editandoId && `${pilotoSelecionado.nome_piloto} já tem recorde gravado — carreguei os valores atuais, e Gravar vai atualizar em vez de duplicar. `}
              {pilotoSelecionado.aposentado
                ? `${pilotoSelecionado.nome_piloto} está aposentado — este valor fica fixo, não soma com nenhum ano.`
                : `Será gravado como acumulado até F1 ${anoJogo - 1}, somando com as temporadas de F1 ${anoJogo} na tela de Recordes.`}
            </div>
          )}

          <div className="import-card">
            <div className="import-card-head">              
              <button type="button" className="btn-ghost" onClick={() => setImportAberto((v) => !v)}>
                {importAberto ? 'Fechar' : 'Importar recordes'}
              </button>
            </div>

            {importAberto && (
              <div className="import-body">
                {erroImport && <div className="banner-error">{erroImport}</div>}
                <div className="import-actions">
                  <button type="button" className="btn-primary" onClick={iniciarImportacao} disabled={importando}>
                    {importando ? 'Buscando...' : 'Buscar valores'}
                  </button>
                  {progresso && <span className="import-progress">{progresso}</span>}
                </div>

                {linhasImport.length > 0 && (
                  <>
                    <div className="table-scroll" style={{ marginTop: 14 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>
                              <input
                                type="checkbox"
                                checked={todasMarcadas}
                                onChange={alternarTodos}
                                disabled={linhasMarcaveis.length === 0}
                                title="Marcar/desmarcar todos"
                              />
                            </th>
                            <th>Piloto cadastrado</th>
                            <th>Encontrado na Jolpica-F1</th>
                            <th>Vitórias</th>
                            <th>Poles</th>
                            <th>Voltas</th>
                            <th>Pódios</th>
                            <th>Já gravado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linhasImport.map((l) => (
                            <tr key={l.idPiloto}>
                              <td>
                                {l.status === 'ok' && (
                                  <input type="checkbox" checked={l.incluir} onChange={() => alternarIncluir(l.idPiloto)} />
                                )}
                              </td>
                              <td>
                                {l.nomePiloto}
                                {l.aposentado ? ' (aposentado)' : ''}
                              </td>
                              <td>
                                {l.status === 'ok' && <span>{l.nomeReal}</span>}
                                {l.status === 'nao_encontrado' && <span className="tag-warn">não encontrado</span>}
                                {l.status === 'erro' && <span className="tag-warn">erro na busca</span>}
                                {l.status === 'ambiguo' && l.candidatos && (
                                  <div className="select-wrap">
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        const c = l.candidatos!.find((x) => x.driverId === e.target.value);
                                        if (c) resolverAmbiguo(l.idPiloto, c);
                                      }}
                                    >
                                      <option value="" disabled>
                                        {l.candidatos.length} homônimos — escolha
                                      </option>
                                      {l.candidatos.map((c) => (
                                        <option key={c.driverId} value={c.driverId}>
                                          {c.givenName} {c.familyName} ({c.nationality ?? '—'}, {c.dateOfBirth?.slice(0, 4) ?? '?'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </td>
                              <td>{l.totais?.vitorias ?? '—'}</td>
                              <td>
                                {l.totais?.poles ?? '—'}
                                {l.totais?.polesPossivelmenteIncompletas && (
                                  <span
                                    className="tag-warn"
                                    style={{ marginLeft: 6 }}
                                    title="Piloto correu antes de 1994 — a Jolpica-F1 não tem qualifying confiável dessa época, então esse número pode estar bem abaixo do real. Confira manualmente."
                                  >
                                    ⚠ pré-1994
                                  </span>
                                )}
                              </td>
                              <td>{l.totais?.voltasMaisRapidas ?? '—'}</td>
                              <td>{l.totais?.podios ?? '—'}</td>
                              <td>
                                {l.jaGravado
                                  ? `V${l.jaGravado.vitorias} P${l.jaGravado.poles} VR${l.jaGravado.voltas_mais_rapidas} Pd${l.jaGravado.podios}`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="import-actions" style={{ marginTop: 12 }}>
                      <button type="button" className="btn-primary" onClick={gravarImportados} disabled={gravandoImport}>
                        {gravandoImport ? 'Gravando...' : 'Gravar selecionados'}
                      </button>
                      <span className="import-progress">
                        {linhasImport.filter((l) => l.incluir).length} de {linhasImport.length} selecionados para gravar
                        {linhasImport.some((l) => l.jaGravado) && ' — os já gravados serão sobrescritos'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Piloto</th>
                    <th>Ano base</th>
                    <th>Vitórias</th>
                    <th>Poles</th>
                    <th>Voltas</th>
                    <th>Pódios</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recordes.map((r) => (
                    <tr key={r.id} className={editandoId === r.id ? 'row-editing' : undefined}>
                      <td>
                        {r.nome_piloto}
                        {r.aposentado ? ' (aposentado)' : ''}
                      </td>
                      <td>{r.ano_jogo === ANO_APOSENTADO ? 'fixo' : r.ano_jogo}</td>
                      <td>{r.vitorias}</td>
                      <td>{r.poles}</td>
                      <td>{r.voltas_mais_rapidas}</td>
                      <td>{r.podios}</td>
                      <td className="row-actions">
                        <button className="link-edit" onClick={() => editar(r)}>
                          alterar
                        </button>
                        <button className="link-danger" onClick={() => excluir(r.id)}>
                          excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recordes.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={7}>Nenhum recorde cadastrado para este ano/carreira ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
