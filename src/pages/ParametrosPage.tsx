import { useEffect, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import type { TbTotais } from '../lib/types';

export default function ParametrosPage() {
  const { anoJogo } = useAppContext();
  const [atual, setAtual] = useState<TbTotais | null>(null);
  const [todos, setTodos] = useState<TbTotais[]>([]);
  const [equipes, setEquipes] = useState('');
  const [provas, setProvas] = useState('');
  const [pontoVolta, setPontoVolta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data: todosData } = await f1().from('tb_totais').select('*').order('ano_jogo');
    setTodos((todosData as TbTotais[]) ?? []);

    if (anoJogo) {
      const { data } = await f1()
        .from('tb_totais')
        .select('*')
        .eq('ano_jogo', anoJogo)
        .maybeSingle();
      const row = (data as TbTotais) ?? null;
      setAtual(row);
      setEquipes(row ? String(row.equipes) : '');
      setProvas(row ? String(row.provas) : '');
      setPontoVolta(row?.ponto_volta ?? false);
    } else {
      setAtual(null);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoJogo]);

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!anoJogo) return;
    const qEquipes = Number(equipes);
    const qProvas = Number(provas);
    if (!qEquipes || qEquipes <= 0) return setErro('Informe a quantidade de equipes.');
    if (!qProvas || qProvas <= 0) return setErro('Informe a quantidade de provas.');

    setSalvando(true);
    setErro(null);
    const { error } = await f1()
      .from('tb_totais')
      .upsert(
        { ano_jogo: anoJogo, equipes: qEquipes, provas: qProvas, ponto_volta: pontoVolta },
        { onConflict: 'ano_jogo' }
      );
    setSalvando(false);
    if (error) return setErro(`Erro ao gravar parâmetros: ${error.message}`);
    await carregar();
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}

      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>
      ) : (
        <form className="form-card form-grid" onSubmit={gravar}>
          <div className="field">
            <label>Qtd. equipes</label>
            <input type="number" min={1} value={equipes} onChange={(e) => setEquipes(e.target.value)} />
          </div>
          <div className="field">
            <label>Qtd. provas</label>
            <input type="number" min={1} value={provas} onChange={(e) => setProvas(e.target.value)} />
          </div>
          <div className="checkbox-field">
            <input
              type="checkbox"
              id="ponto_volta"
              checked={pontoVolta}
              onChange={(e) => setPontoVolta(e.target.checked)}
            />
            <label htmlFor="ponto_volta">Ponto extra por volta mais rápida</label>
          </div>
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Gravando...' : `Gravar parâmetros do ano ${anoJogo}`}
          </button>
          {atual && (
            <span style={{ color: '#8d9bb0', fontSize: 12 }}>
              Pilotos calculados: <strong style={{ color: '#e8edf5' }}>{atual.pilotos}</strong>
            </span>
          )}
        </form>
      )}

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ano</th>
                <th>Equipes</th>
                <th>Provas</th>
                <th>Pilotos</th>
                <th>Ponto extra volta</th>
              </tr>
            </thead>
            <tbody>
              {todos.map((t) => (
                <tr key={t.id}>
                  <td>{t.ano_jogo}</td>
                  <td>{t.equipes}</td>
                  <td>{t.provas}</td>
                  <td>{t.pilotos}</td>
                  <td>{t.ponto_volta ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
              {todos.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={5}>Nenhum parâmetro cadastrado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
