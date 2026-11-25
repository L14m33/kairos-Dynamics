# KAIROS DYNAMICS

Monitor de cadena de frío para fresa: dos sondas DS18B20 en dos cargas, dos placas ESP-32D (B envía a A por ESP-NOW), un modelo Q10 de desgaste acumulado y una recomendación de qué carga entregar primero.

> Prototipo educativo. La estimación de vida útil usa parámetros provisionales (Q10 = 2, Tref = 4 °C, Lref = 120 h) que **no tienen validación experimental**. No certifica la inocuidad ni la calidad del producto. Los datos de demostración son simulados.

XXIX Concurso Nacional de Prototipos y Proyectos de Emprendimiento (DGETI) · CBTis No. 130 · Durango · Etapa local · 27 de noviembre de 2026.

## Cómo abrirlo (3 pasos)

1. Copie la carpeta a la laptop. No necesita internet, servidor ni instalar nada.
2. Haga doble clic en **`kairos_dashboard.html`** y ábralo con **Chrome o Edge** de escritorio. Con Firefox o Safari funciona la demostración, pero no el USB.
3. Presione **Ver Dashboard**. Siempre arranca en **DEMOSTRACIÓN** (datos simulados). Para usar las placas: **SENSORES REALES**, luego **Conectar por USB**, y elija el puerto.

Comprobación rápida en la laptop de la escuela: abra `kairos_dashboard.html#/autotest`. Debe decir **21 de 21 en PASS**.

## Qué hay en la carpeta

```text
kairos_dashboard.html      Lo único que se abre: HTML, CSS y JS en un solo archivo (≈ 210 KB)
README.md
firmware/
  00_mac_address/          Imprime la MAC de la placa A (para nodo_B)
  etapa1_nodo_A_json/      Placa A sola, sin ESP-NOW: emite NDJSON
  nodo_A/                  Placa A: su sonda + lo que llega de B por ESP-NOW
  nodo_B/                  Placa B: mide y envía a A por ESP-NOW
docs/
  ARQUITECTURA.md          Flujo de datos, módulos, estados USB, decisiones y uso de IA
  PROTOCOLO.md             Contrato serial NDJSON y paquete ESP-NOW
  PENDIENTES.md            Contradicciones con el informe, datos faltantes y riesgos
  PRUEBAS.md               Resultados de las pruebas y plantilla de pruebas con hardware
  MANUAL_USUARIO.md        Borrador del manual de usuario (convocatoria p. 28–29)
  wireframes.html          Wireframes de la Etapa 1
  capturas/                Capturas en 1920×1080, 1366×768, 1366×633, 1024×768 y 390×844
tests/                     Pruebas automáticas con Playwright (opcionales)
KAIROS_Etapa1_LecturaSonda.ino, KAIROS_DYNAMICS_INFORME.pdf, CONVOCATORIA.pdf   (originales del equipo)
```

## Firmware

- Arduino IDE, placa **«ESP32 Dev Module»**, librerías **OneWire** y **DallasTemperature**, 115200 baudios. Cada sonda va en **GPIO4** con 4.7 kΩ entre DATA y 3V3.
- Orden de carga:
  1. `00_mac_address` en la placa A. Copie la MAC que imprime.
  2. Pegue esa MAC en `MAC_NODO_A`, dentro de `nodo_B.ino`, y cargue ese sketch en la placa B.
  3. Cargue `nodo_A` en la placa A.
- **Estado: NO COMPILADO con el núcleo ESP32.** El entorno donde se escribió no pudo descargar `arduino-cli`. Los cuatro sketches compilan con g++ contra cabeceras simuladas (`bash tests/firmware_simulado/compilar.sh`), con las firmas reales de `esp_now.h` de ESP-IDF 4.4.7 a 5.5, y en las versiones 2.x y 3.x del núcleo Arduino-ESP32. **Compílelos en Arduino IDE antes del evento.**

## Pruebas

| Prueba | Cómo | Requiere |
| --- | --- | --- |
| Modelo, niveles y analizador (V1–V13 y 8 extra) | Abrir `kairos_dashboard.html#/autotest` | Solo el navegador |
| Verificación general (sección 11 del prompt) | `node tests/verificacion.js` | Node.js y Playwright |
| USB con `navigator.serial` simulado (3 min) | `node tests/serial_simulado.js` | Node.js y Playwright |
| Persistencia, CSV y sin `localStorage` | `node tests/persistencia_csv.js` | Node.js y Playwright |
| Rendimiento (10 min) | `node tests/rendimiento.js` | Node.js y Playwright |
| Firmware contra cabeceras simuladas | `bash tests/firmware_simulado/compilar.sh` | g++ y Python 3 |

**Advertencia:** ninguna prueba con `navigator.serial` simulado demuestra que funcione con la placa real. Las pruebas con hardware están en `docs/PRUEBAS.md` y las hace el equipo.

## API para pruebas: `window.KAIROS`

Solo expone funciones puras, que no tocan la pantalla:

| Grupo | Funciones |
| --- | --- |
| `KAIROS.modelo` | `factorQ10(T, p)`, `integrarTramo(dtH, T, p)`, `saldoHoras(e0H, eH, p)`, `vidaUtilPct(e0H, eH, p)`, `horasHastaAgotar(e0H, eH, T, p)`, `integrarSerie(lecturas, p, opc)`, `esLecturaUtil(l)`, `umbralLagunaH(intervalos, opc)` |
| `KAIROS.niveles` | `nivelPorVida(pct, u)`, `estadoTermico(T, lim)`, `peorNivel(a, b)`, `recomendarEntrega(a, b, empate)` |
| `KAIROS.analizador` | `analizarLinea(texto)`, `crearDivisorLineas(max)` |
| `KAIROS.simulador` | `crearSimulador(escenario, semilla)`, `ESCENARIOS`, `correrEscenarioSinPantalla(id)` |
| `KAIROS.autopruebas()` | Devuelve el resultado de cada vector |

`p` = `{ q10, trefC, lrefH }`. Ejemplo en la consola del navegador:

```js
KAIROS.modelo.vidaUtilPct(0, 26, { q10: 2, trefC: 4, lrefH: 120 })   // 78.33…
```

## Notas

- **Tipografía:** no se incrusta ninguna fuente; se usan las del sistema (Segoe UI en Windows). Sin fuentes remotas.
- **Uso de IA:** el código y los documentos fueron generados por Claude (asistente de Anthropic) a partir del prompt del equipo. Detalle por etapa en `docs/ARQUITECTURA.md`, sección 5.
- **Plan B el día del evento:** si el USB falla, use **DEMOSTRACIÓN** o **Dispositivos → Cargar captura**. Las dos se rotulan como datos no reales.
