import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Tema = 'dark' | 'light';

interface ThemeCtx {
  tema: Tema;
  alternarTema: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const LS_TEMA = 'f1_tema';

function lerTemaInicial(): Tema {
  const salvo = localStorage.getItem(LS_TEMA);
  if (salvo === 'light' || salvo === 'dark') return salvo;
  // sem preferência salva, respeita o esquema do sistema operacional/navegador
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerTemaInicial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem(LS_TEMA, tema);
  }, [tema]);

  function alternarTema() {
    setTema((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return <Ctx.Provider value={{ tema, alternarTema }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  return ctx;
}
