# Pruebas

## Parte 1 · Pruebas sin hardware (ejecutadas por Claude, 2026-11-25)

Herramientas: Chromium sin interfaz con Playwright 1.63 (sin instalar nada global), Node 22, g++ 13. Resultados detallados en el informe final de la conversación; aquí, el resumen.

| # (sección 11) | Prueba | Comando o evidencia | Resultado |
| --- | --- | --- | --- |
| 1 | Sin red y consola limpia | `node tests/verificacion.js`: solo se pide `kairos_dashboard.html`; 0 errores y 0 avisos | PASA |
| 2 | Autopruebas V1–V13 | `#/autotest`: 21 de 21 en PASS (V1–V13 y 8 extra) | PASA |
| 3 | Escenario 2 a 1 h = 1 s | A 78.4 %, B 88.3 %, «Entregar primero: Carga A» | PASA |
| 4 | Escenario 1 | Inicia en 78 % y 28 %; B llega a «VIDA ÚTIL ESTIMADA AGOTADA» | PASA |
| 5 | Falla de sonda B | SIN LECTURA y NO SE PUEDE COMPARAR; al reconectar, «Datos faltantes 50 min · estimación incompleta» | PASA |
| 6 | `navigator.serial` simulado, 3 min | `node tests/serial_simulado.js`: 23 de 23. Ignora 5 líneas no JSON, reconstruye la línea partida, rechaza −127 y 85.0 con `ok:true`, cuenta 8 paquetes perdidos de B (salto de 2 + 6 durante el silencio), detecta el reinicio de A, muestra «Nodo B sin datos hace 31 s», y maneja la pérdida y reconexión del cable sin errores | PASA |
| 7 | Reproducción de archivo `.jsonl` | `tests/captura_ejemplo.jsonl` (inventada): mismo analizador, intervalo de 5 s, reinicio detectado y 5 líneas ignoradas | PASA (prueba manual con Playwright) |
| 8 | Persistencia | `node tests/persistencia_csv.js`: reales sí, simulados no; borrar funciona; sin `localStorage` avisa y sigue | PASA |
| 9 | CSV | BOM, `origen` en todas las filas, filas = muestras (13 = 13), ISO 8601 con zona | PASA (Excel no se probó: no hay Excel en el entorno) |
| 10 | Pantallas | 5 tamaños × 8 rutas sin desplazamiento horizontal; a 1366×768 y 1366×633 la recomendación termina en 605 px | PASA |
| 11 | Accesibilidad | 106 elementos recorridos con Tab, todos con foco de 2 px; contraste real de 816 textos ≥ 4.5:1 (≥ 3:1 en grande), con fondos semitransparentes y degradados compuestos | PASA (después de corregir el «°C» de la miniatura) |
| 12 | Honestidad del texto | Sin palabras prohibidas; «DATOS SIMULADOS», «Estimación en validación» y el aviso de inocuidad presentes | PASA |
| 13 | Rendimiento, 10 min a 1 h = 1 s | `node tests/rendimiento.js`: DOM 1715 → 1715 nodos (0.00 %), memoria JS 2.6 → 3.1 MB, scripts al 1.28 % del tiempo, CPU en pausa 0.44 % de un núcleo. Repetida 3 min sobre el archivo final: igual (0.00 %, 0.46 %) | PASA |
| 14 | Rutas | 8 rutas, Atrás y ruta desconocida hacia el Resumen | PASA |
| — | Firmware contra cabeceras simuladas | `bash tests/firmware_simulado/compilar.sh`: 6 compilaciones con `-Werror` y JSON válido | PASA (no sustituye compilar con el núcleo ESP32) |

**Advertencia:** ninguna prueba con `navigator.serial` simulado demuestra que funcione con la placa real.

## Parte 2 · Pruebas con hardware (las ejecuta el equipo)

Llenar «Resultado real», «Fecha» y «Quién» al hacer cada prueba. **No inventar resultados**: si no se hizo, se deja vacío.

| # | Prueba | Resultado esperado | Resultado real | Fecha | Quién |
| --- | --- | --- | --- | --- | --- |
| 0 | Compilar los cuatro sketches en Arduino IDE («ESP32 Dev Module») | Compilan sin errores. Anotar la versión del núcleo ESP32, de OneWire y de DallasTemperature | | | |
| 0b | Cargar `firmware/00_mac_address` en la placa A | Se imprime la MAC cada 3 s; copiarla aquí: `__:__:__:__:__:__` | | | |
| 0c | Cargar `firmware/etapa1_nodo_A_json` y abrir el Monitor Serie a 115200 | Una línea `hello` y luego una `reading` cada 5 s con `"ok":true` | | | |
| 1 | En la laptop de la escuela, con Chrome o Edge: conectar la placa A | El puerto aparece en el selector y llegan líneas JSON. Anotar VID:PID y versión del navegador (`chrome://version`) | | | |
| 2 | Nodo B encendido con su power bank | Llegan lecturas con `"via":"espnow"` | | | |
| 3 | Calentar la sonda B con la mano durante 1 minuto | Sube la temperatura de B y cambia la recomendación | | | |
| 4 | Desconectar la sonda B | La tarjeta B pasa a SIN LECTURA y la recomendación a NO SE PUEDE COMPARAR | | | |
| 5 | Funcionamiento continuo durante 30 minutos | Anotar paquetes perdidos, lagunas y estado de la conexión al final | | | |
| 6 | Cerrar y reabrir la página; reconectar | Los datos reales se conservan y los simulados no | | | |
| 7 | Descargar el CSV de muestras y abrirlo en Excel | Acentos correctos y columna `origen` en todas las filas | | | |
| 8 | Imprimir el resumen por carga (Reportes) | Sale una hoja con las dos cargas, la recomendación y el aviso | | | |
