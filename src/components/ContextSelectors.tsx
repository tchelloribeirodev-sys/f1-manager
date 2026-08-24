import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { f1 } from '../lib/supabaseClient';
import type { TbAno } from '../lib/types';

/**
 * Equivalente aos combos "Jogo" / "Temporada" do topo do mockup — aqui
 * também com "Carreira" (Piloto/Equipe), que no mockup fica implícito.
 * Substitui as globais vAno/vTipo/vTemporada do Delphi.
 */
export default function ContextSelectors({ showTemporada = false }: { showTemporada?: boolean }) {
  const { anoJogo, tipoCarreira, temporada, setAnoJogo, setTipoCarreira, setTemporada } =
    useAppContext();
  const [anos, setAnos] = useState<TbAno[]>([]);

  useEffect(() => {
    f1()
      .from('tb_ano')
      .select('id, ano')
      .order('ano')
      .then(({ data }) => {
        const lista = (data as TbAno[]) ?? [];
        setAnos(lista);
        if (anoJogo === null && lista.length > 0) {
          setAnoJogo(lista[lista.length - 1].ano);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="context">
      <label>
        <span>Jogo</span>
        <div className="select-wrap">
          <select value={anoJogo ?? ''} onChange={(e) => setAnoJogo(Number(e.target.value))}>
            <option value="" disabled>
              selecione...
            </option>
            {anos.map((a) => (
              <option key={a.id} value={a.ano}>
                F1 {a.ano}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </div>
      </label>

      <label>
        <span>Carreira</span>
        <div className="select-wrap">
          <select value={tipoCarreira} onChange={(e) => setTipoCarreira(e.target.value as any)}>
            <option value="PILOTO">Piloto</option>
            <option value="EQUIPE">Equipe</option>
          </select>
          <ChevronDown size={16} />
        </div>
      </label>

      {showTemporada && (
        <label>
          <span>Temporada</span>
          <div className="select-wrap">
            <select value={temporada} onChange={(e) => setTemporada(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
                <option key={t} value={t}>
                  {t}ª Temporada
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </label>
      )}
    </div>
  );
}
