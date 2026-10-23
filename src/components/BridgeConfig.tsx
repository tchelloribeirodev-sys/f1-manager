import { useEffect, useState } from 'react';
import { f1 } from '../lib/supabaseClient';

const REDE_LOCAL = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function validar(texto: string): string | null {
  for (const parte of texto.split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = parte.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/);
    if (!m || m[1].split('.').some((n) => Number(n) > 255) || Number(m[2]) < 1 || Number(m[2]) > 65535) return `"${parte}" não é IP:porta válido.`;
    if (!REDE_LOCAL.test(m[1])) return `"${m[1]}" não é endereço de rede local (127.x, 10.x, 172.16-31.x, 192.168.x).`;
  }
  return null;
}

// Destino para onde o bridge repassa os pacotes UDP (SimHub, Aethernum...).
// Fica em f1.tb_bridge_config; o bridge relê a cada ~10 s.
export default function BridgeConfig() {
  const [valor, setValor] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    f1().from('tb_bridge_config').select('forward_to').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) setMsg({ tipo: 'erro', texto: `${error.message} (rodou a migration 0012?)` });
      else setValor(data?.forward_to ?? '');
    });
  }, []);

  async function salvar() {
    const erro = validar(valor);
    if (erro) return setMsg({ tipo: 'erro', texto: erro });
    setSalvando(true);
    const { error } = await f1().from('tb_bridge_config').upsert({ id: 1, forward_to: valor.trim(), updated_at: new Date().toISOString() });
    setSalvando(false);
    setMsg(error ? { tipo: 'erro', texto: error.message } : { tipo: 'ok', texto: 'Salvo. O bridge aplica em até ~10 s.' });
  }

  return (
    <div className="form-card form-grid" style={{ marginTop: 20 }}>
      <div className="field" style={{ minWidth: 280 }}>
        <label>Repasse de pacotes (IP:porta)</label>
        <input type="text" value={valor} placeholder="ex.: 192.168.0.15:20778 (vazio = usa o .env)" onChange={(e) => setValor(e.target.value)} />
      </div>
      <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      {msg && <span className="field-hint" style={{ color: msg.tipo === 'erro' ? '#ff8f8a' : undefined }}>{msg.texto}</span>}
    </div>
  );
}
