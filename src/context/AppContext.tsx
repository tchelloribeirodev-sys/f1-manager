import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TipoCarreira } from '../lib/types';

/**
 * Equivalente às variáveis globais do frmMenuPrincipal no Delphi
 * (vAno, vTipo, vTemporada). Como agora é um SPA sem servidor, a seleção
 * fica em localStorage em vez de cookies — mesmo conceito, guardada no
 * navegador do usuário.
 */
interface AppCtx {
  anoJogo: number | null;
  tipoCarreira: TipoCarreira;
  temporada: number;
  setAnoJogo: (v: number) => void;
  setTipoCarreira: (v: TipoCarreira) => void;
  setTemporada: (v: number) => void;
}

const Ctx = createContext<AppCtx | null>(null);

const LS_ANO = 'f1_ano_jogo';
const LS_TIPO = 'f1_tipo_carreira';
const LS_TEMP = 'f1_temporada';

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [anoJogo, setAnoJogo] = useState<number | null>(() => {
    const v = localStorage.getItem(LS_ANO);
    return v ? Number(v) : null;
  });
  const [tipoCarreira, setTipoCarreira] = useState<TipoCarreira>(() => {
    const v = localStorage.getItem(LS_TIPO);
    return v === 'EQUIPE' ? 'EQUIPE' : 'PILOTO';
  });
  const [temporada, setTemporada] = useState<number>(() => {
    const v = localStorage.getItem(LS_TEMP);
    return v ? Number(v) : 1;
  });

  useEffect(() => {
    if (anoJogo !== null) localStorage.setItem(LS_ANO, String(anoJogo));
  }, [anoJogo]);
  useEffect(() => {
    localStorage.setItem(LS_TIPO, tipoCarreira);
  }, [tipoCarreira]);
  useEffect(() => {
    localStorage.setItem(LS_TEMP, String(temporada));
  }, [temporada]);

  return (
    <Ctx.Provider value={{ anoJogo, tipoCarreira, temporada, setAnoJogo, setTipoCarreira, setTemporada }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppContext deve ser usado dentro de <AppContextProvider>');
  return ctx;
}
