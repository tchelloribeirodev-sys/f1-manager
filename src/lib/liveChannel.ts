import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import type { PayloadLive } from './jogoUdp';

// Mesmo nome configurado no bridge (LIVE_CHANNEL). Use um nome difícil de adivinhar.
const CANAL = (import.meta.env.VITE_LIVE_CHANNEL as string | undefined) || 'f1-live';
const PRIVADO = import.meta.env.VITE_LIVE_PRIVATE === 'true';

/** Escuta as posições ao vivo enviadas pelo bridge. `ativo` = recebeu algo nos últimos 6 s. */
export function useJogoAoVivo() {
  const [live, setLive] = useState<PayloadLive | null>(null);
  const [recebidoEm, setRecebidoEm] = useState(0);
  const [conectado, setConectado] = useState(false);
  const [agora, setAgora] = useState(Date.now());

  useEffect(() => {
    const ch = supabase
      .channel(CANAL, { config: { private: PRIVADO } })
      .on('broadcast', { event: 'live' }, ({ payload }) => {
        setLive(payload as PayloadLive);
        setRecebidoEm(Date.now()); // relógio local: não depende do relógio do PC do jogo
      })
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'));
    const tick = setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      clearInterval(tick);
      supabase.removeChannel(ch);
    };
  }, []);

  return { live, conectado, ativo: !!live && agora - recebidoEm < 6000 };
}
