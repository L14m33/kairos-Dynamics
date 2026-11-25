# Protocolo serial KAIROS v1 (contrato firmware ↔ página)

Fuente: `PROMPT_KAIROS.md`, sección 3. Si este documento y el prompt no coinciden, manda el prompt.

## 1. Transporte

- USB del Nodo A a la laptop, **115200 baudios**, 8N1.
- **NDJSON**: un objeto JSON por línea, UTF-8, terminado en `\n`. La página tolera `\r\n`.
- Máximo **240 bytes** por línea (el firmware arma la línea en un búfer fijo de 256).
- Campo `v` = versión del protocolo. Hoy vale `1`.
- **Solo `reading` es indispensable.** Si `hello` o `status` no llegan, la página funciona igual.

## 2. Mensajes

| Tipo | Lo emite | Cuándo | Campos |
| --- | --- | --- | --- |
| `hello` | Nodo A | Al arrancar | `v`, `type`, `node`, `fw`, `board`, `sensors` |
| `reading` | Nodo A (su sonda y la de B retransmitida) | Cada `INTERVALO_S` (5 s) | `v`, `type`, `node`, `sensor`, `t_c`, `ok`, `err`, `seq`, `up_ms`, `via`, `rssi` |
| `status` | Nodo A | Cada 10 s (desde la Etapa 3) | `v`, `type`, `node`, `peer`, `peer_age_ms` |

### Campos de `reading`

| Campo | Tipo | Regla |
| --- | --- | --- |
| `node` | `"A"` o `"B"` | Nodo que midió. |
| `sensor` | 16 hex en mayúsculas o `null` | Dirección ROM de 64 bits del DS18B20; `null` si no hay sonda. |
| `t_c` | número con 2 decimales o `null` | `null` siempre que `ok` sea `false`. |
| `ok` | booleano | `true` si la lectura es válida. |
| `err` | texto | Solo si `ok` es `false`: `"disconnected"` (−127), `"power_on_85"` (85.0 exacto) o `"no_sensor"`. |
| `seq` | entero | Contador por nodo; sube 1 en cada lectura, válida o no. Un salto = paquetes perdidos. |
| `up_ms` | entero | ms desde el arranque del nodo que midió. Solo sirve para detectar reinicios. |
| `via` | `"local"` o `"espnow"` | Cómo llegó la lectura al Nodo A. |
| `rssi` | entero, opcional | Solo con `via` = `"espnow"`, si el núcleo lo entrega. |

`status.peer_age_ms`: ms desde el último paquete de B recibido por A.

## 3. Ocho líneas de ejemplo, con fallas

**Todas son inventadas.** Los identificadores de sonda no corresponden a sondas reales.

```text
ets Jun  8 2016 00:22:57  rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
{"v":1,"type":"hello","node":"A","fw":"kairos-A-1.0","board":"ESP32-D","sensors":1}
{"v":1,"type":"reading","node":"A","sensor":"28FF641E8D3C0A12","t_c":3.81,"ok":true,"seq":412,"up_ms":2058211,"via":"local"}
{"v":1,"type":"reading","node":"B","sensor":"28AA7B3C1D0E2F44","t_c":24.50,"ok":true,"seq":405,"up_ms":2051877,"via":"espnow","rssi":-58}
{"v":1,"type":"reading","node":"B","sensor":null,"t_c":null,"ok":false,"err":"no_sensor","seq":408,"up_ms":2066877,"via":"espnow","rssi":-60}
{"v":1,"type":"reading","node":"A","sensor":"28FF641E8D3C0A12","t_c":-127.00,"ok":true,"seq":413,"up_ms":2063211,"via":"local"}
{"v":1,"type":"reading","node":"A","sensor":"28FF641E8D3C0A12","t_c":4.06,"ok":true,"seq":1,"up_ms":812,"via":"local"}
{"v":1,"type":"status","node":"A","peer":"B","peer_age_ms":31200}
```

| # | Qué es | Qué hace la página |
| --- | --- | --- |
| 1 | Texto de arranque del ESP32 (no es JSON) | Lo ignora sin error, suma 1 a «líneas ignoradas» y lo guarda en la consola de diagnóstico. |
| 2 | `hello` | Muestra firmware, placa y número de sondas en Dispositivos. |
| 3 | Lectura válida de A | Integra el tramo anterior en el modelo Q10 y actualiza la tarjeta A. |
| 4 | Lectura válida de B por ESP-NOW | Igual que 3, para B; muestra el RSSI. |
| 5 | Falla de sonda B, con `seq` 405 → 408 | No integra. Cuenta 2 paquetes perdidos (406 y 407). Registra «falla de sonda B». |
| 6 | −127 con `ok:true` (firmware defectuoso) | **Segunda defensa**: lo rechaza como si `ok` fuera `false`. No cambia el porcentaje. |
| 7 | `up_ms` y `seq` bajan (812 < 2063211) | Marca **reinicio del Nodo A** y reinicia la cuenta de `seq` sin contarlo como pérdida. |
| 8 | `status` con B callado 31 s | Refuerza «Nodo B sin datos». El estado se decide por el intervalo observado (regla 8), no solo por este mensaje. |

## 4. Reglas del analizador de la página

1. Acumula bytes hasta `\n`; quita un `\r` final. Si una línea pasa de **4 KB** sin salto, descarta lo acumulado y lo cuenta como error de análisis.
2. `JSON.parse` dentro de `try/catch`. Una línea que no es JSON se **ignora**, se cuenta y se guarda en la consola (últimas 50 líneas crudas).
3. `type` desconocido: se ignora y se cuenta. Campos desconocidos: se ignoran (el protocolo puede crecer).
4. Validación: `node` ∈ {A, B}; `t_c` número finito. Se **rechazan −127 y 85.0 aunque llegue `ok:true`**. Fuera de −10 a +85 °C (rango de exactitud nominal del DS18B20, informe p. 8–9): se acepta, pero se avisa en diagnóstico.
5. **La marca de tiempo la pone la laptop** al recibir la línea (`Date.now()` para el registro; `performance.now()` para medir intervalos). El ESP32 no tiene reloj.
6. Reinicio de un nodo: `up_ms` o `seq` bajan respecto de la lectura anterior del mismo nodo.
7. Paquetes perdidos por nodo = suma de los saltos de `seq` mayores que 1 (sin contar reinicios).
8. Intervalo observado por nodo = **mediana de las últimas 10 diferencias** entre lecturas. Un nodo queda «sin datos» cuando pasan **3 intervalos observados** sin lectura, con un **mínimo de 10 s**.
9. Laguna: si entre dos lecturas válidas pasan más de 3 intervalos observados, ese tramo **no se integra** y se suma a «Datos faltantes». Nunca se rellena con una temperatura inventada.
10. Todo dato serial es no confiable: se muestra con `textContent`, nunca como HTML.

## 5. Compatibilidad

- Un cambio que solo **agrega** campos o tipos no cambia `v`.
- Un cambio que quita o cambia el significado de un campo sube `v` a 2; la página mostrará «versión de protocolo no soportada» en Dispositivos y no usará esas líneas.
- El sketch `etapa1_nodo_A_json` solo emite `hello` y `reading` con `via:"local"`. `status` y `via:"espnow"` llegan con `nodo_A` (Etapa 3).
