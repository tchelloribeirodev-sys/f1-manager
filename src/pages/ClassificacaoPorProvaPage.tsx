import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CardRanking, TorrePilotos } from '../components/ClassificacaoTables';
import {
  calcularClassificacaoPilotos,
  carregarDadosTemporada,
  type DadosTemporada
} from '../lib/classificacao';

export default function ClassificacaoPorProvaPage() {
  const { anoJogo, tipoCarreira, temporada } = useAppContext();
  const [dados, setDados] = useState<DadosTemporada | null>(null);
  const [provaId, setProvaId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!anoJogo) {
        setDados(null);
        setProvaId(null);
        return;
      }
      setCarregando(true);
      const d = await carregarDadosTemporada(anoJogo, temporada, tipoCarreira);
      setDados(d);
      setCarregando(false);

      // por padrão, abre já na última prova que tem resultado lançado
      // (ou na primeira do calendário, se nada foi lançado ainda)
      const provasComResultado = d.provas.filter((p) => d.resultados.some((r) => r.id_prova === p.id));
      const ultima = provasComResultado[provasComResultado.length - 1];
      setProvaId(ultima?.id ?? d.provas[0]?.id ?? null);
    }
    carregar();
  }, [anoJogo, tipoCarreira, temporada]);

  const provaAtual = useMemo(() => dados?.provas.find((p) => p.id === provaId) ?? null, [dados, provaId]);

  const idsProvasConsideradas = useMemo(() => {
    if (!dados || !provaAtual) return new Set<number>();
    return new Set(dados.provas.filter((p) => p.ordem <= provaAtual.ordem).map((p) => p.id));
  }, [dados, provaAtual]);

  const pilotos = useMemo(
    () => (dados && provaAtual ? calcularClassificacaoPilotos(dados, idsProvasConsideradas) : []),
    [dados, provaAtual, idsProvasConsideradas]
  );

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
  if (dados.provas.length === 0) {
    return <div className="banner-warn">Nenhuma prova cadastrada para este ano do jogo ainda.</div>;
  }

  return (
    <div>
      <div className="banner-info">
        Escolha uma prova para ver os pontos e as estatísticas acumuladas até ela — útil pra saber como estava a
        temporada antes da corrida seguinte.
      </div>

      {dados.erros.length > 0 && (
        <div className="banner-error">Erro ao carregar dados: {dados.erros.join('; ')}</div>
      )}

      <div className="form-card form-grid">
        <div className="field">
          <label>Prova</label>
          <div className="select-wrap">
            <select value={provaId ?? ''} onChange={(e) => setProvaId(Number(e.target.value))}>
              {dados.provas.map((p) => (
                <option key={p.id} value={p.id}>
                  {String(p.ordem).padStart(2, '0')} — {p.nome_prova}
                  {p.sprint ? ' (sprint)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div>
          <span className="eyebrow">CLASSIFICAÇÃO</span>
          <h2>Pontos até esta prova</h2>
        </div>
      </div>
      <TorrePilotos linhas={pilotos} compact />

      <div className="section-head" style={{ marginTop: 28 }}>
        <div>
          <span className="eyebrow">ESTATÍSTICAS</span>
          <h2>Vitórias, poles e volta mais rápida até esta prova</h2>
        </div>
      </div>
      <div className="rank-grid">
        <CardRanking titulo="Vitórias" itens={vitorias} />
        <CardRanking titulo="Pole position" itens={poles} />
        <CardRanking titulo="Volta mais rápida" itens={voltasRapidas} />
      </div>
    </div>
  );
}
