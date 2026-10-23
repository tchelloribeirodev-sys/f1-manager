// Ponte entre o F1 25 (UDP, no PC do jogo) e o app na Vercel/Supabase.
//  - posições ao vivo  -> Supabase Realtime (broadcast), ~1x por segundo
//  - fim de cada sessão -> tabela f1.tb_sessao_jogo (rascunho; NÃO toca em tb_resultado)
// Uso: npm run bridge   (ou npm run bridge:debug para ver as posições no terminal)
import dgram from 'node:dgram';
import { createClient } from '@supabase/supabase-js';
import { PKT, lerHeader, lerSessao, lerLapData, lerParticipantes, lerFinal } from './parser.mjs';

const env = process.env;
const faltando = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'BRIDGE_EMAIL', 'BRIDGE_PASSWORD'].filter((k) => !env[k]);
if (faltando.length) {
  console.error(`Faltam variáveis no scripts/f1-bridge/.env: ${faltando.join(', ')}`);
  process.exit(1);
}

const PORTA = Number(env.UDP_PORT ?? 20777);
const CANAL = env.LIVE_CHANNEL || 'f1-live';
const PRIVADO = env.LIVE_PRIVATE === 'true';
const DEBUG = process.argv.includes('--debug');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: true }
});

const { error: erroLogin } = await supabase.auth.signInWithPassword({
  email: env.BRIDGE_EMAIL,
  password: env.BRIDGE_PASSWORD
});
if (erroLogin) {
  console.error('Falha no login do bridge:', erroLogin.message);
  process.exit(1);
}
console.log('[supabase] autenticado como', env.BRIDGE_EMAIL);

let canalPronto = false;
const canal = supabase.channel(CANAL, { config: { private: PRIVADO, broadcast: { self: false } } });
canal.subscribe((status) => {
  canalPronto = status === 'SUBSCRIBED';
  console.log('[realtime]', status);
});

const estado = { formato: 0, uid: null, jogador: 0, sessao: null, nomes: [], carros: [], sujo: false, ultimoPacote: 0 };
const avisados = new Set();
function avisarUmaVez(chave, msg) {
  if (avisados.has(chave)) return;
  avisados.add(chave);
  console.warn('[aviso]', msg);
}


// ---- destino do repasse (FORWARD_TO): vem do app (f1.tb_bridge_config) ou, se vazio, do .env ----
const REDE_LOCAL = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
function parseDestinos(texto) {
  const ok = [];
  for (const parte of (texto ?? '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = parte.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/);
    const porta = m ? Number(m[2]) : 0;
    const invalido =
      !m || porta < 1 || porta > 65535 || m[1].split('.').some((n) => Number(n) > 255) || !REDE_LOCAL.test(m[1]);
    if (invalido) {
      console.warn(`[forward] ignorado (use IP:porta de rede local): ${parte}`);
      continue;
    }
    if (porta === PORTA && m[1].startsWith('127.')) {
      console.warn(`[forward] ignorado (repassar para a própria porta ${PORTA} criaria um laço): ${parte}`);
      continue;
    }
    ok.push({ host: m[1], porta });
  }
  return ok;
}
let forwardTexto = env.FORWARD_TO ?? '';
let destinos = parseDestinos(forwardTexto);
async function carregarConfig() {
  const { data, error } = await supabase.schema('f1').from('tb_bridge_config').select('forward_to').eq('id', 1).maybeSingle();
  if (error) return avisarUmaVez('cfg', `não consegui ler tb_bridge_config (rodou a migration 0012?): ${error.message}`);
  const texto = data?.forward_to?.trim() || (env.FORWARD_TO ?? '');
  if (texto !== forwardTexto) {
    forwardTexto = texto;
    destinos = parseDestinos(texto);
    console.log('[forward] destino atualizado:', texto || '(nenhum)');
  }
}
await carregarConfig();
setInterval(carregarConfig, 10000);

async function tratarFinal(h, fim) {
  const carros = fim.carros
    .map((c, i) => ({
      i,
      nome: estado.nomes[i] || `Carro ${i}`,
      pos: c.pos,
      grid: c.grid,
      resultado: c.resultado,
      melhorVoltaMs: c.melhorVoltaMs
    }))
    .filter((c) => c.pos > 0 && c.resultado > 0)
    .sort((a, b) => a.pos - b.pos);

  const tipo = estado.sessao?.tipo ?? 0;
  const payload = { sessionType: tipo, trackId: estado.sessao?.pistaId ?? null, totalLaps: estado.sessao?.totalVoltas ?? 0, cars: carros };
  const { error } = await supabase
    .schema('f1')
    .from('tb_sessao_jogo')
    .upsert(
      { session_uid: h.sessionUID, session_type: tipo, track_id: payload.trackId, payload },
      { onConflict: 'session_uid,session_type' }
    );
  if (error) console.error('[final] erro ao gravar rascunho:', error.message);
  else console.log(`[final] sessão tipo ${tipo} guardada (${carros.length} carros). P1: ${carros[0]?.nome ?? '?'}`);
}

const sock = dgram.createSocket('udp4');
sock.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[udp] a porta ${PORTA} já está em uso (SimHub, Aethernum ou outro programa?). Mude UDP_PORT e use FORWARD_TO no bridge, veja README-AO-VIVO.md.`);
    process.exit(1);
  }
  console.error('[udp]', e.message);
});
sock.on('listening', () => console.log(`[udp] ouvindo na porta ${PORTA}${destinos.length ? `, repassando para ${forwardTexto}` : ''}`));

sock.on('message', (msg) => {
  for (const d of destinos) sock.send(msg, d.porta, d.host);
  const h = lerHeader(msg);
  if (!h) return;
  estado.ultimoPacote = Date.now();
  estado.formato = h.formato;
  estado.uid = h.sessionUID;
  estado.jogador = h.playerIdx;

  try {
    if (h.packetId === PKT.SESSION) {
      const s = lerSessao(msg);
      if (s) estado.sessao = s;
    } else if (h.packetId === PKT.PARTICIPANTS) {
      const nomes = lerParticipantes(msg, h.formato);
      if (nomes) estado.nomes = nomes;
    } else if (h.packetId === PKT.LAP_DATA) {
      const l = lerLapData(msg, h.formato);
      if (l) {
        if (l.tam !== 57) avisarUmaVez('lap', `LapData com ${l.tam} bytes por carro (esperado 57): confira as posições com --debug.`);
        estado.carros = l.carros;
        estado.sujo = true;
      }
    } else if (h.packetId === PKT.FINAL) {
      const f = lerFinal(msg, h.formato);
      if (f) {
        if (f.tam > 46) avisarUmaVez('fin', `FinalClassification com ${f.tam} bytes por carro (esperado 45/46): melhor volta pode estar errada.`);
        tratarFinal(h, f);
      }
    }
  } catch (e) {
    console.error('[parse]', e.message);
  }
});
sock.bind(PORTA);

setInterval(() => {
  if (!estado.sujo || !estado.sessao) return;
  estado.sujo = false;
  const cars = estado.carros
    .map((c, i) => ({ i, nome: estado.nomes[i] || `Carro ${i}`, pos: c.pos, volta: c.volta, resultado: c.resultado }))
    .filter((c) => c.pos > 0 && c.resultado >= 2)
    .sort((a, b) => a.pos - b.pos);
  if (DEBUG) console.table(cars.map((c) => ({ pos: c.pos, piloto: c.nome, volta: c.volta, status: c.resultado })));
  if (!canalPronto) return;
  canal.send({
    type: 'broadcast',
    event: 'live',
    payload: { t: Date.now(), tipo: estado.sessao.tipo, pistaId: estado.sessao.pistaId, totalVoltas: estado.sessao.totalVoltas, jogador: estado.jogador, cars }
  });
}, 1000);

setInterval(() => {
  if (estado.ultimoPacote && Date.now() - estado.ultimoPacote > 15000) {
    console.log('[udp] sem pacotes há 15s (jogo pausado ou fechado).');
    estado.ultimoPacote = 0;
  }
}, 5000);

process.on('SIGINT', async () => {
  await supabase.removeAllChannels();
  process.exit(0);
});
