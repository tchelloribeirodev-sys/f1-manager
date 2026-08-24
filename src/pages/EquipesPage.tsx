import { useEffect, useRef, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import type { TbEquipe } from '../lib/types';

export default function EquipesPage() {
  const { anoJogo, tipoCarreira } = useAppContext();
  const [equipes, setEquipes] = useState<TbEquipe[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#FF8000');
  const [erro, setErro] = useState<string | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    if (!anoJogo) return setEquipes([]);
    const { data } = await f1()
      .from('tb_equipe')
      .select('*')
      .eq('ano_jogo', anoJogo)
      .eq('tipo_carreira', tipoCarreira)
      .order('id');
    setEquipes((data as TbEquipe[]) ?? []);
  }

  useEffect(() => {
    carregar();
    cancelarEdicao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo, tipoCarreira]);

  function editar(eq: TbEquipe) {
    setEditandoId(eq.id);
    setNome(eq.nome_equipe);
    setCor(eq.cor_equipe);
    setErro(null);
    nomeRef.current?.focus();
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNome('');
    setCor('#FF8000');
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoJogo) return;
    if (!nome.trim()) return setErro('Informe o nome da equipe.');

    const payload = {
      ano_jogo: anoJogo,
      nome_equipe: nome.trim(),
      cor_equipe: cor,
      tipo_carreira: tipoCarreira
    };

    const { error } = editandoId
      ? await f1().from('tb_equipe').update(payload).eq('id', editandoId)
      : await f1().from('tb_equipe').insert(payload);
    if (error) return setErro(error.message);

    cancelarEdicao();
    setErro(null);
    await carregar();
    nomeRef.current?.focus();
  }

  async function excluir(id: number) {
    const { error } = await f1().from('tb_equipe').delete().eq('id', id);
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
              <label>Nome da equipe</label>
              <input
                ref={nomeRef}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: McLaren"
              />
            </div>
            <div className="field">
              <label>Cor</label>
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">
              {editandoId ? 'Atualizar equipe' : 'Gravar equipe'}
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
                    <th>Equipe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {equipes.map((eq) => (
                    <tr key={eq.id} className={editandoId === eq.id ? 'row-editing' : undefined}>
                      <td>
                        <span className="color-dot" style={{ background: eq.cor_equipe }} />
                        {eq.nome_equipe}
                      </td>
                      <td className="row-actions">
                        <button className="link-edit" onClick={() => editar(eq)}>
                          alterar
                        </button>
                        <button className="link-danger" onClick={() => excluir(eq.id)}>
                          excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {equipes.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={2}>Nenhuma equipe cadastrada para este ano/carreira.</td>
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
