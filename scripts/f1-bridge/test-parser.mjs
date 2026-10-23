// Teste do parser com pacotes sintéticos (não precisa do jogo): npm run bridge:test
import assert from 'node:assert/strict';
import { HEADER, lerHeader, lerSessao, lerLapData, lerParticipantes, lerFinal } from './parser.mjs';

function cabecalho(formato, packetId, len) {
  const b = Buffer.alloc(len);
  b.writeUInt16LE(formato, 0);
  b.writeUInt8(25, 2);
  b.writeUInt8(packetId, 6);
  b.writeBigUInt64LE(123456789n, 7);
  b.writeUInt8(3, 27);
  return b;
}

for (const [formato, n] of [[2025, 22], [2026, 24]]) {
  // LapData: 57 bytes/carro + 2 bytes finais
  let b = cabecalho(formato, 2, HEADER + n * 57 + 2);
  for (let i = 0; i < n; i++) {
    const o = HEADER + i * 57;
    b.writeUInt8(i + 1, o + 32);
    b.writeUInt8(7, o + 33);
    b.writeUInt8(i < 20 ? 2 : 0, o + 45);
  }
  const lap = lerLapData(b, formato);
  assert.equal(lap.carros.length, n);
  assert.equal(lap.carros[4].pos, 5);
  assert.equal(lap.carros[4].volta, 7);

  // Participants: 58 bytes/carro, nome começa no byte 7
  b = cabecalho(formato, 4, HEADER + 1 + n * 58);
  for (let i = 0; i < n; i++) b.write(`PILOTO${i}`, HEADER + 1 + i * 58 + 7, 'utf8');
  const nomes = lerParticipantes(b, formato);
  assert.equal(nomes.length, n);
  assert.equal(nomes[3], 'PILOTO3');

  // Final classification: 46 bytes/carro (melhor volta no byte 7) e 45 (byte 6)
  for (const tam of [46, 45]) {
    b = cabecalho(formato, 8, HEADER + 1 + n * tam);
    for (let i = 0; i < n; i++) {
      const o = HEADER + 1 + i * tam;
      b.writeUInt8(i + 1, o);
      b.writeUInt8(i + 1, o + 2);
      b.writeUInt8(i === 5 ? 4 : 3, o + 5);
      b.writeUInt32LE(90000 + i * 100, o + (tam >= 46 ? 7 : 6));
    }
    const f = lerFinal(b, formato);
    assert.equal(f.carros.length, n);
    assert.equal(f.carros[0].melhorVoltaMs, 90000);
    assert.equal(f.carros[5].resultado, 4);
  }
}

const s = cabecalho(2026, 1, 753);
s.writeUInt8(57, 32);
s.writeUInt8(15, 35);
s.writeInt8(3, 36);
assert.deepEqual(lerSessao(s), { totalVoltas: 57, tipo: 15, pistaId: 3 });
const h = lerHeader(s);
assert.equal(h.formato, 2026);
assert.equal(h.packetId, 1);
assert.equal(h.sessionUID, '123456789');
assert.equal(h.playerIdx, 3);
console.log('parser OK');
