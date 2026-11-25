// Genera docs/capturas/wireframe_*.png a partir de docs/wireframes.html
// y comprueba que nada se desborde y que la recomendación quede arriba del pliegue.
// Uso: node tests/capturar_wireframes.js   (requiere Playwright con Chromium)
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const raiz = path.resolve(__dirname, '..');
  const url = 'file://' + path.join(raiz, 'docs', 'wireframes.html');
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const peticiones = [];
  const errores = [];
  pagina.on('request', (r) => peticiones.push(r.url()));
  pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push(String(e)));
  await pagina.goto(url);

  const marcos = ['wf-demo', 'wf-usb', 'wf-dispositivos'];
  for (const id of marcos) {
    const medida = await pagina.evaluate((id) => {
      const marco = document.getElementById(id);
      const top = marco.getBoundingClientRect().top;
      const fila = marco.querySelector('.row1');
      const reco = marco.querySelector('.reco');
      const main = marco.querySelector('.main');
      return {
        filaDesborda: fila.scrollWidth > fila.clientWidth,
        mainDesborda: main.scrollWidth > main.clientWidth,
        recoAbajo: reco ? Math.round(reco.getBoundingClientRect().bottom - top) : null,
      };
    }, id);
    console.log(id, JSON.stringify(medida));
    await pagina.locator('#' + id).screenshot({ path: path.join(raiz, 'docs', 'capturas', 'wireframe_' + id.replace('wf-', '') + '.png') });
  }
  console.log('peticiones:', peticiones.length, peticiones.map((u) => u.replace(raiz, '.')));
  console.log('errores/avisos de consola:', errores.length, errores);
  await navegador.close();
})();
