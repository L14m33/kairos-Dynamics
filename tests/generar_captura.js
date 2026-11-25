// Genera tests/captura_ejemplo.jsonl: 3 minutos de NDJSON INVENTADO con las
// mismas fallas que tests/serial_simulado.js (arranque, −127, 85.0, salto de
// seq, reinicio de A y 30 s de silencio de B). No son lecturas reales.
const fs = require('fs');
const path = require('path');
const L = (o) => JSON.stringify(o);
const lineas = ['# CAPTURA INVENTADA PARA PRUEBAS: no son lecturas reales de KAIROS DYNAMICS',
  'ets Jun  8 2016 00:22:57', 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)',
  L({ v: 1, type: 'hello', node: 'A', fw: 'kairos-A-1.0', board: 'ESP32-D', sensors: 1 })];
let seqA = 0, seqB = 0, upA = 900, upB = 400;
for (let t = 1; t <= 180; t += 5) {
  if (t === 91) { lineas.push('ets Jun  8 2016 00:22:57', 'rst:0xc (SW_CPU_RESET)'); seqA = 0; upA = 800; }
  seqA += 1; upA += 5000;
  let a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: 4.06, ok: true, seq: seqA, up_ms: upA, via: 'local' };
  if (t === 31) a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: null, ok: false, err: 'disconnected', seq: seqA, up_ms: upA, via: 'local' };
  if (t === 36) a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: -127.0, ok: true, seq: seqA, up_ms: upA, via: 'local' };
  if (t === 41) a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: 85.0, ok: true, seq: seqA, up_ms: upA, via: 'local' };
  lineas.push(L(a));
  seqB += 1; upB += 5000;
  if (t === 61) seqB += 2;
  if (!(t >= 120 && t < 150)) lineas.push(L({ v: 1, type: 'reading', node: 'B', sensor: '28AA7B3C1D0E2F44', t_c: t < 60 ? 4.5 : 24.5, ok: true, seq: seqB, up_ms: upB, via: 'espnow', rssi: -58 }));
  if ((t - 1) % 10 === 0) lineas.push(L({ v: 1, type: 'status', node: 'A', peer: 'B', peer_age_ms: 1200 }));
}
fs.writeFileSync(path.join(__dirname, 'captura_ejemplo.jsonl'), lineas.join('\r\n') + '\r\n');
console.log(lineas.length + ' líneas escritas en tests/captura_ejemplo.jsonl');
