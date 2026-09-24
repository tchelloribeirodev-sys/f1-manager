import { useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, UsersRound } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { buscarGridAtual, importarGridAtual, type BandeiraOpcao, type GridDriver } from '../lib/importarGrid';
import { f1 } from '../lib/supabaseClient';

export default function ImportarGridPage() {
  const { anoJogo, tipoCarreira } = useAppContext();
  const [grid, setGrid] = useState<GridDriver[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [bandeiras, setBandeiras] = useState<BandeiraOpcao[]>([]);
  const [paisesSelecionados, setPaisesSelecionados] = useState<Record<string, string>>({});

  useEffect(() => {
    async function carregarBandeiras() {
      const { data, error } = await f1().from('tb_bandeira').select('codigo, nome').order('nome');
      if (!error) setBandeiras((data ?? []) as BandeiraOpcao[]);
    }
    carregarBandeiras();
  }, []);

  async function visualizar() {
    if (!anoJogo) return setErro('Selecione um ano do jogo no topo.');
    setCarregando(true);
    setErro(null);
    setSucesso(null);
    try {
      const [dados, bandeirasResult] = await Promise.all([
        buscarGridAtual(anoJogo),
        f1().from('tb_bandeira').select('codigo, nome').order('nome')
      ]);
      if (bandeirasResult.error) throw bandeirasResult.error;
      const listaBandeiras = (bandeirasResult.data ?? []) as BandeiraOpcao[];
      const codigos = new Set(listaBandeiras.map((b) => b.codigo.toUpperCase()));
      const dadosNormalizados = dados.map((d) => ({
        ...d,
        pais: d.pais && codigos.has(d.pais.toUpperCase()) ? d.pais.toUpperCase() : null
      }));
      setBandeiras(listaBandeiras);
      setGrid(dadosNormalizados);
      setPaisesSelecionados((atual) => {
        const proximo = { ...atual };
        dadosNormalizados.forEach((d) => {
          if (d.pais) delete proximo[d.abreviacao];
        });
        return proximo;
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  async function importar() {
    if (!anoJogo) return setErro('Selecione um ano do jogo no topo.');
    setImportando(true);
    setErro(null);
    setSucesso(null);
    try {
      const r = await importarGridAtual(anoJogo, 1, tipoCarreira, paisesSelecionados);
      const extras = [
        r.bandeirasNaoEncontradas.length
          ? `Códigos de bandeira não cadastrados: ${r.bandeirasNaoEncontradas.join(', ')}.`
          : '',
        r.nacionalidadesNaoEncontradas.length
          ? `Nacionalidades sem mapeamento: ${r.nacionalidadesNaoEncontradas.join(', ')}.`
          : ''
      ].filter(Boolean);
      setSucesso(
        `${r.equipes} equipes, ${r.pilotos} pilotos e ${r.times} escalações importados para a 1ª temporada.` +
          (extras.length ? ` ${extras.join(' ')}` : '')
      );
      await visualizar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setImportando(false);
    }
  }

  return (
    <div>
      {erro && <div className="banner-error">{erro}</div>}
      {sucesso && <div className="banner-warn"><CheckCircle2 size={16} /> {sucesso}</div>}

      {!anoJogo ? (
        <div className="banner-warn">Selecione um ano do jogo no topo para importar o grid.</div>
      ) : (
        <>
          <div className="form-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <UsersRound size={22} />
              <div>
                <strong>Grid atual da Fórmula 1</strong>
                <div className="field-hint">
                  OpenF1 fornece piloto, equipe e cor; Jolpica complementa a nacionalidade. O logo não é importado.
                </div>
              </div>
            </div>
            <div className="field-hint" style={{ marginBottom: 14 }}>
              Ano do jogo: <strong>{anoJogo}</strong> · Carreira: <strong>{tipoCarreira}</strong> · Destino: <strong>1ª temporada</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-ghost" onClick={visualizar} disabled={carregando || importando}>
                <RefreshCw size={16} /> {carregando ? 'Consultando...' : 'Consultar grid'}
              </button>
              <button className="btn-primary" onClick={importar} disabled={importando || carregando || grid.some((d) => !d.pais && !paisesSelecionados[d.abreviacao])}>
                <Download size={16} /> {importando ? 'Importando...' : 'Importar grid atual'}
              </button>
            </div>
            {grid.some((d) => !d.pais && !paisesSelecionados[d.abreviacao]) && (
              <div className="field-hint" style={{ marginTop: 10 }}>
                Se alguma bandeira não foi encontrada automaticamente, selecione-a na tabela antes de importar.
              </div>
            )}
          </div>

          {grid.length > 0 && (
            <div className="table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Cor</th>
                      <th>Piloto</th>
                      <th>Sigla</th>
                      <th>Equipe</th>
                      <th>Nacionalidade</th>
                      <th>Bandeira</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((d) => (
                      <tr key={`${d.abreviacao}-${d.equipe}`}>
                        <td><span className="color-dot" style={{ background: d.corEquipe }} title={d.corEquipe} /></td>
                        <td>{d.nome}</td>
                        <td>{d.abreviacao}</td>
                        <td>{d.equipe}</td>
                        <td>{d.nacionalidade ?? '—'}</td>
                        <td>
                          {d.pais ? (
                            d.pais
                          ) : (
                            <select
                              value={paisesSelecionados[d.abreviacao] ?? ''}
                              onChange={(e) =>
                                setPaisesSelecionados((atual) => ({ ...atual, [d.abreviacao]: e.target.value }))
                              }
                              style={{ minWidth: 180 }}
                            >
                              <option value="">Selecione a bandeira...</option>
                              {bandeiras.map((b) => (
                                <option key={b.codigo} value={b.codigo}>
                                  {b.codigo} — {b.nome}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
