import { useEffect, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import type { TbAno } from '../lib/types';

export default function AnoPage() {
  const { setAnoJogo } = useAppContext();
  const [anos, setAnos] = useState<TbAno[]>([]);
  const [novoAno, setNovoAno] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data, error } = await f1().from('tb_ano').select('id, ano').order('ano');
    if (error) setErro(error.message);
    else setAnos((data as TbAno[]) ?? []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    const ano = Number(novoAno);
    if (!ano || ano < 1990) {
      setErro('Informe um ano de jogo válido.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const { error } = await f1().from('tb_ano').upsert({ ano }, { onConflict: 'ano' });
    setSalvando(false);
    if (error) {
      setErro(`Erro ao gravar ano: ${error.message}`);
      return;
    }
    setNovoAno('');
    setAnoJogo(ano);
    await carregar();
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}

      <div className="form-card">
        <form className="form-grid" onSubmit={gravar}>
          <div className="field">
            <label>Novo ano de jogo</label>
            <input
              type="number"
              min={1990}
              max={2100}
              value={novoAno}
              onChange={(e) => setNovoAno(e.target.value)}
              placeholder="ex.: 2026"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Gravando...' : 'Gravar ano'}
          </button>
        </form>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ano</th>
              </tr>
            </thead>
            <tbody>
              {anos.map((a) => (
                <tr key={a.id}>
                  <td>{a.ano}</td>
                </tr>
              ))}
              {anos.length === 0 && (
                <tr className="empty-row">
                  <td>Nenhum ano cadastrado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
