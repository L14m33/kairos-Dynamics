// Prueba de persistencia, CSV y falta de localStorage (sección 11, criterios 8 y 9).
// Usa un navigator.serial SIMULADO rápido (una lectura de cada nodo cada 0.5 s).
// Uso: node tests/persistencia_csv.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function dobleRapido() {
  const cod = new TextEncoder();
  class Puerto {
    getInfo() { return { usbVendorId: 0x1A86, usbProductId: 0x7523 }; }
    async open() {
      let seq = 0;
      const p = this;
      this.readable = new ReadableStream({
        start(ctl) {
          ctl.enqueue(cod.encode('{"v":1,"type":"hello","node":"A","fw":"kairos-A-1.0","board":"ESP32-D","sensors":1}\n'));
          p.t = setInterval(() => {
            seq += 1;
            const up = seq * 500;
            ctl.enqueue(cod.encode(JSON.stringify({ v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: 4.25, ok: true, seq, up_ms: up, via: 'local' }) + '\n' +
              JSON.stringify({ v: 1, type: 'reading', node: 'B', sensor: '28AA7B3C1D0E2F44', t_c: 12.5, ok: true, seq, up_ms: up, via: 'espnow', rssi: -61 }) + '\n'));
          }, 500);
        },
        cancel() { clearInterval(p.t); }
      });
    }
    async close() { clearInterval(this.t); this.readable = null; }
  }
  const serial = new EventTarget();
  serial.requestPort = async () => new Puerto();
  serial.getPorts = async () => [];
  Object.defineProperty(Navigator.prototype, 'serial', { configurable: true, get() { return serial; } });
}

function sinAlmacenamiento() {
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Bloqueado', 'SecurityError'); } });
}

(async () => {
  const url = 'file://' + path.resolve(__dirname, '..', 'kairos_dashboard.html');
  const navegador = await chromium.launch();
  const resultados = [];
  const comprobar = (n, ok, ev) => { resultados.push(ok); console.log((ok ? 'PASA ' : 'FALLA') + ' · ' + n + ' · ' + ev); };
  const errores = [];

  // ---------- 1) Registro real, recarga y CSV ----------
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(m.text()); });
  p.on('pageerror', (e) => errores.push(e.message));
  await p.addInitScript(dobleRapido);
  await p.goto(url + '#/dashboard');
  // Datos simulados primero: no deben guardarse.
  await p.waitForTimeout(1500);
  await p.click('#btn-modo-real');
  await p.click('#btn-chip');
  await p.waitForTimeout(6200);
  await p.click('a[data-ruta="dispositivos"]');
  await p.waitForTimeout(300);
  const lecturasA = Number(await p.$eval('#kv-nodo-A dt:nth-of-type(7)', (dt) => dt.nextElementSibling.textContent));
  await p.click('a[data-ruta="reportes"]');
  await p.waitForTimeout(300);
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#btn-csv-muestras')]);
  const ruta = await descarga.path();
  const bytes = fs.readFileSync(ruta);
  const texto = bytes.toString('utf8');
  const filas = texto.replace(/^\uFEFF/, '').trim().split('\r\n');
  const muestrasEsperadas = await p.evaluate(() => document.getElementById('almacen-estado').textContent);
  comprobar('CSV con BOM UTF-8', bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF, bytes.slice(0, 3).toString('hex'));
  comprobar('Nombre de archivo con el origen', /^kairos_real_\d{8}_\d{6}\.csv$/.test(descarga.suggestedFilename()), descarga.suggestedFilename());
  comprobar('Encabezado con las 11 columnas', filas[0] === 'origen,escenario,carga,nodo,sensor_id,t_c,ok,marca_tiempo,t_sim_h,vida_pct,horas_equiv_consumidas', filas[0]);
  comprobar('«origen» en todas las filas', filas.slice(1).every((f) => f.startsWith('real,')), filas.length - 1 + ' filas');
  comprobar('Acentos intactos (KD-LOT-A · Hielera)', texto.includes('KD-LOT-A · Hielera'), '');
  comprobar('Marca de tiempo ISO 8601 con zona', /,\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d,/.test(filas[1]), filas[1]);
  const nA = filas.filter((f) => f.includes(',A,')).length;
  comprobar('Filas del CSV = muestras (nodo A)', nA === lecturasA, 'CSV ' + nA + ' · Dispositivos ' + lecturasA);
  console.log('  ' + muestrasEsperadas);

  const [d2] = await Promise.all([p.waitForEvent('download'), p.click('#btn-csv-eventos')]);
  const ev = fs.readFileSync(await d2.path(), 'utf8');
  comprobar('CSV de eventos con BOM y columna origen', ev.charCodeAt(0) === 0xFEFF && ev.split('\r\n')[1].startsWith('real,'), d2.suggestedFilename());
  const [d3] = await Promise.all([p.waitForEvent('download'), p.click('#btn-json-meta')]);
  const meta = JSON.parse(fs.readFileSync(await d3.path(), 'utf8'));
  comprobar('Metadatos JSON con VID:PID, parámetros e inicio', meta.vid_pid === '1A86:7523' && meta.modelo.q10 === 2 && !!meta.inicio_monitoreo, d3.suggestedFilename());

  // Recarga: se conservan los reales y no los simulados (la página arranca en demostración).
  await p.reload();
  await p.waitForTimeout(800);
  comprobar('Al abrir, arranca en DEMOSTRACIÓN', (await p.getAttribute('#btn-modo-demo', 'aria-pressed')) === 'true', '');
  const claves = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('kairos.v1.')));
  comprobar('localStorage solo con claves kairos.v1. de datos reales', claves.includes('kairos.v1.real') && claves.every((k) => k === 'kairos.v1.real' || k === 'kairos.v1.nombres'), JSON.stringify(claves));
  const guardado = await p.evaluate(() => JSON.parse(localStorage.getItem('kairos.v1.real')));
  comprobar('Lo guardado no contiene datos simulados', guardado.eventos.every((e) => e.tipo !== 'Acción de demostración') && guardado.muestras.A.every((m) => m[1] !== null), guardado.muestras.A.length + ' muestras de A');
  await p.click('#btn-modo-real');
  await p.click('a[data-ruta="dispositivos"]');
  await p.waitForTimeout(400);
  const restauradas = Number(await p.$eval('#kv-nodo-A dt:nth-of-type(7)', (dt) => dt.nextElementSibling.textContent));
  comprobar('Al recargar se conservan las lecturas reales', restauradas >= lecturasA - 2 && restauradas > 0, restauradas + ' lecturas de A');
  await p.click('a[data-ruta="resumen"]');
  await p.waitForTimeout(300);
  const origen = await p.$eval('#resumen-tarjetas article .origen', (e) => e.textContent);
  comprobar('Tarjeta real con «Estimación en validación»', origen.includes('Estimación en validación'), origen);

  // Borrar datos locales con el diálogo propio.
  await p.click('a[data-ruta="reportes"]');
  await p.click('#btn-borrar');
  await p.waitForTimeout(200);
  comprobar('Diálogo propio abierto (no confirm())', await p.$eval('#dialogo', (d) => d.open), '');
  await p.click('#dialogo-aceptar');
  await p.waitForTimeout(300);
  const tras = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('kairos.v1.')).length);
  comprobar('«Borrar datos locales» funciona', tras === 0, tras + ' claves');
  await ctx.close();

  // ---------- 2) Sin localStorage ----------
  const ctx2 = await navegador.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errores.push(e.message));
  p2.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(m.text()); });
  await p2.addInitScript(sinAlmacenamiento);
  await p2.addInitScript(dobleRapido);
  await p2.goto(url + '#/dashboard');
  await p2.waitForTimeout(800);
  await p2.click('#btn-modo-real');
  await p2.waitForTimeout(200);
  const aviso = await p2.$eval('#aviso-almacen', (e) => !e.hidden && e.textContent);
  comprobar('Sin localStorage: aviso visible', aviso === 'Sin almacenamiento local: los datos se perderán al cerrar la página', String(aviso));
  await p2.click('#btn-chip');
  await p2.waitForTimeout(2000);
  const temp = await p2.$eval('#resumen-tarjetas article .temp-valor', (e) => e.textContent);
  comprobar('Sin localStorage: la página sigue funcionando', temp === '4.3' || temp === '4.2', temp + ' °C');
  await ctx2.close();

  comprobar('Cero errores y avisos en consola', errores.length === 0, JSON.stringify(errores.slice(0, 3)));
  await navegador.close();
  console.log(resultados.every(Boolean) ? 'RESULTADO: todo PASA' : 'RESULTADO: hay FALLAS');
  process.exit(resultados.every(Boolean) ? 0 : 1);
})();
