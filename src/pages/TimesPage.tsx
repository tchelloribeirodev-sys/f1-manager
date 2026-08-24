import { useEffect, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import type { TbEquipe, TbPiloto, TbTime } from '../lib/types';

type LinhaTime = TbTime & {
  tb_equipe: { nome_equipe: string } | null;
  tb_piloto: { nome_piloto: string } | null;
};

export default function TimesPage() {
  const { anoJogo, tipoCarreira, temporada, setTemporada } = useAppContext();
  const [equipes, setEquipes] = useState<TbEquipe[]>([]);
  const [pilotos, setPilotos] = useState<TbPiloto[]>([]);
  const [escalacao, setEscalacao] = useState<LinhaTime[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [idEquipe, setIdEquipe] = useState('');
  const [idPiloto, setIdPiloto] = useState('');
  const [statusPiloto, setStatusPiloto] = useState<1 | 2>(1);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    if (!anoJogo) return;
    const [{ data: eq }, { data: pl }, { data: tm }] = await Promise.all([
      f1().from('tb_equipe').select('*').eq('ano_jogo', anoJogo).eq('tipo_carreira', tipoCarreira).order('id'),
      f1().from('tb_piloto').select('*').eq('ano_jogo', anoJogo).eq('tipo_carreira', tipoCarreira).order('id'),
      f1()
        .from('tb_time')
        .select('*, tb_equipe(nome_equipe), tb_piloto(nome_piloto)')
        .eq('ano_jogo', anoJogo)
        .eq('tipo_carreira', tipoCarreira)
        .eq('temporada', temporada)
        .order('id_equipe')
    ]);
    setEquipes((eq as TbEquipe[]) ?? []);
    setPilotos((pl as TbPiloto[]) ?? []);
    setEscalacao((tm as unknown as LinhaTime[]) ?? []);
  }

  useEffect(() => {
    carregar();
    cancelarEdicao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo, tipoCarreira, temporada]);

  function editar(t: LinhaTime) {
    setEditandoId(t.id);
    setIdEquipe(String(t.id_equipe));
    setIdPiloto(String(t.id_piloto));
    setStatusPiloto(t.status_piloto);
    setErro(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setIdEquipe('');
    setIdPiloto('');
    setStatusPiloto(1);
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoJogo || !idEquipe || !idPiloto) return setErro('Selecione equipe e piloto.');

    const payload = {
      ano_jogo: anoJogo,
      temporada,
      tipo_carreira: tipoCarreira,
      id_equipe: Number(idEquipe),
      id_piloto: Number(idPiloto),
      status_piloto: statusPiloto
    };

    const { error } = editandoId
      ? await f1().from('tb_time').update(payload).eq('id', editandoId)
      : await f1().from('tb_time').insert(payload);
    if (error) return setErro(error.message);

    cancelarEdicao();
    setErro(null);
    await carregar();
  }

  async function excluir(id: number) {
    const { error } = await f1().from('tb_time').delete().eq('id', id);
    if (error) return setErro(error.message);
    if (editandoId === id) cancelarEdicao();
    await carregar();
  }

  async function copiarParaProxima() {
    if (!anoJogo) return;
    const proxima = temporada + 1;
    if (proxima > 10) return setErro('O jogo só permite até a 10ª temporada.');

    const { data: atualRows, error: errAtual } = await f1()
      .from('tb_time')
      .select('id_equipe, id_piloto, status_piloto')
      .eq('ano_jogo', anoJogo)
      .eq('tipo_carreira', tipoCarreira)
      .eq('temporada', temporada);

    if (errAtual) return setErro(errAtual.message);
    if (!atualRows || atualRows.length === 0) {
      return setErro('Não há escalação na temporada atual para copiar.');
    }

    const linhas = atualRows.map((t) => ({
      ano_jogo: anoJogo,
      tipo_carreira: tipoCarreira,
      temporada: proxima,
      id_equipe: t.id_equipe,
      id_piloto: t.id_piloto,
      status_piloto: t.status_piloto
    }));

    const { error: errInsert } = await f1()
      .from('tb_time')
      .upsert(linhas, { onConflict: 'ano_jogo,temporada,id_equipe,status_piloto,tipo_carreira' });

    if (errInsert) return setErro(errInsert.message);
    setErro(null);
    setTemporada(proxima);
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}

      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>
      ) : (
        <>
          <div className="season-tabs">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
              <button
                key={t}
                className={t === temporada ? 'active' : ''}
                onClick={() => setTemporada(t)}
              >
                {t}ª temp.
              </button>
            ))}
          </div>

          <form className="form-card form-grid" onSubmit={gravar}>
            <div className="field">
              <label>Equipe</label>
              <div className="select-wrap">
                <select value={idEquipe} onChange={(e) => setIdEquipe(e.target.value)}>
                  <option value="">selecione...</option>
                  {equipes.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nome_equipe}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Piloto</label>
              <div className="select-wrap">
                <select value={idPiloto} onChange={(e) => setIdPiloto(e.target.value)}>
                  <option value="">selecione...</option>
                  {pilotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome_piloto}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Nº do piloto</label>
              <div className="select-wrap">
                <select value={statusPiloto} onChange={(e) => setStatusPiloto(Number(e.target.value) as 1 | 2)}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary">
              {editandoId ? 'Atualizar escalação' : 'Gravar escalação'}
            </button>
            {editandoId ? (
              <button type="button" className="btn-ghost" onClick={cancelarEdicao}>
                Cancelar
              </button>
            ) : (
              <button type="button" className="btn-ghost" onClick={copiarParaProxima}>
                Copiar para {temporada + 1}ª temporada
              </button>
            )}
          </form>

          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Equipe</th>
                    <th>Piloto</th>
                    <th>Nº</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {escalacao.map((t) => (
                    <tr key={t.id} className={editandoId === t.id ? 'row-editing' : undefined}>
                      <td>{t.tb_equipe?.nome_equipe}</td>
                      <td>{t.tb_piloto?.nome_piloto}</td>
                      <td>{t.status_piloto}</td>
                      <td className="row-actions">
                        <button className="link-edit" onClick={() => editar(t)}>
                          alterar
                        </button>
                        <button className="link-danger" onClick={() => excluir(t.id)}>
                          excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {escalacao.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={4}>Nenhum piloto escalado nesta temporada ainda.</td>
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
