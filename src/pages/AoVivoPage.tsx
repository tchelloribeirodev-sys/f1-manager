import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useJogoAoVivo } from '../lib/liveChannel';
import BridgeConfig from '../components/BridgeConfig';
import {
  calcularClassificacaoEquipes,
  calcularClassificacaoPilotos,
  carregarDadosTemporada,
  type DadosTemporada
} from '../lib/classificacao';
import { carregarAlias, casarNomes, ehCorrida, resultadoTexto, rotuloSessao } from '../lib/jogoUdp';
import type { TbResultado, TbResultadoSprint } from '../lib/types';

function Delta({ valor }: { valor: number }) {
  if (valor === 0) return <span style={{ color: 'var(--text-faint)' }}>–</span>;
  return <span style={{ color: valor > 0 ? '#2ecc71' : '#ff5a52', fontWeight: 700 }}>{valor > 0 ? `▲${valor}` : `▼${-valor}`}</span>;
}

export default function AoVivoPage() {
  const { anoJogo, tipoCarreira, temporada } = useAppContext();
  const { live, conectado, ativo } = useJogoAoVivo();
  const [dados, setDados] = useState<DadosTemporada | null>(null);
  const [comoSprint, setComoSprint] = useState(false);

  function recarregar() {
    if (!anoJogo) return;
    carregarDadosTemporada(anoJogo, temporada, tipoCarreira).then(setDados);
  }
  useEffect(recarregar, [anoJogo, tipoCarreira, temporada]); // eslint-disable-line react-hooks/exhaustive-deps

  // prova "atual" = primeira do calendário que ainda não tem resultado lançado
  const provaAtual = useMemo(
    () => dados?.provas.find((p) => !dados.resultados.some((r) => r.id_prova === p.id)) ?? null,
    [dados]
  );

  const mapa = useMemo(
    () => (dados && live ? casarNomes(dados.roster, live.cars.map((c) => c.nome), carregarAlias()) : new Map<number, number>()),
    [dados, live]
  );
  const nomeDe = useMemo(() => new Map((dados?.roster ?? []).map((r) => [r.idPiloto, r.nomePiloto])), [dados]);

  const projecao = useMemo(() => {
    if (!dados || !live || !provaAtual || !ehCorrida(live.tipo)) return null;
    const ctx = { ano_jogo: anoJogo!, temporada, id_prova: provaAtual.id, tipo_carreira: tipoCarreira };
    const resultados: TbResultado[] = [];
    const sprints: TbResultadoSprint[] = [];
    live.cars.forEach((c, k) => {
      const id = mapa.get(k);
      if (!id) return;
      if (comoSprint) sprints.push({ id: -k - 1, ...ctx, id_piloto: id, posicao: c.pos });
      else resultados.push({ id: -k - 1, ...ctx, id_piloto: id, posicao: c.pos, pole: false, volta_mais_rapida: false });
    });
    const base = calcularClassificacaoPilotos(dados);
    const proj = calcularClassificacaoPilotos({
      ...dados,
      resultados: [...dados.resultados, ...resultados],
      resultadosSprint: [...dados.resultadosSprint, ...sprints]
    });
    const posBase = new Map(base.map((l, i) => [l.idPiloto, i + 1]));
    const ptsBase = new Map(base.map((l) => [l.idPiloto, l.pontos]));
    const eqBase = calcularClassificacaoEquipes(base);
    const eqProj = calcularClassificacaoEquipes(proj);
    const posEqBase = new Map(eqBase.map((l, i) => [l.idEquipe, i + 1]));
    const ptsEqBase = new Map(eqBase.map((l) => [l.idEquipe, l.pontos]));
    return { proj, posBase, ptsBase, eqProj, posEqBase, ptsEqBase };
  }, [dados, live, provaAtual, mapa, comoSprint, anoJogo, temporada, tipoCarreira]);

  if (!anoJogo) return <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>;

  const semCasar = live ? live.cars.filter((_, k) => !mapa.has(k)).map((c) => c.nome) : [];

  return (
    <div>
      <div className={ativo ? 'banner-info' : 'banner-warn'}>
        {!conectado
          ? 'Conectando ao canal ao vivo…'
          : !ativo
            ? 'Conectado, aguardando dados do jogo. Confira se o bridge está rodando no PC e se a telemetria UDP está ligada no jogo.'
            : `Ao vivo: ${live ? rotuloSessao(live.tipo) : ''}${provaAtual ? ` · prova atual: ${provaAtual.nome_prova}` : ''}`}
      </div>

      {live && ativo && (
        <div className="form-card form-grid">
          <div className="field">
            <label>Esta sessão conta como</label>
            <div className="select-wrap">
              <select value={comoSprint ? 'sprint' : 'corrida'} onChange={(e) => setComoSprint(e.target.value === 'sprint')}>
                <option value="corrida">Corrida principal</option>
                <option value="sprint">Sprint</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={recarregar}>Recarregar temporada</button>
          {!ehCorrida(live.tipo) && <span className="field-hint">A projeção do campeonato só aparece durante uma corrida.</span>}
        </div>
      )}

      {semCasar.length > 0 && (
        <div className="banner-warn">
          Sem correspondência no elenco: {semCasar.join(', ')}. Associe esses nomes uma vez em Prova a Prova › Importar do jogo.
        </div>
      )}

      {live && ativo && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
          <div className="table-card table-card--tight" style={{ flex: '1 1 280px' }}>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Pos</th><th>Piloto</th><th>Volta</th><th>Status</th></tr></thead>
                <tbody>
                  {live.cars.map((c, k) => (
                    <tr key={c.i} style={c.i === live.jogador ? { fontWeight: 800 } : undefined}>
                      <td>{c.pos}</td>
                      <td>{(mapa.get(k) && nomeDe.get(mapa.get(k)!)) || c.nome}</td>
                      <td>{c.volta}{live.totalVoltas ? `/${live.totalVoltas}` : ''}</td>
                      <td>{c.resultado >= 3 ? resultadoTexto(c.resultado) : 'Em pista'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {projecao && (
            <div style={{ flex: '2 1 380px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="table-card table-card--tight">
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>#</th><th>Piloto (se acabasse agora)</th><th>Pts</th><th>+Pts</th><th>Pos</th></tr></thead>
                    <tbody>
                      {projecao.proj.map((l, i) => (
                        <tr key={l.idPiloto}>
                          <td>{i + 1}</td>
                          <td>{l.nomePiloto}</td>
                          <td>{l.pontos}</td>
                          <td>{l.pontos - (projecao.ptsBase.get(l.idPiloto) ?? 0) || ''}</td>
                          <td><Delta valor={(projecao.posBase.get(l.idPiloto) ?? i + 1) - (i + 1)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="table-card table-card--tight">
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>#</th><th>Equipe</th><th>Pts</th><th>+Pts</th><th>Pos</th></tr></thead>
                    <tbody>
                      {projecao.eqProj.map((l, i) => (
                        <tr key={l.idEquipe}>
                          <td>{i + 1}</td>
                          <td><span style={{ borderLeft: `4px solid ${l.corEquipe}`, paddingLeft: 8 }}>{l.nomeEquipe}</span></td>
                          <td>{l.pontos}</td>
                          <td>{l.pontos - (projecao.ptsEqBase.get(l.idEquipe) ?? 0) || ''}</td>
                          <td><Delta valor={(projecao.posEqBase.get(l.idEquipe) ?? i + 1) - (i + 1)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <BridgeConfig />
    </div>
  );
}
