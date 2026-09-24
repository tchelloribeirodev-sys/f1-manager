import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppContext } from '../context/AppContext';
import {
  carregarEvolucaoEquipes,
  carregarEvolucaoEquipesProvaAProva,
  type PontoGraficoEquipes,
  type PontoGraficoEquipesProva,
  type SerieEquipe
} from '../lib/dashboard';

export default function DashboardEquipesPage() {
  const { anoJogo, tipoCarreira, temporada } = useAppContext();

  const [pontosProva, setPontosProva] = useState<PontoGraficoEquipesProva[]>([]);
  const [seriesProva, setSeriesProva] = useState<SerieEquipe[]>([]);
  const [carregandoProva, setCarregandoProva] = useState(false);

  const [pontosTemporada, setPontosTemporada] = useState<PontoGraficoEquipes[]>([]);
  const [seriesTemporada, setSeriesTemporada] = useState<SerieEquipe[]>([]);
  const [carregandoTemporada, setCarregandoTemporada] = useState(false);

  // gráfico de cima: evolução prova a prova DENTRO da temporada selecionada
  // no topo (mesmo recorte usado em Times/Prova a Prova/Classificação)
  useEffect(() => {
    async function carregar() {
      if (!anoJogo) {
        setPontosProva([]);
        setSeriesProva([]);
        return;
      }
      setCarregandoProva(true);
      const r = await carregarEvolucaoEquipesProvaAProva(anoJogo, tipoCarreira, temporada);
      setPontosProva(r.pontos);
      setSeriesProva(r.series);
      setCarregandoProva(false);
    }
    carregar();
  }, [anoJogo, tipoCarreira, temporada]);

  // gráfico de baixo: evolução temporada a temporada (todas as temporadas do
  // ano do jogo) — não depende da temporada selecionada no topo
  useEffect(() => {
    async function carregar() {
      if (!anoJogo) {
        setPontosTemporada([]);
        setSeriesTemporada([]);
        return;
      }
      setCarregandoTemporada(true);
      const r = await carregarEvolucaoEquipes(anoJogo, tipoCarreira);
      setPontosTemporada(r.pontos);
      setSeriesTemporada(r.series);
      setCarregandoTemporada(false);
    }
    carregar();
  }, [anoJogo, tipoCarreira]);

  if (!anoJogo) {
    return <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>;
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">TEMPORADA {temporada}</span>
          <h2>Evolução prova a prova</h2>
        </div>
      </div>
      {carregandoProva ? (
        <div className="banner-info">Carregando dashboard...</div>
      ) : seriesProva.length === 0 || pontosProva.length === 0 ? (
        <div className="banner-warn">
          Sem dados suficientes ainda nesta temporada — cadastre a escalação em Times e lance resultados em Prova a
          Prova.
        </div>
      ) : (
        <div className="chart-card">
          {/* Com até 16 provas na temporada, os rótulos do eixo X ficam
              espremidos numa tela de celular — mesma solução já usada nos
              outros dashboards: largura mínima proporcional ao número de
              provas, com rolagem horizontal dentro do card. */}
          <div className="chart-scroll">
            <div style={{ minWidth: Math.max(pontosProva.length * 56, 480) }}>
              <ResponsiveContainer width="100%" height={440}>
                <LineChart data={pontosProva} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1b2330" />
                  <XAxis dataKey="provaLabel" stroke="#69778b" fontSize={11} />
                  <YAxis stroke="#69778b" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0e141e', border: '1px solid #202a38', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {seriesProva.map((s) => (
                    <Line
                      key={s.chave}
                      type="monotone"
                      dataKey={s.chave}
                      name={s.nome}
                      stroke={s.cor}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="section-head" style={{ marginTop: 28 }}>
        <div>
          <span className="eyebrow">ANO {anoJogo}</span>
          <h2>Evolução temporada a temporada</h2>
        </div>
      </div>
      {carregandoTemporada ? (
        <div className="banner-info">Carregando dashboard...</div>
      ) : seriesTemporada.length === 0 || pontosTemporada.length === 0 ? (
        <div className="banner-warn">Sem dados suficientes ainda — cadastre a escalação em Times e lance resultados em Prova a Prova.</div>
      ) : (
        <div className="chart-card">
          {/* Até 10 temporadas no eixo X também apertam bastante numa tela
              de celular — mesma solução do dashboard de pilotos: largura
              mínima proporcional ao número de pontos, com rolagem
              horizontal dentro do card. */}
          <div className="chart-scroll">
            <div style={{ minWidth: Math.max(pontosTemporada.length * 56, 480) }}>
              <ResponsiveContainer width="100%" height={440}>
                <LineChart data={pontosTemporada} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1b2330" />
                  <XAxis dataKey="temporadaLabel" stroke="#69778b" fontSize={11} />
                  <YAxis stroke="#69778b" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0e141e', border: '1px solid #202a38', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {seriesTemporada.map((s) => (
                    <Line
                      key={s.chave}
                      type="monotone"
                      dataKey={s.chave}
                      name={s.nome}
                      stroke={s.cor}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
