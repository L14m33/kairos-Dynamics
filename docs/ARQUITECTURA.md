# Arquitectura · KAIROS DYNAMICS

Estado: **Etapa 3 terminada** (demostración, USB, reproducción de archivo y Dispositivos). Las vistas restantes llegan en la Etapa 4.

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
| Un solo HTML con `<script>` clásico y gráfica en SVG propio | Vite/React/Recharts, Chart.js | Un módulo externo se bloquea por CORS en `file://` (prompt §2); cero red y < 300 KB. |
| Web Serial | Servidor local, página servida por la placa | Nada que instalar en la laptop; la página de la placa queda de respaldo. |
| NDJSON | CSV, binario | Se lee en el Monitor Serie y admite campos nuevos sin romper la página. |
| ESP-NOW entre placas | Wi-Fi con router, Bluetooth | En el evento no hay internet ni router. |
| Δt con la temperatura de la lectura anterior | Promedio de extremos | Regla del prompt (§4); el pseudocódigo del informe (p. 24–25) no fija qué T usar. |
| Laguna y «sin datos» con el mismo umbral: máx(3 × mediana de las últimas 10 diferencias, 10 s); para el primer tramo, sin diferencias medidas, 30 s (en demostración, 15 min simulados) | `INTERVALO_S` fijo | La página mide el intervalo de B en lugar de suponerlo; así solo el primer tramo depende de un valor fijo. |
| Tiempo simulado = tiempo real × velocidad; muestras en rejilla de 5 min simulados con `mulberry32` y semilla fija | Contar ticks; una muestra por cuadro | Determinista y sin distorsión si Chrome frena la pestaña. |
| Escenario 1 termina a las 12 h simuladas y se pausa (el hero lo repite) | Correr sin fin | B se agota a las ≈ 8.1 h; quedan 4 h con «VIDA ÚTIL ESTIMADA AGOTADA». |
| Resumen dimensionado para 1366 × 633 px visibles | Solo 1366 × 768 | Es lo que deja Chrome con la barra de tareas; con F11 sobra espacio. |
| Porcentaje con un decimal (78.3 %) | Entero | Se ve el descenso y coincide con el 78.33 % del informe (p. 18). |
| La carga elegida se subraya con el color de su nivel | Texto naranja | El color se reserva para el estado; el naranja es de marca. |
| Mensajes con `v` ≠ 1: se ignoran y se avisa | Intentar leerlos | No interpretar mal un firmware futuro. |
| Raíz del repositorio = carpeta `kairos/` del prompt; un commit por hito | Subcarpeta y `respaldo/` | Ya es un repositorio git. |
| Reproducción de archivo: el tiempo sale de `up_ms` de cada nodo; un monitor aparte, rotulado «Reproducción de archivo», que no se guarda | Hora de la laptop al leer el archivo | La captura no trae la hora de recepción; `up_ms` es el reloj del nodo que midió. Así lo grabado nunca parece una lectura en vivo. |
| El Nodo B no registra la función de «envío terminado» de ESP-NOW | Usarla para contar fallas de envío | Su firma cambió en ESP-IDF 5.5 (núcleo 3.3); las pérdidas ya se ven con `seq`. |
| Límites editables entre −10 y 40 °C | — | El prompt dice «∂10»: errata de −10. |

## 5. Partes generadas por Claude

Para declararlo si el jurado lo pide. La convocatoria no tiene reglas sobre uso de IA; su regla de plagio (p. 30) se aplica al informe.

- **Etapa 1, generado por Claude (asistente de programación de Anthropic) a partir de `PROMPT_KAIROS.md` escrito por el equipo:** este documento, `PROTOCOLO.md`, `PENDIENTES.md`, `PRUEBAS.md`, `wireframes.html`, sus capturas y `tests/capturar_wireframes.js`, `firmware/00_mac_address` y `firmware/etapa1_nodo_A_json` (este último adapta el sketch original del equipo, que no se modificó).
- **Etapa 2, generado por Claude:** `kairos_dashboard.html` (tokens, rutas, Resumen, simulador con los dos escenarios y sus controles, modelo Q10, niveles, recomendación, analizador NDJSON, detector de eventos, gráfica SVG y `#/autotest`).
- **Etapa 3, generado por Claude:** transportes Web Serial y archivo, estados de conexión, vista Dispositivos, `firmware/nodo_A`, `firmware/nodo_B`, `tests/serial_simulado.js`, `tests/generar_captura.js`, `tests/captura_ejemplo.jsonl` (inventada) y `tests/firmware_simulado/`.
- **Del equipo:** el planteamiento, el informe, el montaje, `KAIROS_Etapa1_LecturaSonda.ino` y todas las decisiones de alcance del prompt.
- Las etapas siguientes se irán anotando aquí. Se recomienda que el equipo lea y pueda explicar cada función antes del viernes.
