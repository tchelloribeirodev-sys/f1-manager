import { useEffect, useRef, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import type { TbPontuacao } from '../lib/types';

function Bloco({
  titulo,
  anoJogo,
  sprint
}: {
  titulo: string;
  anoJogo: number;
  sprint: boolean;
}) {
  const table = sprint ? 'tb_pontuacao_sprint' : 'tb_pontuacao';
  const [itens, setItens] = useState<TbPontuacao[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [posicao, setPosicao] = useState('');
  const [pontos, setPontos] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const posicaoRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    const { data } = await f1().from(table).select('*').eq('ano_jogo', anoJogo).order('posicao');
    setItens((data as TbPontuacao[]) ?? []);
  }

  useEffect(() => {
    carregar();
    cancelarEdicao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo]);

  function editar(p: TbPontuacao) {
    setEditandoId(p.id);
    setPosicao(String(p.posicao));
    setPontos(String(p.pontos));
    setErro(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setPosicao('');
    setPontos('');
  }

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    const pos = Number(posicao);
    const pts = Number(pontos);
    if (!pos || pos <= 0) return setErro('Informe a posição.');
    if (Number.isNaN(pts) || pts < 0) return setErro('Informe os pontos.');

    // upsert: se a posição já existir para este ano, atualiza; senão, cria.
    const { error } = await f1()
      .from(table)
      .upsert({ ano_jogo: anoJogo, posicao: pos, pontos: pts }, { onConflict: 'ano_jogo,posicao' });
    if (error) return setErro(error.message);
    cancelarEdicao();
    setErro(null);
    await carregar();
    posicaoRef.current?.focus();
  }

  async function excluir(id: number) {
    const { error } = await f1().from(table).delete().eq('id', id);
    if (error) return setErro(error.message);
    if (editandoId === id) cancelarEdicao();
    await carregar();
  }

  return (
    <div className="pontuacao-block">
      <h2 style={{ fontSize: 16, marginBottom: 10 }}>{titulo}</h2>
      {erro && <div className="banner-error">{erro}</div>}
      <form className="form-card form-grid compact" onSubmit={gravar}>
        <div className="field">
          <label>Posição</label>
          <input
            ref={posicaoRef}
            type="number"
            min={1}
            value={posicao}
            onChange={(e) => setPosicao(e.target.value)}
            style={{ width: 70, minWidth: 0 }}
          />
        </div>
        <div className="field">
          <label>Pontos</label>
          <input
            type="number"
            min={0}
            value={pontos}
            onChange={(e) => setPontos(e.target.value)}
            style={{ width: 70, minWidth: 0 }}
          />
        </div>
        <button type="submit" className="btn-primary">
          {editandoId ? 'Atualizar' : 'Gravar'}
        </button>
        {editandoId && (
          <button type="button" className="btn-ghost" onClick={cancelarEdicao}>
            Cancelar
          </button>
        )}
      </form>

      <div className="table-card compact">
        <div className="table-scroll">
          <table className="narrow">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Pontos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => (
                <tr key={p.id} className={editandoId === p.id ? 'row-editing' : undefined}>
                  <td>{p.posicao}º</td>
                  <td>{p.pontos}</td>
                  <td className="row-actions">
                    <button className="link-edit" onClick={() => editar(p)}>
                      editar
                    </button>
                    <button className="link-danger" onClick={() => excluir(p.id)}>
                      excluir
                    </button>
                  </td>
                </tr>
              ))}
              {itens.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={3}>Nenhuma pontuação cadastrada para este ano.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PontuacaoPage() {
  const { anoJogo } = useAppContext();

  return (
    <div>
      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>
      ) : (
        <div className="pontuacao-grid">
          <Bloco titulo="Corrida normal" anoJogo={anoJogo} sprint={false} />
          <Bloco titulo="Sprint" anoJogo={anoJogo} sprint={true} />
        </div>
      )}
    </div>
  );
}
