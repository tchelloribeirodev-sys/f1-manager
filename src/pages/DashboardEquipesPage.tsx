import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { carregarEvolucaoEquipes, type PontoGraficoEquipes, type SerieEquipe } from '../lib/dashboard';

export default function DashboardEquipesPage() {
  const { anoJogo, tipoCarreira } = useAppContext();
  const [pontos, setPontos] = useState<PontoGraficoEquipes[]>([]);
  const [series, setSeries] = useState<SerieEquipe[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!anoJogo) {
        setPontos([]);
        setSeries([]);
        return;
      }
      setCarregando(true);
      const r = await carregarEvolucaoEquipes(anoJogo, tipoCarreira);
      setPontos(r.pontos);
      setSeries(r.series);
      setCarregando(false);
    }
    carregar();
  }, [anoJogo, tipoCarreira]);

  if (!anoJogo) {
    return <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>;
  }
  if (carregando) {
    return <div className="banner-info">Carregando dashboard...</div>;
  }

  return (
    <div>
      <div className="banner-info">
        Total de pontos acumulado por equipe, temporada a temporada, em F1 {anoJogo} — cada ponto do eixo é uma
        temporada inteira (1ª, 2ª, 3ª...), somando ao total anterior. Só entram temporadas que já têm escalação
        cadastrada. Cada linha usa a cor cadastrada da equipe.
      </div>

      {series.length === 0 || pontos.length === 0 ? (
        <div className="banner-warn">Sem dados suficientes ainda — cadastre a escalação em Times e lance resultados em Prova a Prova.</div>
      ) : (
        <div className="chart-card">
          <ResponsiveContainer width="100%" height={440}>
            <LineChart data={pontos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2330" />
              <XAxis dataKey="temporadaLabel" stroke="#69778b" fontSize={11} />
              <YAxis stroke="#69778b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0e141e', border: '1px solid #202a38', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {series.map((s) => (
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
      )}
    </div>
  );
}
