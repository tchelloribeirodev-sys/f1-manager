import { useEffect, useState } from 'react';
import { f1 } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { buscarAnoAnteriorComParametros, excluirAno, importarAnoAnterior } from '../lib/gestaoAno';
import type { TbAno } from '../lib/types';

export default function AnoPage() {
  const { anoJogo, tipoCarreira, setAnoJogo } = useAppContext();
  const [anos, setAnos] = useState<TbAno[]>([]);
  const [novoAno, setNovoAno] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // prompt de "importar do ano anterior", mostrado logo depois de gravar
  // um ano que ainda não tem parâmetros configurados
  const [anoRecemGravado, setAnoRecemGravado] = useState<number | null>(null);
  const [anoAnteriorSugerido, setAnoAnteriorSugerido] = useState<number | null>(null);
  const [importando, setImportando] = useState(false);
  const [resumoImportacao, setResumoImportacao] = useState<string | null>(null);

  const [limpando, setLimpando] = useState<number | null>(null);

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
    setResumoImportacao(null);
    const { error } = await f1().from('tb_ano').upsert({ ano }, { onConflict: 'ano' });
    setSalvando(false);
    if (error) {
      setErro(`Erro ao gravar ano: ${error.message}`);
      return;
    }
    setNovoAno('');
    setAnoJogo(ano);
    await carregar();

    // se esse ano ainda não tem parâmetros, oferece importar do ano
    // anterior que já tiver (não precisa ser exatamente ano-1)
    try {
      const { data: totaisExistente } = await f1()
        .from('tb_totais')
        .select('id')
        .eq('ano_jogo', ano)
        .maybeSingle();
      if (!totaisExistente) {
        const anterior = await buscarAnoAnteriorComParametros(ano);
        if (anterior) {
          setAnoRecemGravado(ano);
          setAnoAnteriorSugerido(anterior);
        }
      }
    } catch {
      // falha ao checar sugestão de import não deve travar o fluxo de gravar o ano
    }
  }

  async function importar() {
    if (!anoRecemGravado || !anoAnteriorSugerido) return;
    setImportando(true);
    setErro(null);
    try {
      const resumo = await importarAnoAnterior(anoAnteriorSugerido, anoRecemGravado, tipoCarreira);
      setResumoImportacao(
        `Importado de ${anoAnteriorSugerido} para ${anoRecemGravado}: ` +
          `${resumo.parametros ? 'parâmetros, ' : ''}` +
          `${resumo.pontuacao} posições de pontuação, ${resumo.pontuacaoSprint} de sprint, ` +
          `${resumo.equipes} equipes, ${resumo.pilotos} pilotos e ${resumo.times} times (1ª temporada).`
      );
      setAnoRecemGravado(null);
      setAnoAnteriorSugerido(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setImportando(false);
    }
  }

  function dispensarImportacao() {
    setAnoRecemGravado(null);
    setAnoAnteriorSugerido(null);
  }

  async function excluir(ano: number) {
    const ok = window.confirm(
      `Isso vai EXCLUIR DE VEZ o ano ${ano}: parâmetros, pontuação, calendário de provas, resultados, ` +
        `equipes, pilotos, times e recordes (nos dois tipos de carreira) — inclusive o próprio registro do ano. ` +
        `Essa ação não pode ser desfeita.\n\nConfirmar?`
    );
    if (!ok) return;

    setLimpando(ano);
    setErro(null);
    try {
      await excluirAno(ano);
      setResumoImportacao(null);
      if (anoRecemGravado === ano) dispensarImportacao();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLimpando(null);
    }
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}
      {resumoImportacao && <div className="banner-warn">{resumoImportacao}</div>}

      {anoRecemGravado && anoAnteriorSugerido && (
        <div className="import-ano-anterior">
          <p>
            O ano <strong>{anoRecemGravado}</strong> ainda não tem parâmetros, pontuação, equipes, pilotos ou
            times cadastrados. O ano <strong>{anoAnteriorSugerido}</strong> já tem — importar de lá evita
            recadastrar tudo do zero (equipes e times vêm da 1ª temporada de {anoAnteriorSugerido}, a
            escalação mais próxima do começo de uma temporada nova).
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={importar} disabled={importando}>
              {importando ? 'Importando...' : `Importar de ${anoAnteriorSugerido}`}
            </button>
            <button className="btn-ghost" onClick={dispensarImportacao} disabled={importando}>
              Agora não
            </button>
          </div>
        </div>
      )}

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {anos.map((a) => (
                <tr key={a.id} className={a.ano === anoJogo ? 'row-editing' : undefined}>
                  <td>{a.ano}</td>
                  <td className="row-actions">
                    <button className="link-danger" onClick={() => excluir(a.ano)} disabled={limpando === a.ano}>
                      {limpando === a.ano ? 'excluindo...' : 'excluir ano'}
                    </button>
                  </td>
                </tr>
              ))}
              {anos.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={2}>Nenhum ano cadastrado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
