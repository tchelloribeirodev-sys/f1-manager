import { useEffect, useRef, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { BANDEIRAS } from '../lib/flags';
import type { TbProva } from '../lib/types';

export default function CalendarioPage() {
  const { anoJogo } = useAppContext();
  const [provas, setProvas] = useState<TbProva[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [ordem, setOrdem] = useState('');
  const [nome, setNome] = useState('');
  const [abrev, setAbrev] = useState('');
  const [bandeira, setBandeira] = useState('');
  const [sprint, setSprint] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    if (!anoJogo) return setProvas([]);
    const { data } = await f1()
      .from('tb_prova')
      .select('*')
      .eq('ano_jogo', anoJogo)
      .order('ordem');
    setProvas((data as TbProva[]) ?? []);
  }

  useEffect(() => {
    carregar();
    cancelarEdicao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo]);

  function editar(p: TbProva) {
    setEditandoId(p.id);
    setOrdem(String(p.ordem));
    setNome(p.nome_prova);
    setAbrev(p.abreviacao_prova);
    setBandeira(p.bandeira ?? '');
    setSprint(p.sprint);
    setErro(null);
    nomeRef.current?.focus();
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setOrdem('');
    setNome('');
    setAbrev('');
    setBandeira('');
    setSprint(false);
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoJogo) return;
    if (!nome.trim()) return setErro('Informe o nome da prova.');
    if (!abrev.trim()) return setErro('Informe a abreviação da prova.');

    const payload = {
      ano_jogo: anoJogo,
      ordem: editandoId ? Number(ordem) || 1 : provas.length + 1,
      nome_prova: nome.trim(),
      abreviacao_prova: abrev.trim().toUpperCase(),
      sprint,
      bandeira: bandeira || null
    };

    const { error } = editandoId
      ? await f1().from('tb_prova').update(payload).eq('id', editandoId)
      : await f1().from('tb_prova').insert(payload);
    if (error) return setErro(error.message);

    cancelarEdicao();
    setErro(null);
    await carregar();
    nomeRef.current?.focus();
  }

  async function excluir(id: number) {
    const { error } = await f1().from('tb_prova').delete().eq('id', id);
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
              <label>Nome da prova</label>
              <input
                ref={nomeRef}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: GP do Brasil"
              />
            </div>
            <div className="field">
              <label>Abreviação</label>
              <input
                type="text"
                maxLength={5}
                value={abrev}
                onChange={(e) => setAbrev(e.target.value)}
                placeholder="ex.: BRA"
                style={{ width: 90 }}
              />
            </div>
            <div className="field">
              <label>Bandeira</label>
              <div className="select-wrap">
                <select value={bandeira} onChange={(e) => setBandeira(e.target.value)}>
                  <option value="">sem bandeira</option>
                  {BANDEIRAS.map((b) => (
                    <option key={b.codigo} value={b.codigo}>
                      {b.codigo} — {b.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="checkbox-field">
              <input type="checkbox" id="sprint" checked={sprint} onChange={(e) => setSprint(e.target.checked)} />
              <label htmlFor="sprint">Corrida sprint</label>
            </div>
            <button type="submit" className="btn-primary">
              {editandoId ? 'Atualizar prova' : 'Adicionar prova'}
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
                    <th>Ordem</th>
                    <th>Prova</th>
                    <th>Abrev.</th>
                    <th>Sprint</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {provas.map((p) => (
                    <tr key={p.id} className={editandoId === p.id ? 'row-editing' : undefined}>
                      <td>{String(p.ordem).padStart(2, '0')}</td>
                      <td>
                        <span className="flag-chip">
                          {p.bandeira && <img src={`/flags/${p.bandeira}.png`} alt={p.bandeira} />}
                          {p.nome_prova}
                        </span>
                      </td>
                      <td>{p.abreviacao_prova}</td>
                      <td>{p.sprint ? 'Sim' : 'Não'}</td>
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
                  {provas.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={5}>Nenhuma prova cadastrada para este ano.</td>
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
