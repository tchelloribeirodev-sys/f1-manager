import type { CSSProperties } from 'react';
import type { LinhaClassificacao, LinhaEquipe } from '../lib/classificacao';

// ---------- "tower" de pilotos/equipes, no mesmo layout do mockup
// f1-mockup-telas.html (posição + nome + pontos + gap para o líder) ----------

function gapPara(pontosLider: number, pontos: number) {
  const diff = pontosLider - pontos;
  return diff === 0 ? '—' : `-${diff}`;
}

export function TorrePilotos({ linhas, compact = false }: { linhas: LinhaClassificacao[]; compact?: boolean }) {
  const lider = linhas[0]?.pontos ?? 0;
  return (
    <div className="tower">
      {linhas.map((p, i) => (
        <div
          key={p.idPiloto}
          className={compact ? 'trow compact' : i === 0 ? 'trow p1' : 'trow'}
          style={{ '--tc': p.corEquipe } as CSSProperties}
        >
          <div className="t-pos">{i + 1}</div>
          <div className="t-name">
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

export function TorreEquipes({ linhas }: { linhas: LinhaEquipe[] }) {
  const lider = linhas[0]?.pontos ?? 0;
  return (
    <div className="tower">
      {linhas.map((eq, i) => (
        <div key={eq.idEquipe} className={i === 0 ? 'trow p1' : 'trow'} style={{ '--tc': eq.corEquipe } as CSSProperties}>
          <div className="t-pos">{i + 1}</div>
          <div className="t-name">
            <strong>{eq.nomeEquipe}</strong>
          </div>
          <div className="t-pts">{eq.pontos}</div>
          <div className="t-gap">{i === 0 ? '—' : gapPara(lider, eq.pontos)}</div>
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
