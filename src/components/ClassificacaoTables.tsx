import type { CSSProperties } from 'react';
import type { LinhaClassificacao, LinhaEquipe } from '../lib/classificacao';

// ---------- "tower" de pilotos/equipes, no mesmo layout do mockup
// f1-mockup-telas.html (posição + nome + pontos + gap para o líder) ----------

export type Variacao = Record<number, number> | null;

// Seta de mudança de posição: verde ▲ quando subiu, vermelha ▼ quando desceu.
// Sem variação (ou sem prova anterior) não renderiza nada.
export function SetaVariacao({ delta }: { delta?: number }) {
  if (!delta) return null;
  const subiu = delta > 0;
  return (
    <span
      className={subiu ? 'pos-delta up' : 'pos-delta down'}
      title={subiu ? `Subiu ${delta} posição(ões)` : `Caiu ${-delta} posição(ões)`}
    >
      {subiu ? '▲' : '▼'}
      <small>{Math.abs(delta)}</small>
    </span>
  );
}

function gapPara(pontosLider: number, pontos: number) {
  const diff = pontosLider - pontos;
  return diff === 0 ? '—' : `-${diff}`;
}

export function TorrePilotos({
  linhas,
  compact = false,
  mapaBandeiras = {},
  variacao = null
}: {
  linhas: LinhaClassificacao[];
  compact?: boolean;
  mapaBandeiras?: Record<string, string>;
  variacao?: Variacao;
}) {
  const lider = linhas[0]?.pontos ?? 0;
  return (
    <div className="tower">
      {linhas.map((p, i) => (
        <div
          key={p.idPiloto}
          className={`${compact ? 'trow compact' : i === 0 ? 'trow p1' : 'trow'}${variacao ? ' with-delta' : ''}`}
          style={{ '--tc': p.corEquipe } as CSSProperties}
        >
          <div className="t-pos">
            {i + 1}
            {variacao && <SetaVariacao delta={variacao[p.idPiloto]} />}
          </div>
          <div className="t-name">
            {p.paisPiloto && mapaBandeiras[p.paisPiloto] && (
              <span className="flag-chip">
                <img src={mapaBandeiras[p.paisPiloto]} alt={p.paisPiloto} />
              </span>
            )}
            <strong>{p.nomePiloto}</strong>
          </div>
          <div className="t-pts">{p.pontos}</div>
          {!compact && <div className="t-gap">{i === 0 ? '—' : gapPara(lider, p.pontos)}</div>}
        </div>
      ))}
      {linhas.length === 0 && <div className="rank-empty" style={{ padding: 14 }}>Nenhum resultado lançado ainda.</div>}
    </div>
  );
}

export function TorreEquipes({
  linhas,
  compact = false,
  variacao = null
}: {
  linhas: LinhaEquipe[];
  compact?: boolean;
  variacao?: Variacao;
}) {
  const lider = linhas[0]?.pontos ?? 0;
  return (
    <div className="tower">
      {linhas.map((eq, i) => (
        <div
          key={eq.idEquipe}
          className={`${compact ? 'trow compact' : i === 0 ? 'trow p1' : 'trow'}${variacao ? ' with-delta' : ''}`}
          style={{ '--tc': eq.corEquipe } as CSSProperties}>
          <div className="t-pos">
            {i + 1}
            {variacao && <SetaVariacao delta={variacao[eq.idEquipe]} />}
          </div>
          <div className="t-name">
            {eq.imagemEquipe && (
              <span className="team-logo">
                <img src={eq.imagemEquipe} alt={eq.nomeEquipe} />
              </span>
            )}
            <strong>{eq.nomeEquipe}</strong>
          </div>
          <div className="t-pts">{eq.pontos}</div>
          {!compact && <div className="t-gap">{i === 0 ? '—' : gapPara(lider, eq.pontos)}</div>}
        </div>
      ))}
      {linhas.length === 0 && <div className="rank-empty" style={{ padding: 14 }}>Nenhum resultado lançado ainda.</div>}
    </div>
  );
}

// ---------- "stat card" de ranking (vitórias / poles / volta mais rápida),
// mesmo layout do mockup (nome + barrinha de cor da equipe + quantidade) ----------

export type ItemRanking = { chave: string; nome: string; corEquipe: string; qtd: number };

export function CardRanking({ titulo, itens }: { titulo: string; itens: ItemRanking[] }) {
  const max = Math.max(1, ...itens.map((i) => i.qtd));
  return (
    <div className="rank-card">
      <h3>{titulo}</h3>
      {itens.map((it) => (
        <div className="rank-line" key={it.chave}>
          <div className="who">
            <span className="sw" style={{ background: it.corEquipe }} />
            {it.nome}
          </div>
          <div className="qty">{it.qtd}</div>
        </div>
      ))}
      {itens.length === 0 && <div className="rank-empty">Nenhum registro até aqui.</div>}
    </div>
  );
}
