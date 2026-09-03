import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  carregarRecordesAtuais,
  carregarMaioresVencedoresPorProva,
  type LinhaRecorde,
  type LinhaVencedorProva
} from '../lib/recordes';
import { carregarBandeiras, mapaPorCodigo } from '../lib/bandeiras';
import type { TbBandeira } from '../lib/types';

function Coluna({ titulo, dados, chave }: { titulo: string; dados: LinhaRecorde[]; chave: keyof LinhaRecorde }) {
  const ordenado = [...dados].filter((d) => (d[chave] as number) > 0).sort((a, b) => (b[chave] as number) - (a[chave] as number));
  const max = Math.max(1, ...ordenado.map((d) => d[chave] as number));
  return (
    <div className="rank-card">
      <h3>{titulo}</h3>
      {ordenado.map((d) => (
        <div className="rank-line" key={d.idPiloto}>
          <div className="who">
            {d.nomePiloto}
            {d.aposentado && <span className="tag-aposentado">aposentado</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="barwrap">
              <div className="bar" style={{ width: `${((d[chave] as number) / max) * 100}%` }} />
            </div>
            <div className="qty">{d[chave] as number}</div>
          </div>
        </div>
      ))}
      {ordenado.length === 0 && <div className="rank-empty">Nenhum registro até aqui.</div>}
    </div>
  );
}

export default function RecordesPage() {
  const { anoJogo, tipoCarreira, temporada } = useAppContext();
  const [linhas, setLinhas] = useState<LinhaRecorde[]>([]);
  const [vencedoresPorProva, setVencedoresPorProva] = useState<LinhaVencedorProva[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [bandeiras, setBandeiras] = useState<TbBandeira[]>([]);
  const mapaBandeiras = useMemo(() => mapaPorCodigo(bandeiras), [bandeiras]);

  // catálogo de bandeiras é global (tela "Bandeiras"), não depende do ano/temporada
  useEffect(() => {
    carregarBandeiras().then(setBandeiras);
  }, []);

  useEffect(() => {
    // guarda contra corrida entre requisições: se o usuário trocar a
    // temporada rápido, a busca da temporada anterior pode responder DEPOIS
    // da mais recente e sobrescrever a tela com o total errado (foi
    // exatamente isso que causava "seleciono a 5ª e aparece o total da 4ª"
    // quando a resposta da 4ª chegava atrasada).
    let cancelado = false;
    async function carregar() {
      if (!anoJogo) {
        setLinhas([]);
        setVencedoresPorProva([]);
        return;
      }
      setCarregando(true);
      const [dados, porProva] = await Promise.all([
        carregarRecordesAtuais(anoJogo, tipoCarreira, temporada),
        // independe da temporada selecionada: soma todas as temporadas já
        // disputadas no ano do jogo, como pedido — "maior vencedor da prova"
        // é uma estatística da história do ano inteiro, não de um recorte.
        carregarMaioresVencedoresPorProva(anoJogo, tipoCarreira)
      ]);
      if (cancelado) return;
      setLinhas(dados);
      setVencedoresPorProva(porProva);
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [anoJogo, tipoCarreira, temporada]);

  if (!anoJogo) {
    return <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>;
  }
  if (carregando) {
    return <div className="banner-info">Carregando recordes...</div>;
  }

  return (
    <div>      
      {linhas.length === 0 ? (
        <div className="banner-warn">Nenhum recorde cadastrado ainda — use Cadastro de Recordes.</div>
      ) : (
        <>
          <div className="rank-grid">
            <Coluna titulo="Vitórias" dados={linhas} chave="vitorias" />
            <Coluna titulo="Pole position" dados={linhas} chave="poles" />
            <Coluna titulo="Volta mais rápida" dados={linhas} chave="voltasMaisRapidas" />
            <Coluna titulo="Pódios" dados={linhas} chave="podios" />
          </div>

          <div className="section-head" style={{ marginTop: 28 }}>
            <div>
              <span className="eyebrow">RECORDES</span>
              <h2>Maior vencedor por prova</h2>
            </div>
          </div>
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Prova</th>
                    <th>Piloto</th>
                    <th>Vitórias</th>
                  </tr>
                </thead>
                <tbody>
                  {vencedoresPorProva.map((p) => (
                    <tr key={p.idProva}>
                      <td>
                        <span className="flag-chip">
                          {p.bandeiraProva && mapaBandeiras[p.bandeiraProva] && (
                            <img src={mapaBandeiras[p.bandeiraProva]} alt={p.bandeiraProva} />
                          )}
                          {String(p.ordem).padStart(2, '0')} — {p.nomeProva}
                        </span>
                      </td>
                      <td>
                        {p.vencedores.length === 0
                          ? '—'
                          : p.vencedores.map((v) => (
                              <span className="flag-chip" key={v.idPiloto} style={{ marginRight: 12 }}>
                                {v.paisPiloto && mapaBandeiras[v.paisPiloto] && (
                                  <img src={mapaBandeiras[v.paisPiloto]} alt={v.paisPiloto} />
                                )}
                                {v.nomePiloto}
                              </span>
                            ))}
                      </td>
                      <td>{p.vencedores[0]?.vitorias ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
