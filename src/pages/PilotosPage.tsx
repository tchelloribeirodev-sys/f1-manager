import { useEffect, useRef, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { carregarBandeiras, mapaPorCodigo } from '../lib/bandeiras';
import { ANO_APOSENTADO } from '../lib/types';
import type { TbBandeira, TbPiloto } from '../lib/types';

export default function PilotosPage() {
  const { anoJogo, tipoCarreira } = useAppContext();
  const [pilotos, setPilotos] = useState<TbPiloto[]>([]);
  const [bandeiras, setBandeiras] = useState<TbBandeira[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [abrev, setAbrev] = useState('');
  const [pais, setPais] = useState('');
  const [aposentado, setAposentado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const mapaBandeiras = mapaPorCodigo(bandeiras);

  async function carregar() {
    if (!anoJogo) return setPilotos([]);
    const { data } = await f1()
      .from('tb_piloto')
      .select('*')
      .or(`and(ano_jogo.eq.${anoJogo},tipo_carreira.eq.${tipoCarreira}),ano_jogo.eq.${ANO_APOSENTADO}`)
      .order('id');
    setPilotos((data as TbPiloto[]) ?? []);
  }

  // catálogo de bandeiras é global (tela "Bandeiras"), não depende do ano/carreira
  useEffect(() => {
    carregarBandeiras().then(setBandeiras);
  }, []);

  useEffect(() => {
    carregar();
    cancelarEdicao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo, tipoCarreira]);

  function editar(p: TbPiloto) {
    setEditandoId(p.id);
    setNome(p.nome_piloto);
    setAbrev(p.abreviacao_piloto);
    setPais(p.pais ?? '');
    setAposentado(p.aposentado);
    setErro(null);
    nomeRef.current?.focus();
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNome('');
    setAbrev('');
    setPais('');
    setAposentado(false);
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoJogo) return;
    if (!nome.trim()) return setErro('Informe o nome do piloto.');
    if (!abrev.trim()) return setErro('Informe a sigla do piloto.');

    // mesma regra do Delphi: aposentado grava com ano_jogo = 2000
    const ano_jogo = aposentado ? ANO_APOSENTADO : anoJogo;

    const payload = {
      ano_jogo,
      nome_piloto: nome.trim(),
      abreviacao_piloto: abrev.trim().toUpperCase(),
      pais: pais || null,
      aposentado,
      tipo_carreira: tipoCarreira
    };

    const { error } = editandoId
      ? await f1().from('tb_piloto').update(payload).eq('id', editandoId)
      : await f1().from('tb_piloto').insert(payload);
    if (error) return setErro(error.message);

    cancelarEdicao();
    setErro(null);
    await carregar();
    nomeRef.current?.focus();
  }

  async function excluir(id: number) {
    const { error } = await f1().from('tb_piloto').delete().eq('id', id);
    if (error) return setErro(error.message);
    if (editandoId === id) cancelarEdicao();
    await carregar();
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}

      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>
      ) : (
        <>
          <form className="form-card form-grid" onSubmit={gravar}>
            <div className="field">
              <label>Nome do piloto</label>
              <input
                ref={nomeRef}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: Lando Norris"
              />
            </div>
            <div className="field">
              <label>Sigla</label>
              <input
                type="text"
                maxLength={3}
                value={abrev}
                onChange={(e) => setAbrev(e.target.value)}
                placeholder="NOR"
                style={{ width: 80, textTransform: 'uppercase' }}
              />
            </div>
            <div className="field">
              <label>País (bandeira)</label>
              <div className="select-wrap">
                <select value={pais} onChange={(e) => setPais(e.target.value)}>
                  <option value="">Sem bandeira</option>
                  {bandeiras.map((b) => (
                    <option key={b.id} value={b.codigo}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="checkbox-field">
              <input
                type="checkbox"
                id="aposentado"
                checked={aposentado}
                onChange={(e) => setAposentado(e.target.checked)}
              />
              <label htmlFor="aposentado">Aposentado</label>
            </div>
            <button type="submit" className="btn-primary">
              {editandoId ? 'Atualizar piloto' : 'Gravar piloto'}
            </button>
            {editandoId && (
              <button type="button" className="btn-ghost" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </form>

          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>País</th>
                    <th>Piloto</th>
                    <th>Sigla</th>
                    <th>Ano</th>
                    <th>Aposentado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pilotos.map((p) => (
                    <tr key={p.id} className={editandoId === p.id ? 'row-editing' : undefined}>
                      <td>
                        {p.pais && mapaBandeiras[p.pais] && (
                          <span className="flag-chip">
                            <img src={mapaBandeiras[p.pais]} alt={p.pais} />
                          </span>
                        )}
                      </td>
                      <td>{p.nome_piloto}</td>
                      <td>{p.abreviacao_piloto}</td>
                      <td>{p.ano_jogo}</td>
                      <td>{p.aposentado ? 'Sim' : 'Não'}</td>
                      <td className="row-actions">
                        <button className="link-edit" onClick={() => editar(p)}>
                          alterar
                        </button>
                        <button className="link-danger" onClick={() => excluir(p.id)}>
                          excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pilotos.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={6}>Nenhum piloto cadastrado para este ano/carreira.</td>
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
