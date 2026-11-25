# Arquitectura · KAIROS DYNAMICS

Estado: **Etapa 5 terminada** (versión 1.0). Verificación en `docs/PRUEBAS.md`.

## 1. Flujo de datos

```text
Sonda DS18B20 (B) ─GPIO4─ Placa B (ESP-32D) ~~ ESP-NOW, canal 1, sin Wi-Fi ni internet ~~┐
                                                                                         v
Sonda DS18B20 (A) ─GPIO4─ Placa A (ESP-32D) ── USB 115200, NDJSON ──> Chrome/Edge: kairos_dashboard.html (file://)
                                                                        │
  Transporte ─> Analizador NDJSON ─> Estado por nodo ─> Modelo Q10 ─> Niveles ─> Eventos ─> Vistas
     (demo | Web Serial | archivo)                                                 │
                                                       localStorage (solo reales) ─┴─> CSV / JSON
```

- La hora de cada lectura la pone la laptop al recibirla; el ESP32 no tiene reloj.
- La demostración no pasa por el analizador serial: genera lecturas ya validadas, pero usa **las mismas** funciones de modelo, niveles y eventos. Los datos simulados nunca se guardan ni se mezclan con los reales.

## 2. Módulos del archivo (en este orden)

| # | Sección | Responsabilidad |
| --- | --- | --- |
| 1 | `CONFIG` | Umbrales, textos, nombres de lote, modelo de placa, número de registro (vacío = no se muestra). |
| 2 | Modelo Q10 *(pura)* | `factorQ10`, `integrarTramo`, `saldoHoras`, `vidaUtilPct`. |
| 3 | Estado y niveles *(pura)* | Nivel por vida y por temperatura, peor nivel, recomendación de entrega. |
| 4 | Transportes | Interfaz común `start()`, `stop()`, `onLine(cb)`: demostración, Web Serial y archivo. |
| 5 | Analizador NDJSON *(pura)* | Bytes → líneas → mensajes validados y contadores (`PROTOCOLO.md`). |
| 6 | Detector de eventos | Una entrada por transición, con histéresis de 2 lecturas. |
| 7 | Almacenamiento y exportación | `localStorage` (`kairos.v1.`), CSV con BOM, JSON de metadatos. |
| 8 | Interfaz | Rutas por hash, vistas, componentes, modo presentación. |
| 9 | Gráfica SVG | Series A/B, banda de rango, marcadores, cursor, diezmado a 600 puntos. |
| 10 | Autopruebas | `#/autotest`: V1–V13 en pantalla, PASS/FAIL. |

`window.KAIROS` expondrá solo las funciones puras (2, 3 y 5) para probarlas desde la consola o con Playwright.

## 3. Máquina de estados de la conexión

| Estado | Chip | Sale a |
| --- | --- | --- |
| `DEMO` (siempre al abrir) | Modo demostración · sin hardware | `SIN_WEBSERIAL` o `DESCONECTADO` al elegir SENSORES REALES |
| `SIN_WEBSERIAL` | Este navegador no permite USB. Abra la página en Chrome o Edge | `DEMO`; demostración y archivo siguen disponibles |
| `DESCONECTADO` | USB desconectado · [Conectar por USB] | `CONECTANDO` |
| `CONECTANDO` (selector abierto) | Conectando… | `ESPERANDO` si se abre; `DESCONECTADO` si la persona cancela (no es error) o falla (se registra) |
| `ESPERANDO` | USB conectado · esperando datos del Nodo A | `CONECTADO` con el primer mensaje válido; a los 10 s sin datos sugiere revisar firmware y 115200 baudios |
| `CONECTADO` | USB conectado · VID:PID de `getInfo()` | `PERDIDA` si falla la lectura o llega `disconnect` |
| `PERDIDA` | Se perdió la conexión USB · [Reconectar] | `CONECTANDO`; lo registrado se conserva |

`[S]` Si al cargar `getPorts()` encuentra un puerto ya autorizado, solo se ofrece «Reconectar»; nunca cambia de modo por su cuenta.

## 4. Decisiones tomadas

| Decisión | Descartado | Por qué |
| --- | --- | --- |
| Un solo HTML, `<script>` clásico, gráfica SVG propia | Vite/React/Recharts, Chart.js | Un módulo externo se bloquea por CORS en `file://`; cero red; < 300 KB. |
| Web Serial + NDJSON | Servidor local; CSV o binario | Nada que instalar; se lee en el Monitor Serie; admite campos nuevos. |
| ESP-NOW entre placas; B no registra el «envío terminado» | Wi-Fi con router; usar esa función | No hay router en el evento; su firma cambió en ESP-IDF 5.5 y `seq` ya muestra pérdidas. |
| Δt con la T de la lectura anterior | Promedio de extremos | Regla del prompt (§4); el informe (p. 24–25) no fija qué T usar. |
| Laguna y «sin datos» con un umbral: máx(3 × mediana de 10 diferencias, 10 s); primer tramo: 30 s (demo: 15 min simulados) | `INTERVALO_S` fijo | El intervalo de B se mide, no se supone. |
| Tiempo simulado = tiempo real × velocidad; rejilla de 5 min simulados; `mulberry32` con semilla fija | Contar ticks | Determinista aunque Chrome frene la pestaña. |
| Escenario 1 dura 12 h simuladas | Sin fin | B se agota a ≈ 8.1 h y se ve «AGOTADA». |
| Resumen para 1366 × 633 px; porcentaje con un decimal; carga elegida subrayada con el color de su nivel | Solo 768 px; entero; naranja | Chrome + barra de tareas dejan ~630 px; 78.3 % como el informe; el color es del estado. |
| Reproducción de archivo: tiempo desde `up_ms`, monitor aparte, `origen` = `archivo`, no se guarda | Hora de la laptop; rotularlo real | Lo grabado nunca debe parecer una lectura en vivo. |
| Límites y parámetros por monitor; los de la demo vuelven a `CONFIG` al abrir; un cambio de límite reevalúa la última lectura | Guardarlos siempre | La demo del viernes debe dar las cifras del informe; efecto inmediato en avisos. |
| Persistencia en `kairos.v1.real`; el tiempo con la página cerrada cuenta como datos faltantes | Varias claves | Un `setItem` en `try/catch`; si no cabe, 1,000 muestras por nodo. |
| `v` ≠ 1 se ignora; límites entre −10 y 40 °C («∂10» es errata); raíz del repo = `kairos/`, un commit por hito | — | Simplicidad. |

## 5. Partes generadas por Claude

Para declararlo si el jurado lo pide (la convocatoria no regula el uso de IA; su regla de plagio, p. 30, se aplica al informe). Todo lo siguiente lo generó **Claude (asistente de Anthropic)** a partir de `PROMPT_KAIROS.md`, escrito por el equipo:

- `kairos_dashboard.html` completo (Etapas 2 a 4) y sus correcciones de la Etapa 5.
- `firmware/00_mac_address`, `etapa1_nodo_A_json` (adapta el sketch original del equipo, que no se modificó), `nodo_A` y `nodo_B`.
- `docs/` (este documento, `PROTOCOLO`, `PENDIENTES`, `PRUEBAS`, `MANUAL_USUARIO` en borrador, `wireframes.html`, capturas), `README.md` y todo `tests/` (la captura `.jsonl` es inventada).
- **Del equipo:** el planteamiento, el informe, el montaje, `KAIROS_Etapa1_LecturaSonda.ino` y las decisiones de alcance del prompt. Antes del viernes, cada integrante debe poder explicar las funciones de su parte.
