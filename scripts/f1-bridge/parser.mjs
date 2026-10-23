// Decodificação mínima da telemetria UDP do F1 25 (formatos 2025 e 2026).
// Só lê o que o app precisa: sessão, posições (LapData), nomes (Participants)
// e classificação final. Tamanho de cada estrutura é deduzido pelo tamanho do
// pacote, então pequenas mudanças de layout entre formatos não quebram a leitura.
// Spec oficial: https://forums.ea.com/blog/f1-games-game-info-hub-en/f1%c2%ae-25-udp-specification/12187347

export const HEADER = 29;
export const PKT = { SESSION: 1, LAP_DATA: 2, PARTICIPANTS: 4, FINAL: 8 };

export function lerHeader(b) {
  if (b.length < HEADER) return null;
  return {
    formato: b.readUInt16LE(0),
    packetId: b.readUInt8(6),
    sessionUID: b.readBigUInt64LE(7).toString(),
    playerIdx: b.readUInt8(27)
  };
}

// Divide a área de carros do pacote: devolve { n: nº de carros, tam: bytes por carro }.
function dividir(len, inicio, sufixo, formato) {
  const area = len - inicio - sufixo;
  if (area <= 0) return null;
  const ordem = formato >= 2026 ? [24, 22] : [22, 24];
  for (const n of ordem) if (area % n === 0) return { n, tam: area / n };
  return null;
}

export function lerSessao(b) {
  if (b.length < 37) return null;
  return { totalVoltas: b.readUInt8(32), tipo: b.readUInt8(35), pistaId: b.readInt8(36) };
}

export function lerLapData(b, formato) {
  const d = dividir(b.length, HEADER, 2, formato);
  if (!d || d.tam < 46) return null;
  const carros = [];
  for (let i = 0; i < d.n; i++) {
    const o = HEADER + i * d.tam;
    carros.push({ pos: b.readUInt8(o + 32), volta: b.readUInt8(o + 33), resultado: b.readUInt8(o + 45) });
  }
  return { carros, tam: d.tam };
}

export function lerParticipantes(b, formato) {
  const d = dividir(b.length, HEADER + 1, 0, formato);
  if (!d || d.tam < 10) return null;
  const nomes = [];
  for (let i = 0; i < d.n; i++) {
    const o = HEADER + 1 + i * d.tam;
    let fim = o + 7;
    const lim = Math.min(o + 7 + 48, o + d.tam);
    while (fim < lim && b[fim] !== 0) fim++;
    nomes.push(b.toString('utf8', o + 7, fim).trim());
  }
  return nomes;
}

export function lerFinal(b, formato) {
  const d = dividir(b.length, HEADER + 1, 0, formato);
  if (!d || d.tam < 45) return null;
  const offVolta = d.tam >= 46 ? 7 : 6; // F1 25 tem "resultReason" antes da melhor volta
  const carros = [];
  for (let i = 0; i < d.n; i++) {
    const o = HEADER + 1 + i * d.tam;
    let ms = b.readUInt32LE(o + offVolta);
    if (ms < 30000 || ms > 600000) ms = 0; // descarta valores fora do plausível
    carros.push({
      pos: b.readUInt8(o),
      grid: b.readUInt8(o + 2),
      pontosJogo: b.readUInt8(o + 3),
      resultado: b.readUInt8(o + 5),
      melhorVoltaMs: ms
    });
  }
  return { carros, tam: d.tam };
}
