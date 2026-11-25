// Rendimiento (sección 11, criterio 13): 10 minutos de demostración a 1 h = 1 s.
// El escenario se reinicia cada vez que termina, para que la simulación no se
// quede en pausa. Mide nodos del DOM, memoria y CPU en reposo.
// Uso: node tests/rendimiento.js            (≈ 11 minutos)
//      MINUTOS=2 node tests/rendimiento.js  (versión corta)
const path = require('path');
const { chromium } = require('playwright');
const MINUTOS = Number(process.env.MINUTOS || 10);

(async () => {
  const url = 'file://' + path.resolve(__dirname, '..', 'kairos_dashboard.html');
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1366, height: 768 } });
  const errores = [];
  pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push(e.message));
  const cdp = await pagina.context().newCDPSession(pagina);
  await cdp.send('Performance.enable');
  await pagina.goto(url + '#/dashboard');
  await pagina.click('.velocidad button[data-velocidad="1"]');

  const nodos = async () => pagina.evaluate(() => document.getElementsByTagName('*').length);
  const metricas = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  // Repite escenarios y abre o cierra la hielera, como haría el jurado.
  const jugar = async (i) => {
    const t = await pagina.textContent('#btn-reproducir');
    if (t.includes('Repetir')) {
      await pagina.selectOption('#sel-escenario', i % 2 ? '2' : '1');
      await pagina.click('.velocidad button[data-velocidad="1"]');
    }
    if (i % 3 === 0) await pagina.click('#btn-hielera');
  };

  await pagina.waitForTimeout(60000);
  const nodosInicio = await nodos();
  const m0 = await metricas();
  const muestras = [];
  for (let minuto = 1; minuto < MINUTOS; minuto += 1) {
    for (let k = 0; k < 6; k += 1) { await jugar(minuto * 6 + k); await pagina.waitForTimeout(10000); }
    muestras.push(await nodos());
  }
  const nodosFin = await nodos();
  const m1 = await metricas();
  const variacion = Math.abs(nodosFin - nodosInicio) / nodosInicio * 100;
  const maxVar = Math.max(...muestras.map((n) => Math.abs(n - nodosInicio) / nodosInicio * 100), 0);
  console.log('Nodos DOM: minuto 1 = ' + nodosInicio + ', minuto ' + MINUTOS + ' = ' + nodosFin + ' (variación ' + variacion.toFixed(2) + ' %, máxima ' + maxVar.toFixed(2) + ' %)');
  console.log('Serie por minuto: ' + muestras.join(', '));
  console.log('Memoria JS: ' + (m0.JSHeapUsedSize / 1048576).toFixed(1) + ' MB → ' + (m1.JSHeapUsedSize / 1048576).toFixed(1) + ' MB');
  console.log('Tiempo de CPU en scripts durante la corrida: ' + ((m1.ScriptDuration - m0.ScriptDuration) / ((MINUTOS - 1) * 60) * 100).toFixed(2) + ' % del tiempo');

  // CPU en reposo: simulación en pausa durante 30 s.
  if (!(await pagina.textContent('#btn-reproducir')).includes('Repetir') && (await pagina.textContent('#btn-reproducir')).includes('Pausar')) await pagina.click('#btn-reproducir');
  const r0 = await metricas();
  await pagina.waitForTimeout(30000);
  const r1 = await metricas();
  const reposo = (r1.ScriptDuration + r1.LayoutDuration + r1.RecalcStyleDuration - r0.ScriptDuration - r0.LayoutDuration - r0.RecalcStyleDuration) / 30 * 100;
  console.log('CPU en reposo (script + estilo + maquetación): ' + reposo.toFixed(2) + ' % de un núcleo');
  const ok = variacion < 5 && maxVar < 5 && errores.length === 0;
  console.log((variacion < 5 && maxVar < 5 ? 'PASA ' : 'FALLA') + ' · DOM estable (±5 %)');
  console.log((errores.length === 0 ? 'PASA ' : 'FALLA') + ' · Sin errores en consola ' + JSON.stringify(errores.slice(0, 3)));
  await navegador.close();
  process.exit(ok ? 0 : 1);
})();
