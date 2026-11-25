// Verificación del producto (sección 11 del prompt). Imprime PASA/FALLA con evidencia.
// Cubre: 1 sin red, 2 autopruebas, 3 escenario 2, 4 escenario 1, 5 falla de sonda B,
// 10 pantallas (capturas en docs/capturas), 11 teclado y contraste, 12 honestidad, 14 rutas.
// Los criterios 6–9 y 13 están en serial_simulado.js, persistencia_csv.js y rendimiento.js.
// Uso: node tests/verificacion.js   (≈ 2 minutos)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(RAIZ, 'kairos_dashboard.html');
const CAPTURAS = path.join(RAIZ, 'docs', 'capturas');
const resultados = [];
function comprobar(criterio, nombre, ok, evidencia) {
  resultados.push({ criterio, nombre, ok });
  console.log((ok ? 'PASA ' : 'FALLA') + ' · [' + criterio + '] ' + nombre + (evidencia !== undefined ? ' · ' + evidencia : ''));
}

// ---------- Contraste real de cada texto (se ejecuta dentro de la página) ----------
function medirContraste() {
  function parse(c) {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  function colores(img) { return (img.match(/rgba?\([^)]+\)/g) || []).map(parse); }
  function mezclar(arriba, abajo) {
    const a = arriba[3];
    return [arriba[0] * a + abajo[0] * (1 - a), arriba[1] * a + abajo[1] * (1 - a), arriba[2] * a + abajo[2] * (1 - a), 1];
  }
  function lum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function razon(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function visible(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  // Fondos posibles detrás de un elemento: se componen las capas de abajo hacia arriba.
  function fondos(el) {
    const capas = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      capas.push({ color: parse(s.backgroundColor), grad: s.backgroundImage !== 'none' ? colores(s.backgroundImage) : [], opacidad: Number(s.opacity) });
      if (capas[capas.length - 1].color && capas[capas.length - 1].color[3] === 1) break;
    }
    let cand = [[11, 27, 43, 1]];
    for (let i = capas.length - 1; i >= 0; i -= 1) {
      const c = capas[i];
      if (c.color && c.color[3] > 0) cand = cand.map((b) => mezclar(c.color, b));
      if (c.grad.length) cand = cand.flatMap((b) => c.grad.filter((g) => g).map((g) => mezclar(g, b)));
      if (cand.length > 24) cand = cand.slice(0, 24);
    }
    return cand;
  }
  const fallas = [];
  let medidos = 0;
  const todos = document.querySelectorAll('body *');
  for (const el of todos) {
    const propio = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!propio || !visible(el) || el.closest('[disabled]') || el.closest('.grado') || el.closest('option')) continue;
    const s = getComputedStyle(el);
    const esSvg = el instanceof SVGElement;
    let color = parse(esSvg ? s.fill : s.color);
    if (!color || color[3] === 0) continue;
    let opacidad = 1;
    for (let e = el; e; e = e.parentElement) opacidad *= Number(getComputedStyle(e).opacity);
    const tam = parseFloat(s.fontSize), peso = Number(s.fontWeight) || 400;
    const grande = tam >= 24 || (tam >= 18.66 && peso >= 700);
    const minimo = grande ? 3 : 4.5;
    const cand = fondos(esSvg ? el.ownerSVGElement.parentElement : el);
    const peor = Math.min(...cand.map((b) => razon(mezclar([color[0], color[1], color[2], color[3] * opacidad], b), b)));
    medidos += 1;
    if (peor < minimo) fallas.push({ texto: el.textContent.trim().slice(0, 40), razon: Math.round(peor * 100) / 100, minimo, tam, clase: el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className });
  }
  return { medidos, fallas };
}

(async () => {
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const pagina = await ctx.newPage();
  const peticiones = [], errores = [];
  pagina.on('request', (r) => peticiones.push(r.url()));
  pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push(e.message));

  // ---------- 2. Autopruebas ----------
  await pagina.goto(URL + '#/autotest');
  await pagina.waitForTimeout(600);
  const filas = await pagina.$$eval('#autotest-cuerpo tr', (trs) => trs.map((t) => [t.dataset.id, t.lastElementChild.textContent]));
  const v = filas.filter((f) => /^V\d+$/.test(f[0]));
  comprobar(2, 'Autopruebas V1–V13 en PASS', v.length === 13 && v.every((f) => f[1] === 'PASS'), v.filter((f) => f[1] === 'PASS').length + '/13; extra ' + filas.filter((f) => !/^V/.test(f[0]) && f[1] === 'PASS').length + '/' + filas.filter((f) => !/^V/.test(f[0])).length);

  // ---------- 3. Escenario 2 completo a 1 h = 1 s ----------
  await pagina.goto(URL + '#/dashboard');
  await pagina.selectOption('#sel-escenario', '2');
  await pagina.click('.velocidad button[data-velocidad="1"]');
  await pagina.waitForTimeout(15500);
  const pct = async (i) => parseFloat((await pagina.$eval(`#resumen-tarjetas article:nth-child(${i}) .vida-pct`, (e) => e.textContent)).replace(',', '.'));
  const a2 = await pct(1), b2 = await pct(2);
  const reco2 = await pagina.$eval('#resumen-reco .reco-titulo', (e) => e.textContent);
  comprobar(3, 'Escenario 2: A ≈ 78.33 % y B ≈ 88.33 % (±0.5)', Math.abs(a2 - 78.33) <= 0.5 && Math.abs(b2 - 88.33) <= 0.5, 'A ' + a2 + ' %, B ' + b2 + ' % al ' + (await pagina.textContent('#reloj-sim')));
  comprobar(3, 'Escenario 2: «Entregar primero: Carga A»', reco2 === 'Entregar primero: Carga A', reco2);

  // ---------- 4. Escenario 1 ----------
  await pagina.selectOption('#sel-escenario', '1');
  await pagina.waitForTimeout(150);
  const inicioA = await pagina.$eval('#resumen-tarjetas article:nth-child(1) .origen', (e) => e.textContent);
  const inicioB = await pagina.$eval('#resumen-tarjetas article:nth-child(2) .origen', (e) => e.textContent);
  comprobar(4, 'Escenario 1 arranca en 78 % y 28 % (rotulado como simulado)', /78 %/.test(inicioA) && /28 %/.test(inicioB), inicioA + ' | ' + inicioB);
  await pagina.waitForTimeout(12800);
  const detB = await pagina.$eval('#resumen-tarjetas article:nth-child(2) .vida-detalle', (e) => e.textContent);
  comprobar(4, 'B llega a «VIDA ÚTIL ESTIMADA AGOTADA»', detB.includes('VIDA ÚTIL ESTIMADA AGOTADA'), detB + ' · ' + await pagina.$eval('#resumen-reco .motivo', (e) => e.textContent));
  await pagina.evaluate(() => document.activeElement && document.activeElement.blur());
  await pagina.screenshot({ path: path.join(CAPTURAS, 'resumen_escenario1_agotada_1366x768.png') });

  // ---------- 5. Falla de sonda B ----------
  await pagina.selectOption('#sel-escenario', '2');
  await pagina.click('.velocidad button[data-velocidad="2"]');
  await pagina.waitForTimeout(1500);
  await pagina.click('#btn-falla-b');
  await pagina.waitForTimeout(1500);
  const avisoB = await pagina.$eval('#resumen-tarjetas article:nth-child(2) .aviso-texto', (e) => e.textContent);
  const recoF = await pagina.$eval('#resumen-reco .reco-titulo', (e) => e.textContent);
  comprobar(5, 'Falla de B: SIN LECTURA y NO SE PUEDE COMPARAR', avisoB === 'SIN LECTURA · REVISAR SONDA' && recoF === 'NO SE PUEDE COMPARAR', avisoB + ' · ' + recoF);
  await pagina.evaluate(() => document.activeElement && document.activeElement.blur());
  await pagina.screenshot({ path: path.join(CAPTURAS, 'resumen_falla_sonda_b_1366x768.png') });
  await pagina.click('#btn-falla-b');
  await pagina.waitForTimeout(1200);
  const hist = await pagina.$eval('#resumen-tarjetas article:nth-child(2) .historial', (e) => e.textContent);
  const faltan = /Datos faltantes (\d+) min/.exec(hist);
  comprobar(5, 'Al reconectar, el tramo ausente es laguna (no cero)', faltan && Number(faltan[1]) > 0 && hist.includes('estimación incompleta'), hist);

  // ---------- 11. Contraste en varias vistas y estados ----------
  let totalMedidos = 0;
  const fallasContraste = [];
  for (const ruta of ['#/', '#/dashboard', '#/dashboard/cargas', '#/dashboard/temperatura', '#/dashboard/alertas', '#/dashboard/dispositivos', '#/dashboard/reportes', '#/autotest']) {
    await pagina.goto(URL + ruta);
    await pagina.waitForTimeout(ruta === '#/dashboard' ? 2500 : 900);
    const r = await pagina.evaluate(medirContraste);
    totalMedidos += r.medidos;
    r.fallas.forEach((f) => fallasContraste.push(ruta + ' → ' + JSON.stringify(f)));
  }
  // Estados especiales: sin datos (falla de B) y modo real sin conexión.
  await pagina.goto(URL + '#/dashboard');
  await pagina.waitForTimeout(1000);
  await pagina.click('#btn-falla-b');
  await pagina.waitForTimeout(1500);
  let r = await pagina.evaluate(medirContraste);
  totalMedidos += r.medidos; r.fallas.forEach((f) => fallasContraste.push('falla B → ' + JSON.stringify(f)));
  await pagina.click('#btn-modo-real');
  await pagina.waitForTimeout(500);
  r = await pagina.evaluate(medirContraste);
  totalMedidos += r.medidos; r.fallas.forEach((f) => fallasContraste.push('modo real → ' + JSON.stringify(f)));
  comprobar(11, 'Contraste real ≥ 4.5:1 (≥ 3:1 en texto grande) en cada texto', fallasContraste.length === 0, totalMedidos + ' textos medidos; fallas: ' + (fallasContraste.slice(0, 6).join(' | ') || 'ninguna'));

  // ---------- 11. Recorrido solo con teclado ----------
  await pagina.click('#btn-modo-demo');
  const sinContorno = [];
  let enfocados = 0;
  for (const ruta of ['#/dashboard', '#/dashboard/cargas', '#/dashboard/temperatura', '#/dashboard/alertas', '#/dashboard/dispositivos', '#/dashboard/reportes']) {
    await pagina.goto(URL + ruta);
    await pagina.waitForTimeout(500);
    await pagina.evaluate(() => document.activeElement && document.activeElement.blur());
    const vistos = new Set();
    for (let k = 0; k < 45; k += 1) {
      await pagina.keyboard.press('Tab');
      const info = await pagina.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const s = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        return { id: e.id || e.textContent.trim().slice(0, 24) || e.tagName, contorno: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2, visible: r.width > 0 && r.height > 0 };
      });
      if (!info) continue;
      if (!vistos.has(info.id)) { vistos.add(info.id); enfocados += 1; }
      if (!info.contorno || !info.visible) sinContorno.push(ruta + ': ' + info.id);
    }
  }
  comprobar(11, 'Teclado: foco visible (2 px) en cada elemento de las seis vistas', sinContorno.length === 0, enfocados + ' elementos distintos; sin contorno: ' + ([...new Set(sinContorno)].slice(0, 5).join(', ') || 'ninguno'));
  // Atajos y navegación con Enter en el menú
  await pagina.goto(URL + '#/dashboard');
  await pagina.focus('a[data-ruta="alertas"]');
  await pagina.keyboard.press('Enter');
  await pagina.waitForTimeout(300);
  comprobar(11, 'Menú operable con Enter; el foco pasa al título', (await pagina.evaluate(() => document.activeElement.tagName + ' ' + document.activeElement.textContent)) === 'H1 Alertas y eventos', pagina.url().split('#')[1]);

  // ---------- 14. Rutas, Atrás y ruta desconocida ----------
  const rutas = ['#/', '#/dashboard', '#/dashboard/cargas', '#/dashboard/temperatura', '#/dashboard/alertas', '#/dashboard/dispositivos', '#/dashboard/reportes', '#/autotest'];
  const malas = [];
  for (const ruta of rutas) {
    await pagina.goto(URL + ruta);
    await pagina.waitForTimeout(250);
    const h1 = await pagina.evaluate(() => { const v = Array.from(document.querySelectorAll('h1')).find((h) => h.offsetParent !== null); return v ? v.textContent : ''; });
    if (!h1) malas.push(ruta);
  }
  comprobar(14, 'Cada ruta carga con su título visible', malas.length === 0, rutas.length + ' rutas' + (malas.length ? '; sin título: ' + malas.join(', ') : ''));
  await pagina.goto(URL + '#/dashboard/temperatura');
  await pagina.click('a[data-ruta="reportes"]');
  await pagina.goBack();
  await pagina.waitForTimeout(200);
  comprobar(14, 'El botón Atrás funciona', pagina.url().endsWith('#/dashboard/temperatura') && (await pagina.isVisible('#vista-temperatura')), pagina.url().split('#')[1]);
  await pagina.goto(URL + '#/ruta-que-no-existe');
  await pagina.waitForTimeout(200);
  comprobar(14, 'Ruta desconocida lleva al Resumen, nunca a pantalla en blanco', pagina.url().endsWith('#/dashboard') && (await pagina.isVisible('#vista-resumen')), pagina.url().split('#')[1]);

  // ---------- 12. Honestidad del texto ----------
  const html = fs.readFileSync(path.join(RAIZ, 'kairos_dashboard.html'), 'utf8');
  const prohibidas = [];
  [/certificad[oa]s?/gi, /\bvalidad[oa]s?\b/gi, /\bprecis[oa]s?\b/gi, /inteligencia artificial/gi, /machine learning/gi, /(^|[^A-Za-zÁÉÍÓÚáéíóúÑñ])IA(?=[^A-Za-zÁÉÍÓÚáéíóúÑñ]|$)/g].forEach((re) => {
    (html.match(re) || []).forEach((m) => prohibidas.push(m.trim()));
  });
  const noValidado = (html.match(/no validad[oa]/gi) || []).length;
  comprobar(12, 'Sin «certificado», «validado», «preciso», «inteligencia artificial», «IA» ni «machine learning»', prohibidas.length - noValidado === 0, prohibidas.join(', ') || 'ninguna');
  await pagina.goto(URL + '#/dashboard');
  await pagina.waitForTimeout(800);
  const demoTexto = await pagina.evaluate(() => document.body.innerText);
  comprobar(12, '«DATOS SIMULADOS» visible en demostración', /DATOS SIMULADOS/i.test(demoTexto), '');
  comprobar(12, 'Aviso fijo: no certifica la inocuidad', demoTexto.includes('No certifica la inocuidad ni la calidad del producto.'), '');
  await pagina.click('#btn-modo-real');
  await pagina.waitForTimeout(300);
  const origenReal = await pagina.$eval('#resumen-tarjetas article .origen', (e) => e.textContent);
  comprobar(12, '«Estimación en validación» junto al porcentaje en modo real', origenReal.includes('Estimación en validación'), origenReal);
  await pagina.click('#btn-modo-demo');

  // ---------- 10. Pantallas: capturas y desplazamiento horizontal ----------
  const desbordes = [];
  for (const [w, h] of [[1920, 1080], [1366, 768], [1366, 633], [1024, 768], [390, 844]]) {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('request', (q) => peticiones.push(q.url()));
    await p.setViewportSize({ width: w, height: h });
    for (const ruta of rutas) {
      await p.goto(URL + ruta);
      await p.waitForTimeout(ruta === '#/dashboard' ? 3000 : 400);
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) desbordes.push(w + 'x' + h + ' ' + ruta + ' (' + sw + ')');
      if (ruta === '#/dashboard') await p.screenshot({ path: path.join(CAPTURAS, `resumen_${w}x${h}.png`) });
      if (ruta === '#/' && h !== 633) await p.screenshot({ path: path.join(CAPTURAS, `inicio_${w}x${h}.png`) });
      if (w === 1366 && h === 768 && !['#/', '#/dashboard'].includes(ruta)) await p.screenshot({ path: path.join(CAPTURAS, `vista_${ruta.split('/').pop()}_1366x768.png`), fullPage: true });
    }
    if (w === 1366) {
      await p.goto(URL + '#/dashboard');
      await p.waitForTimeout(1500);
      const fin = await p.$eval('#resumen-reco .reco', (e) => Math.round(e.getBoundingClientRect().bottom));
      const tarjetas = await p.$eval('#resumen-tarjetas', (e) => Math.round(e.getBoundingClientRect().bottom));
      comprobar(10, `A ${w}×${h} se ven las tarjetas y la recomendación sin desplazarse`, fin <= h && tarjetas <= h, 'tarjetas terminan en ' + tarjetas + ' px, recomendación en ' + fin + ' px');
    }
    await p.close();
  }
  comprobar(10, 'Sin desplazamiento horizontal en 5 tamaños × 8 rutas', desbordes.length === 0, desbordes.join(', ') || '40 combinaciones');

  // ---------- 1. Sin red y consola limpia ----------
  const ajenas = [...new Set(peticiones)].filter((u) => !u.startsWith(URL.split('#')[0]) && !u.startsWith('blob:') && !u.startsWith('data:'));
  comprobar(1, 'Cero peticiones de red: solo la propia página', ajenas.length === 0, [...new Set(peticiones.map((u) => u.split('#')[0].split('/').pop()))].join(', '));
  comprobar(1, 'Sin errores ni avisos en consola', errores.length === 0, JSON.stringify(errores.slice(0, 3)));

  await navegador.close();
  const fallas = resultados.filter((x) => !x.ok);
  console.log('\n' + (resultados.length - fallas.length) + ' de ' + resultados.length + ' comprobaciones en PASA.');
  process.exit(fallas.length ? 1 : 0);
})();
