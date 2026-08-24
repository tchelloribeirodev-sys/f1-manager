import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CardRanking, TorreEquipes, TorrePilotos } from '../components/ClassificacaoTables';
import {
  calcularClassificacaoEquipes,
  calcularClassificacaoPilotos,
  calcularSituacaoTitulo,
  carregarDadosTemporada,
  type DadosTemporada
} from '../lib/classificacao';

export default function ClassificacaoGeralPage() {
  const { anoJogo, tipoCarreira, temporada } = useAppContext();
  const [dados, setDados] = useState<DadosTemporada | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!anoJogo) {
        setDados(null);
        return;
      }
      setCarregando(true);
      const d = await carregarDadosTemporada(anoJogo, temporada, tipoCarreira);
      setDados(d);
      setCarregando(false);
    }
    carregar();
  }, [anoJogo, tipoCarreira, temporada]);

  const pilotos = useMemo(() => (dados ? calcularClassificacaoPilotos(dados) : []), [dados]);
  const equipes = useMemo(() => calcularClassificacaoEquipes(pilotos), [pilotos]);
  const situacaoTitulo = useMemo(
    () => (dados ? calcularSituacaoTitulo(dados, pilotos, equipes) : null),
    [dados, pilotos, equipes]
  );

  // estatísticas da temporada inteira (todas as provas já lançadas), mesmo
  // formato usado em Classificação Prova a Prova
  const vitorias = useMemo(
    () =>
      pilotos
        .filter((p) => p.vitorias > 0)
        .sort((a, b) => b.vitorias - a.vitorias)
        .map((p) => ({ chave: String(p.idPiloto), nome: p.nomePiloto, corEquipe: p.corEquipe, qtd: p.vitorias })),
    [pilotos]
  );
  const poles = useMemo(
    () =>
      pilotos
        .filter((p) => p.poles > 0)
        .sort((a, b) => b.poles - a.poles)
        .map((p) => ({ chave: String(p.idPiloto), nome: p.nomePiloto, corEquipe: p.corEquipe, qtd: p.poles })),
    [pilotos]
  );
  const voltasRapidas = useMemo(
    () =>
      pilotos
        .filter((p) => p.voltas > 0)
        .sort((a, b) => b.voltas - a.voltas)
        .map((p) => ({ chave: String(p.idPiloto), nome: p.nomePiloto, corEquipe: p.corEquipe, qtd: p.voltas })),
    [pilotos]
  );

  // pole e volta mais rápida de cada prova (abreviação do piloto), para o cabeçalho do grid
  const poleEVoltaPorProva = useMemo(() => {
    const mapa: Record<number, { pole?: string; volta?: string }> = {};
    if (!dados) return mapa;
    dados.resultados.forEach((r) => {
      if (!r.pole && !r.volta_mais_rapida) return;
      const piloto = dados.roster.find((p) => p.idPiloto === r.id_piloto);
      if (!piloto) return;
      const atual = mapa[r.id_prova] ?? {};
      if (r.pole) atual.pole = piloto.abreviacaoPiloto;
      if (r.volta_mais_rapida) atual.volta = piloto.abreviacaoPiloto;
      mapa[r.id_prova] = atual;
    });
    return mapa;
  }, [dados]);

  // posição de cada piloto em cada prova, para as células do grid
  const posicaoPorPilotoEProva = useMemo(() => {
    const mapa: Record<string, number> = {};
    if (!dados) return mapa;
    dados.resultados.forEach((r) => {
      if (r.posicao) mapa[`${r.id_piloto}-${r.id_prova}`] = r.posicao;
    });
    return mapa;
  }, [dados]);

  if (!anoJogo) {
    return <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>;
  }
  if (carregando || !dados) {
    return <div className="banner-info">Carregando classificação...</div>;
  }
  if (dados.roster.length === 0) {
    return (
      <div className="banner-warn">
        Não há pilotos escalados nesta temporada — cadastre a escalação em Times antes de consultar a classificação.
      </div>
    );
  }

  return (
    <div>      
      {dados.erros.length > 0 && (
        <div className="banner-error">Erro ao carregar dados: {dados.erros.join('; ')}</div>
      )}

      <div className="title-cols">
        {situacaoTitulo && (
          <>
            <PainelTitulo
              rotulo="Pilotos"
              lider={situacaoTitulo.pilotos.liderNome}
              diferenca={situacaoTitulo.pilotos.diferenca}
              pontosEmDisputa={situacaoTitulo.pilotos.pontosEmDisputa}
              decidido={situacaoTitulo.pilotos.decidido}
              provasRestantes={situacaoTitulo.provasRestantes}
              sprintsRestantes={situacaoTitulo.sprintsRestantes}
            />
            <PainelTitulo
              rotulo="Equipes"
              lider={situacaoTitulo.equipes.liderNome}
              diferenca={situacaoTitulo.equipes.diferenca}
              pontosEmDisputa={situacaoTitulo.equipes.pontosEmDisputa}
              decidido={situacaoTitulo.equipes.decidido}
              provasRestantes={situacaoTitulo.provasRestantes}
              sprintsRestantes={situacaoTitulo.sprintsRestantes}
            />
          </>
        )}
      </div>

      <div className="tower-cols">
        <div>
          <div className="tower-col-title">Pilotos</div>
          <TorrePilotos linhas={pilotos} />
        </div>
        <div>
          <div className="tower-col-title">Equipes</div>
          <TorreEquipes linhas={equipes} />
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 28 }}>
        <div>
          <span className="eyebrow">ESTATÍSTICAS</span>
          <h2>Vitórias, poles e volta mais rápida na temporada</h2>
        </div>
      </div>
      <div className="rank-grid">
        <CardRanking titulo="Vitórias" itens={vitorias} />
        <CardRanking titulo="Pole position" itens={poles} />
        <CardRanking titulo="Volta mais rápida" itens={voltasRapidas} />
      </div>

      <div className="section-head" style={{ marginTop: 28 }}>
        <div>
          <span className="eyebrow">GRID</span>
          <h2>Classificação prova a prova</h2>
        </div>
      </div>
      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Piloto</th>
                {dados.provas.map((p) => (
                  <th key={p.id}>
                    <div className="race-col-head">
                      <span className="flag-chip">
                        {p.bandeira && <img src={`/flags/${p.bandeira}.png`} alt={p.bandeira} />}
                        <span>{p.abreviacao_prova}</span>
                      </span>
                      <span className="tags">
                        <span className="tag-pole">P {poleEVoltaPorProva[p.id]?.pole ?? '—'}</span>
                        <span className="tag-fl">V {poleEVoltaPorProva[p.id]?.volta ?? '—'}</span>
                      </span>
                    </div>
                  </th>
                ))}
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {pilotos.map((piloto, i) => (
                <tr key={piloto.idPiloto}>
                  <td>
                    <div className="driver-cell">
                      <span className={i < 3 ? `position top-${i + 1}` : 'position'}>{i + 1}</span>
                      <strong>{piloto.nomePiloto}</strong>
                    </div>
                  </td>
                  {dados.provas.map((p) => {
                    const pos = posicaoPorPilotoEProva[`${piloto.idPiloto}-${p.id}`];
                    return (
                      <td key={p.id} className="pos-cell">
                        {pos ?? '·'}
                      </td>
                    );
                  })}
                  <td>
                    <strong className="points">{piloto.pontos}</strong>
                  </td>
                </tr>
              ))}
              {pilotos.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={dados.provas.length + 2}>Nenhum resultado lançado ainda nesta temporada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PainelTitulo({
  rotulo,
  lider,
  diferenca,
  pontosEmDisputa,
  decidido,
  provasRestantes,
  sprintsRestantes
}: {
  rotulo: string;
  lider: string | null;
  diferenca: number;
  pontosEmDisputa: number;
  decidido: boolean;
  provasRestantes: number;
  sprintsRestantes: number;
}) {
  return (
    <div className={decidido ? 'title-card decidido' : 'title-card'}>
      <h3>{rotulo}</h3>
      {lider ? (
        <>
          <div className="title-leader">{lider}</div>
          <div className="title-gap">
            {diferenca > 0 ? `+${diferenca} pts de vantagem` : 'empatado em pontos'}
          </div>
          <div className="title-meta">
            {provasRestantes === 0
              ? 'temporada encerrada'
              : `${provasRestantes} prova${provasRestantes > 1 ? 's' : ''} restante${provasRestantes > 1 ? 's' : ''}${
                  sprintsRestantes > 0 ? ` (${sprintsRestantes} sprint${sprintsRestantes > 1 ? 's' : ''})` : ''
                } · até ${pontosEmDisputa} pts em disputa`}
          </div>
          {decidido && <div className="title-champion">🏆 Campeão: {lider}</div>}
        </>
      ) : (
        <div className="title-meta">Ainda sem resultados lançados.</div>
      )}
    </div>
  );
}
