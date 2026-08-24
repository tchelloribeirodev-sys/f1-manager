import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { carregarEvolucaoPilotos, type PontoGraficoPilotos, type SeriePiloto } from '../lib/dashboard';

export default function DashboardPilotosPage() {
  const { anoJogo, tipoCarreira, temporada } = useAppContext();
  const [pontos, setPontos] = useState<PontoGraficoPilotos[]>([]);
  const [series, setSeries] = useState<SeriePiloto[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!anoJogo) {
        setPontos([]);
        setSeries([]);
        return;
      }
      setCarregando(true);
      const r = await carregarEvolucaoPilotos(anoJogo, tipoCarreira, temporada);
      setPontos(r.pontos);
      setSeries(r.series);
      setCarregando(false);
    }
    carregar();
  }, [anoJogo, tipoCarreira, temporada]);

  if (!anoJogo) {
    return <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>;
  }
  if (carregando) {
    return <div className="banner-info">Carregando dashboard...</div>;
  }

  return (
    <div>
      {series.length === 0 || pontos.length === 0 ? (
        <div className="banner-warn">Sem dados suficientes ainda — lance resultados em Prova a Prova.</div>
      ) : (
        <div className="chart-card">
          {/* Com até 16 provas na temporada, os rótulos do eixo X ficam
              espremidos numa tela de celular. Em vez de forçar o gráfico a
              caber na largura da tela (o que deixa tudo ilegível), ele
              ganha uma largura mínima proporcional ao número de provas e
              rola horizontalmente dentro do card — mesma ideia já usada
              nas tabelas com muitas colunas. */}
          <div className="chart-scroll">
            <div style={{ minWidth: Math.max(pontos.length * 56, 480) }}>
              <ResponsiveContainer width="100%" height={440}>
                <LineChart data={pontos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1b2330" />
                  <XAxis dataKey="provaLabel" stroke="#69778b" fontSize={11} />
                  <YAxis stroke="#69778b" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0e141e', border: '1px solid #202a38', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {series.map((s) => (
                    <Line key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} strokeWidth={2.5} dot={{ r: 3 }} />
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
