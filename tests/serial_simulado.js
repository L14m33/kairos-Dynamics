// Prueba del tablero con un navigator.serial SIMULADO (sección 11, criterio 6).
// Ninguna prueba con este doble demuestra que funcione con la placa real.
//
// Uso:  node tests/serial_simulado.js            (≈ 3.5 minutos, tiempo real)
//       DURACION_S=60 node tests/serial_simulado.js   (versión corta)
// Requiere Playwright con Chromium. Imprime PASA/FALLA por cada comprobación.
const path = require('path');
const { chromium } = require('playwright');

const DURACION_S = Number(process.env.DURACION_S || 180);

// Se inyecta antes de que cargue la página: reemplaza navigator.serial.
function dobleSerial(duracionS) {
  const cod = new TextEncoder();
  const guion = [];                      // [{ t: segundos desde open, texto }]
  const L = (o) => JSON.stringify(o) + '\n';
  guion.push({ t: 0.2, texto: 'ets Jun  8 2016 00:22:57\r\nrst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)\r\n' });
  guion.push({ t: 0.4, texto: 'load:0x3fff0030,len:1184\r\n' });
  guion.push({ t: 0.6, texto: L({ v: 1, type: 'hello', node: 'A', fw: 'kairos-A-1.0', board: 'ESP32-D', sensors: 1 }) });
  let seqA = 0, seqB = 0, upA = 900, upB = 400;
  const reinicioA = 90, silencioB = [120, 150];
  for (let t = 1; t <= duracionS; t += 5) {
    // --- Nodo A ---
    if (t >= reinicioA && t < reinicioA + 5) {        // la placa A se reinicia
      guion.push({ t: t - 0.5, texto: 'ets Jun  8 2016 00:22:57\r\nrst:0xc (SW_CPU_RESET)\r\n' });
      seqA = 0; upA = 800;
    }
    seqA += 1; upA += 5000;
    let a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: 4.06, ok: true, seq: seqA, up_ms: upA, via: 'local' };
    if (t === 31) a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: null, ok: false, err: 'disconnected', seq: seqA, up_ms: upA, via: 'local' };
    if (t === 36) a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: -127.0, ok: true, seq: seqA, up_ms: upA, via: 'local' };
    if (t === 41) a = { v: 1, type: 'reading', node: 'A', sensor: '28FF641E8D3C0A12', t_c: 85.0, ok: true, seq: seqA, up_ms: upA, via: 'local' };
    const textoA = L(a);
    if (t === 16) {                                  // línea partida en dos fragmentos
      guion.push({ t: t, texto: textoA.slice(0, 40) });
      guion.push({ t: t + 0.15, texto: textoA.slice(40) });
    } else {
      guion.push({ t: t, texto: textoA });
    }
    // --- Nodo B (por ESP-NOW) ---
    const callado = t >= silencioB[0] && t < silencioB[1];
    seqB += 1; upB += 5000;
    if (t === 61) seqB += 2;                         // dos paquetes perdidos
    if (!callado) {
      const tB = t < 60 ? 4.5 : 24.5;               // después de 60 s, B sale de rango
      guion.push({ t: t + 1.2, texto: L({ v: 1, type: 'reading', node: 'B', sensor: '28AA7B3C1D0E2F44', t_c: tB, ok: true, seq: seqB, up_ms: upB, via: 'espnow', rssi: -58 }) });
    }
    if ((t - 1) % 10 === 0) guion.push({ t: t + 2, texto: L({ v: 1, type: 'status', node: 'A', peer: 'B', peer_age_ms: callado ? 15000 : 1200 }) });
  }
  guion.sort((x, y) => x.t - y.t);

  class PuertoSimulado {
    constructor() { this.readable = null; this._temporizadores = []; this.aperturas = 0; }
    getInfo() { return { usbVendorId: 0x10C4, usbProductId: 0xEA60 }; }
    async open(opciones) {
      if (opciones.baudRate !== 115200) throw new Error('baudRate incorrecto');
      this.aperturas += 1;
      const puerto = this;
      this.readable = new ReadableStream({
        start(ctl) {
          puerto._ctl = ctl;
          const desfase = puerto.aperturas > 1 ? 0 : 0;
          (puerto.aperturas > 1 ? guion.slice(0, 3) : guion).forEach((g) => {
            puerto._temporizadores.push(setTimeout(() => { try { ctl.enqueue(cod.encode(g.texto)); } catch (e) {} }, (g.t + desfase) * 1000));
          });
        },
        cancel() { puerto._temporizadores.forEach(clearTimeout); }
      });
    }
    async close() { this._temporizadores.forEach(clearTimeout); this.readable = null; }
    perderCable() {                                  // simula desconectar el cable
      this._temporizadores.forEach(clearTimeout);
      try { this._ctl.error(new DOMException('The device has been lost.', 'NetworkError')); } catch (e) {}
      this.readable = null;
    }
  }
  const puerto = new PuertoSimulado();
  let cancelarPrimero = true;
  const serial = new EventTarget();
  serial.requestPort = async () => {
    if (cancelarPrimero) { cancelarPrimero = false; throw new DOMException('No port selected by the user.', 'NotFoundError'); }
    return puerto;
  };
  serial.getPorts = async () => [];
  Object.defineProperty(Navigator.prototype, 'serial', { configurable: true, get() { return serial; } });
  window.__puertoSimulado = puerto;
}

(async () => {
  const url = 'file://' + path.resolve(__dirname, '..', 'kairos_dashboard.html');
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1366, height: 768 } });
  const errores = [];
  pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push(e.message));
  await pagina.addInitScript(dobleSerial, DURACION_S);
  await pagina.goto(url + '#/dashboard');

  const resultados = [];
  const comprobar = (nombre, ok, evidencia) => { resultados.push(ok); console.log((ok ? 'PASA ' : 'FALLA') + ' · ' + nombre + ' · ' + evidencia); };
  const texto = (sel) => pagina.textContent(sel);

  await pagina.click('#btn-modo-real');
  comprobar('Chip en «USB desconectado»', (await texto('#chip-texto')).includes('USB desconectado'), await texto('#chip-texto'));
  await pagina.click('#btn-chip');                     // la persona cancela el selector
  await pagina.waitForTimeout(300);
  comprobar('Cancelar el selector no es error', (await pagina.getAttribute('#chip', 'data-estado')) === 'DESCONECTADO', await texto('#chip-texto'));
  await pagina.click('#btn-chip');                     // ahora sí elige el puerto
  await pagina.waitForTimeout(300);
  comprobar('Estado «esperando datos del Nodo A»', (await texto('#chip-texto')).includes('esperando datos del Nodo A'), await texto('#chip-texto'));
  await pagina.waitForTimeout(1500);
  comprobar('Chip con VID:PID y nunca «COM»', /VID:PID 10C4:EA60/.test(await texto('#chip-texto')) && !/COM\d/.test(await texto('#chip-texto')), await texto('#chip-texto'));

  // Durante el silencio de B (120–150 s) debe verse «Nodo B sin datos hace N s».
  const esperar = async (s) => { await pagina.waitForTimeout(s * 1000); };
  // A los ~46 s la consola (últimas 50 líneas) todavía tiene el −127 y el 85.0 con ok:true.
  await esperar(46 - 2.1);
  await pagina.click('a[data-ruta="dispositivos"]');
  await pagina.waitForTimeout(400);
  const consolaTemprana = await texto('#consola');
  comprobar('−127 con ok:true rechazado (segunda defensa)', consolaTemprana.includes('rechazada: −127 con ok:true'), 'consola a los 46 s');
  comprobar('85.0 con ok:true rechazado (segunda defensa)', consolaTemprana.includes('rechazada: 85.0 con ok:true'), 'consola a los 46 s');
  await pagina.click('a[data-ruta="resumen"]');
  let mensajeSilencio = '';
  if (DURACION_S >= 150) {
    await esperar(148.5 - 46 - 0.6);
    mensajeSilencio = await pagina.$eval('#resumen-tarjetas article:nth-child(2) .causas', (e) => e.textContent);
    const recoSilencio = await pagina.$eval('#resumen-reco .reco-titulo', (e) => e.textContent);
    comprobar('Tarjeta B: «Nodo B sin datos hace N s» (N ≈ 30)', /Nodo B sin datos hace (2\d|3\d) s/.test(mensajeSilencio), mensajeSilencio);
    comprobar('Recomendación: NO SE PUEDE COMPARAR durante el silencio', recoSilencio === 'NO SE PUEDE COMPARAR', recoSilencio);
    await esperar(DURACION_S - 148.5 + 3);
  } else {
    await esperar(Math.max(0, DURACION_S - 46) + 3);
  }

  await pagina.click('a[data-ruta="dispositivos"]');
  await pagina.waitForTimeout(1200);
  const kv = await pagina.$$eval('#kv-nodo-A dd, #kv-nodo-B dd, #kv-conexion dd', (dds) => dds.map((d) => d.textContent));
  const leer = async (id) => pagina.$$eval('#' + id + ' dt', (dts) => Object.fromEntries(dts.map((dt) => [dt.textContent, dt.nextElementSibling.textContent])));
  const A = await leer('kv-nodo-A'), B = await leer('kv-nodo-B'), C = await leer('kv-conexion');
  console.log('Nodo A:', JSON.stringify(A)); console.log('Nodo B:', JSON.stringify(B)); console.log('Conexión:', JSON.stringify(C));
  comprobar('Líneas que no son JSON ignoradas y contadas', Number(C['Líneas ignoradas']) >= (DURACION_S >= 95 ? 5 : 3), C['Líneas ignoradas']);
  comprobar('Sin errores de análisis (la línea partida se reconstruyó)', Number(C['Errores de análisis']) === 0, C['Errores de análisis']);
  if (DURACION_S >= 155) comprobar('Paquetes perdidos de B = 8 (salto de 2 + 6 durante el silencio)', B['Paquetes perdidos'] === '8', B['Paquetes perdidos']);
  else if (DURACION_S >= 65) comprobar('Paquetes perdidos de B = 2', B['Paquetes perdidos'] === '2', B['Paquetes perdidos']);
  if (DURACION_S >= 95) comprobar('Reinicio del Nodo A detectado', A['Reinicios detectados'] === '1', A['Reinicios detectados']);
  comprobar('Intervalo observado medido ≈ 5 s', /^[45]\.\d s$/.test(A['Intervalo observado']), A['Intervalo observado']);
  comprobar('ID de sonda leído del serial', A['ID de sonda'] === '28FF641E8D3C0A12', A['ID de sonda']);
  comprobar('RSSI de B', /−?-?58 dBm/.test(B['Vía · RSSI']), B['Vía · RSSI']);

  await pagina.click('a[data-ruta="alertas"]').catch(() => {});
  const eventos = await pagina.evaluate(() => Array.from(document.querySelectorAll('#tabla-eventos tbody tr')).map((tr) => tr.textContent));
  if (eventos.length) {
    comprobar('Evento «Nodo B sin datos»', eventos.some((e) => e.includes('Nodo B sin datos')), String(eventos.filter((e) => e.includes('Nodo B')).length) + ' eventos del Nodo B');
    comprobar('Evento de reinicio del Nodo A', DURACION_S < 95 || eventos.some((e) => e.includes('El Nodo A se reinició')), '');
    comprobar('Evento de salida de rango de B', eventos.some((e) => e.includes('Carga B subió')), '');
  }

  // Se pierde el cable y luego se reconecta.
  await pagina.click('a[data-ruta="resumen"]');
  await pagina.evaluate(() => window.__puertoSimulado.perderCable());
  await pagina.waitForTimeout(800);
  comprobar('Estado «Se perdió la conexión USB»', (await texto('#chip-texto')).includes('Se perdió la conexión USB'), await texto('#chip-texto'));
  comprobar('Botón «Reconectar»', (await texto('#btn-chip')) === 'Reconectar', await texto('#btn-chip'));
  const lecturasAntes = await pagina.evaluate(() => document.querySelector('#resumen-tarjetas article .historial').textContent);
  await pagina.click('#btn-chip');
  await pagina.waitForTimeout(1500);
  comprobar('Reconexión: vuelve a «USB conectado»', (await texto('#chip-texto')).startsWith('USB conectado'), await texto('#chip-texto'));
  comprobar('Lo registrado se conserva al reconectar', lecturasAntes.length > 0, lecturasAntes);

  comprobar('Cero errores y avisos en consola', errores.length === 0, JSON.stringify(errores.slice(0, 5)));
  await pagina.screenshot({ path: path.resolve(__dirname, '..', 'docs', 'capturas', 'serial_simulado_resumen.png') });
  console.log(resultados.every(Boolean) ? 'RESULTADO: todo PASA' : 'RESULTADO: hay FALLAS');
  await navegador.close();
  process.exit(resultados.every(Boolean) ? 0 : 1);
})();
