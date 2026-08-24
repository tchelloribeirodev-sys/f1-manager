import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { carregarConfronto, carregarPilotosDoAno, type Confronto, type PilotoOpcao } from '../lib/confronto';

function LinhaComparativa({ rotulo, valorA, valorB, formatar }: { rotulo: string; valorA: number | null; valorB: number | null; formatar?: (v: number) => string }) {
  const a = valorA ?? 0;
  const b = valorB ?? 0;
  const total = a + b || 1;
  const fmt = (v: number | null) => (v === null ? '—' : formatar ? formatar(v) : String(v));
  return (
    <div className="confronto-linha">
      <div className="confronto-valor esquerda">{fmt(valorA)}</div>
      <div className="confronto-meio">
        <div className="confronto-rotulo">{rotulo}</div>
        <div className="confronto-barra">
          <div className="confronto-barra-a" style={{ width: `${(a / total) * 100}%` }} />
          <div className="confronto-barra-b" style={{ width: `${(b / total) * 100}%` }} />
        </div>
      </div>
      <div className="confronto-valor direita">{fmt(valorB)}</div>
    </div>
  );
}

export default function ConfrontoPage() {
  const { anoJogo, tipoCarreira } = useAppContext();
  const [pilotos, setPilotos] = useState<PilotoOpcao[]>([]);
  const [idA, setIdA] = useState<number | ''>('');
  const [idB, setIdB] = useState<number | ''>('');
  const [temporadaFiltro, setTemporadaFiltro] = useState<number | ''>('');
  const [confronto, setConfronto] = useState<Confronto | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    async function carregar() {
      if (!anoJogo) {
        setPilotos([]);
        return;
      }
      const lista = await carregarPilotosDoAno(anoJogo, tipoCarreira);
      setPilotos(lista);
      setIdA('');
      setIdB('');
      setTemporadaFiltro('');
      setConfronto(null);
    }
    carregar();
  }, [anoJogo, tipoCarreira]);

  useEffect(() => {
    async function comparar() {
      if (!anoJogo || !idA || !idB || idA === idB) {
        setConfronto(null);
        return;
      }
      setCarregando(true);
      setConfronto(await carregarConfronto(anoJogo, tipoCarreira, idA, idB, temporadaFiltro || null));
      setCarregando(false);
    }
    comparar();
  }, [anoJogo, tipoCarreira, idA, idB, temporadaFiltro]);

  const nomeA = pilotos.find((p) => p.id === idA)?.nome_piloto ?? 'Piloto A';
  const nomeB = pilotos.find((p) => p.id === idB)?.nome_piloto ?? 'Piloto B';

  if (!anoJogo) {
    return <div className="banner-warn">Selecione um ano do jogo no topo para continuar.</div>;
  }

  return (
    <div>
      <div className="banner-info">
        Compara dois pilotos no F1 {anoJogo}
        {temporadaFiltro ? `, só na ${temporadaFiltro}ª Temporada` : ' ao longo de todas as temporadas'}. O cara a
        cara conta só as provas em que os dois terminaram, comparando quem ficou na frente.
      </div>

      <div className="form-card form-grid">
        <div className="field">
          <label>Temporada</label>
          <div className="select-wrap">
            <select value={temporadaFiltro} onChange={(e) => setTemporadaFiltro(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todas</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
                <option key={t} value={t}>
                  {t}ª Temporada
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Piloto A</label>
          <div className="select-wrap">
            <select value={idA} onChange={(e) => setIdA(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecione...</option>
              {pilotos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === idB}>
                  {p.nome_piloto}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Piloto B</label>
          <div className="select-wrap">
            <select value={idB} onChange={(e) => setIdB(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecione...</option>
              {pilotos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === idA}>
                  {p.nome_piloto}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {carregando && <div className="banner-info">Comparando...</div>}

      {confronto && !carregando && (
        <div className="confronto-card">
          <div className="confronto-titulos">
            <div>{nomeA}</div>
            <div>{nomeB}</div>
          </div>

          <LinhaComparativa rotulo="Cabeça a cabeça" valorA={confronto.cabeacabecaA} valorB={confronto.cabeacabecaB} />
          <LinhaComparativa rotulo="Vitórias" valorA={confronto.vitoriasA} valorB={confronto.vitoriasB} />
          <LinhaComparativa rotulo="Pódios" valorA={confronto.podiosA} valorB={confronto.podiosB} />
          <LinhaComparativa rotulo="Poles" valorA={confronto.polesA} valorB={confronto.polesB} />
          <LinhaComparativa
            rotulo="Posição média"
            valorA={confronto.posMediaA}
            valorB={confronto.posMediaB}
            formatar={(v) => v.toFixed(1)}
          />

          <div className="confronto-nota">
            {confronto.corridasComparadas} prova(s) em que os dois terminaram — usadas no cabeça a cabeça.
          </div>
        </div>
      )}
    </div>
  );
}
