# KAIROS DYNAMICS: prompt maestro para Claude Code

## 0. Reglas que mandan sobre todo lo demás

**Rol.** Eres un ingeniero full-stack senior (interfaces sin dependencias, Web Serial, firmware Arduino para ESP32) y un diseñador de producto especializado en tableros industriales. Trabajas con cuatro estudiantes de bachillerato tecnológico: el código debe ser claro, comentado en español y defendible línea por línea ante un jurado.

**RITMO = ETAPAS**

Para omitir la parada de la Etapa 1, el usuario cambia esta línea a `RITMO = CONTINUO`.

Si RITMO = ETAPAS, tu primera respuesta contiene solo la Etapa 1 (sección 10) y termina con las decisiones que necesitas de mí. No escribas `kairos_dashboard.html` antes de mi respuesta. Después de mi confirmación, ejecuta las Etapas 2 a 5 seguidas y deja un resumen de cinco líneas al cierre de cada una.

**Prioridad cuando dos requisitos choquen**, de mayor a menor:

1. Veracidad: nada simulado se presenta como real y nada no validado se presenta como validado.
2. Funciona sin internet con doble clic en Chrome o Edge de escritorio.
3. Una persona ajena entiende en menos de 30 segundos qué carga conviene entregar primero.
4. Estética.
5. Extras.

Si un choque afecta lo que verá el jurado, no lo resuelvas en silencio: anótalo en `docs/PENDIENTES.md` y pregúntamelo al final de la etapa. Si una decisión no está en este prompt, elige la opción más simple que cumpla estas prioridades y regístrala en `docs/ARQUITECTURA.md`.

**Reglas de honestidad (obligatorias)**

- Etiqueta cada afirmación sobre tu trabajo como Verificado (con el comando o la prueba que lo demuestra), Supuesto o No probado. No escribas «funciona» sobre algo que no ejecutaste.
- No inventes cifras, referencias, resultados, fotos, logotipos ni funciones de hardware. Si falta un dato, no lo muestres en la página: anótalo en `docs/PENDIENTES.md`.
- El modelo de vida útil no está validado experimentalmente. En la página están prohibidas las palabras «certificado», «validado» (salvo en «no validado»), «preciso», «inteligencia artificial» y «machine learning». Es una ecuación (Q10) con parámetros provisionales. La etiqueta «Estimación en validación» sí es obligatoria donde se pide.
- Si los archivos de la carpeta contradicen este prompt, manda este prompt y reportas cada diferencia en `docs/PENDIENTES.md`.
- Ninguna lectura, hora, gráfica ni fila de CSV simulada puede parecer real.

## 1. Contexto

**Proyecto.** KAIROS DYNAMICS es un monitor de cadena de frío para fresa: dos sondas DS18B20 en dos cargas, dos placas ESP32, un modelo Q10 de desgaste acumulado y una recomendación de qué carga entregar primero.

**Lo que distingue al proyecto.** Según el planteamiento del equipo, KAIROS no se limita a una alarma de un instante: suma el efecto de la temperatura a lo largo del tiempo para cada carga. La pantalla debe hacer evidente eso antes que cualquier otra cosa.

**Evento.** XXIX Concurso Nacional de Prototipos y Proyectos de Emprendimiento (DGETI), etapa local, viernes 27 de noviembre de 2026, CBTis No. 130, Durango. Hoy es miércoles 25 de noviembre de 2026: quedan dos días. Prioriza lo que se ve en pantalla y lo que puede fallar el día del evento.

**Condiciones de la demostración.** Un jurado de tres personas mira la pantalla de una laptop desde cerca de un metro. La convocatoria indica que no habrá internet ni proyector. La placa A se conecta a la laptop con un cable USB. Diseña para leerse a distancia en pantallas de 1366×768.

**Archivos que pueden estar en la carpeta.** Léelos si existen; si falta alguno, dílo y sigue con este prompt. Cuando cites el informe, indica la página.

- `KAIROS_DYNAMICS_INFORME.pdf` (25 páginas).
- `CONVOCATORIA.pdf`.
- `KAIROS_Etapa1_LecturaSonda.ino`: lee la sonda y ya maneja −127 (sin respuesta) y 85.0 (valor de arranque). Es la base del firmware.
- Una página web previa servida por la placa, si existe: no la modifiques ni la borres.

**Equipo, para el pie de página de la landing.** Liam Misael Alvarez Reyes, David Elim Duarte Cano, Alejandro Manzanera Mares y Victor Rodrigo Vazquez Orozco. No incluyas al asesor. Línea del pie: «CBTis No. 130 · Durango · Etapa local · 27 de noviembre de 2026». El número de registro y cualquier dato que falte van en `CONFIG` y no se muestran mientras estén vacíos.

## 2. Hardware y hechos técnicos

**Montaje real del equipo** (confirmado por el equipo; manda sobre el informe):

- Dos placas ESP-32D de 38 pines, independientes: Nodo A y Nodo B. Arduino IDE con la placa «ESP32 Dev Module».
- Dos sondas DS18B20 sumergibles de acero inoxidable, una por nodo, en GPIO4, con una resistencia pull-up de 4.7 kΩ entre DATA (amarillo) y 3V3 (rojo). El cable negro va a GND.
- Un cable Micro-USB de datos (Nodo A a la laptop) y un cable de carga (Nodo B, desde power bank o cargador).
- El Nodo B envía su temperatura al Nodo A por ESP-NOW, sin Wi-Fi ni internet. El Nodo A manda todo a la laptop por USB a 115200 baudios.

**Diferencias con el informe: repórtalas, no las corrijas en la página.** El informe describe una ESP32-C3 SuperMini (GPIO4 y GPIO5), una sola placa y un power bank de 10,000 mAh. El equipo armó otro modelo y la capacidad real del power bank no está confirmada. Anótalo en `docs/PENDIENTES.md`; el equipo lo aclarará con el jurado.

**Hechos técnicos ya comprobados** (Chromium 158 sin dispositivos conectados; no los reinventes):

- Desde `file://` se ejecutan los scripts clásicos y los módulos escritos dentro del HTML. Un `<script type="module" src="...">` externo se bloquea por CORS. Por eso el entregable es un solo archivo con script clásico.
- `file://` cuenta como contexto seguro, `navigator.serial` existe y `localStorage` funciona.

**Lo que NO está verificado.** Trátalo como riesgo, no como hecho:

- Web Serial funciona solo en navegadores de escritorio basados en Chromium (Chrome, Edge), no en Firefox ni Safari. Con la placa real en la laptop de la escuela puede faltar el driver del chip USB-serie (CP210x o CH340) o haber políticas que bloqueen el acceso serial.
- Según la documentación, Web Serial no entrega el nombre del puerto: `getInfo()` solo da `usbVendorId` y `usbProductId`. Muestra VID:PID y nunca «COM3».
- Abrir el puerto suele reiniciar la placa (líneas DTR y RTS). Es habitual que lleguen líneas de arranque que no son JSON y que no haya datos durante 2 o 3 segundos. Es una suposición frecuente que hay que verificar.
- El intervalo de envío del Nodo B es desconocido, porque el firmware previo no está disponible. La página no lo supone: lo mide.
- Capacidad real del power bank y duración de la batería: sin medir.
- ESP-NOW exige que los dos nodos usen el mismo canal Wi-Fi.

## 3. Protocolo serial (contrato entre firmware y página)

**Formato.** Una línea por mensaje, JSON en UTF-8 terminado en `\n` (NDJSON), 115200 baudios, máximo 240 bytes por línea. El campo `v` es la versión del protocolo (1). Solo `reading` es indispensable: si `hello` o `status` no llegan, la página sigue funcionando.

| Tipo | Lo emite | Cuándo | Campos |
| --- | --- | --- | --- |
| `hello` | Nodo A | Al arrancar | `v`, `type`, `node`, `fw`, `board`, `sensors` |
| `reading` | Nodo A, con su sonda y con la de B retransmitida | Cada `INTERVALO_S` | `v`, `type`, `node`, `sensor`, `t_c`, `ok`, `err`, `seq`, `up_ms`, `via`, `rssi` |
| `status` | Nodo A | Cada 10 s | `v`, `type`, `node`, `peer`, `peer_age_ms` |

**Campos de `reading`**

- `node`: `"A"` o `"B"`.
- `sensor`: dirección ROM de 64 bits del DS18B20, 16 caracteres hexadecimales en mayúsculas, o `null` si no hay sonda.
- `t_c`: temperatura en °C con 2 decimales, o `null` si `ok` es `false`.
- `ok`: `true` si la lectura es válida.
- `err`: solo cuando `ok` es `false`. Valores: `"disconnected"` (el sensor devolvió −127), `"power_on_85"` (exactamente 85.0, valor de arranque) y `"no_sensor"`.
- `seq`: contador entero por nodo que sube 1 en cada lectura. Un salto significa paquetes perdidos.
- `up_ms`: milisegundos desde el arranque del nodo que midió.
- `via`: `"local"` o `"espnow"`.
- `rssi`: opcional, entero, solo si `via` es `"espnow"`.

**Ejemplos.** Son inventados: los identificadores de sonda no corresponden a sondas reales.

```json
{"v":1,"type":"hello","node":"A","fw":"kairos-A-1.0","board":"ESP32-D","sensors":1}
{"v":1,"type":"reading","node":"A","sensor":"28FF641E8D3C0A12","t_c":3.81,"ok":true,"seq":412,"up_ms":2058211,"via":"local"}
{"v":1,"type":"reading","node":"B","sensor":"28AA7B3C1D0E2F44","t_c":24.50,"ok":true,"seq":405,"up_ms":2051877,"via":"espnow","rssi":-58}
{"v":1,"type":"reading","node":"B","sensor":null,"t_c":null,"ok":false,"err":"no_sensor","seq":406,"up_ms":2056877,"via":"espnow","rssi":-60}
{"v":1,"type":"reading","node":"A","sensor":"28FF641E8D3C0A12","t_c":null,"ok":false,"err":"power_on_85","seq":413,"up_ms":2063211,"via":"local"}
{"v":1,"type":"status","node":"A","peer":"B","peer_age_ms":3100}
```

**Reglas del analizador de la página**

- Acumula bytes hasta `\n`. Tolera `\r\n`. Si una línea pasa de 4 KB sin salto, descarta lo acumulado.
- Ignora sin error las líneas que no son JSON (mensajes de arranque del ESP32) y los `type` desconocidos. Cuenta cuántas ignoró y guárdalas en la consola de diagnóstico.
- Ignora los campos desconocidos, para que el protocolo pueda crecer.
- Valida tipos y rangos: `node` es A o B y `t_c` es un número finito. Rechaza −127 y 85.0 aunque llegue `ok:true`: es una segunda defensa. Avisa en diagnóstico si `t_c` queda fuera de −10 a +85 °C, el rango de precisión nominal del DS18B20 (informe, p. 9).
- La marca de tiempo la pone la laptop al recibir la línea, porque el ESP32 no tiene reloj. `up_ms` sirve solo para detectar reinicios: si baja, el nodo reinició. Lo mismo con `seq`.
- Paquetes perdidos = saltos en `seq` por nodo. Muéstralos en Dispositivos.
- Intervalo observado por nodo = mediana de las últimas 10 diferencias entre lecturas. Un nodo queda «sin datos» cuando pasan 3 intervalos observados sin lectura, con un mínimo de 10 s.
- Todo dato serial es no confiable: nunca lo insertes como HTML.

## 4. Modelo, escenarios, estados y recomendación

**Modelo Q10** (funciones puras, sin acceso al DOM, para poder probarlas y explicarlas):

```latex
f(T) = Q_{10}^{(T - T_{ref})/10}

E = \sum_i \Delta t_i \, f(T_i)

\text{saldo} = \max(0,\; L_{ref} - E_0 - E)

\text{vida}\,\% = 100 \cdot \text{saldo} / L_{ref}
```

- Parámetros por defecto, **provisionales**: Q10 = 2, Tref = 4 °C, Lref = 120 h. Son editables en un panel «Parámetros del modelo (provisionales)».
- E son horas equivalentes a Tref, no horas de reloj. E0 es un consumo inicial manual por carga (0 por defecto), para representar una carga que ya tenía historia.
- Δt es el tiempo entre dos lecturas válidas consecutivas y se aplica la temperatura de la lectura anterior. Si Δt supera 3 intervalos observados, ese tramo no se integra: se cuenta como laguna y la tarjeta muestra «Datos faltantes: N min». Nunca rellenes una laguna con una temperatura inventada.
- En modo real el porcentaje cuenta solo desde el inicio del monitoreo. Muestra esa hora de inicio y un botón «Reiniciar monitoreo».
- Constante `MOSTRAR_PORCENTAJE_EN_REAL = true`. Con `true`, el porcentaje real se muestra con la etiqueta «Estimación en validación · parámetros provisionales». Con `false`, se muestra `--%` con la misma etiqueta y la barra queda gris.

**Escenarios de demostración** (determinista: usa un generador pseudoaleatorio con semilla fija y la misma salida en cada ejecución; el ruido de temperatura es de ±0.3 °C):

| Escenario | Estado inicial | Qué ocurre | Para qué sirve |
| --- | --- | --- | --- |
| 1. Contraste (se carga por defecto) | A 78 % (E0 = 26.4 h) y B 28 % (E0 = 86.4 h) | A, a unos 4 °C, baja 0.83 puntos por hora simulada. B, a unos 24.5 °C, baja 3.45 puntos por hora simulada y llega a 0 % en unas 8 h simuladas (16 s a 1 h = 2 s) | Se ve de inmediato la diferencia entre hielera y ambiente |
| 2. Ejemplo del informe | A y B en 100 % | De 0 a 10 h, A a 4 °C; de 10 a 14 h, A a 24 °C. B a 4 °C las 14 h. Al final: A ≈ 78.33 % y B ≈ 88.33 % (tolerancia ±0.5 puntos por el ruido) | Coincide con la lámina del ejemplo; usarlo cuando se hable de ese ejemplo |

- Muestra siempre el nombre del escenario en pantalla. Los porcentajes iniciales del escenario 1 son un estado inicial simulado y se rotulan así.
- Cuando una carga llega a 0 %, muestra «VIDA ÚTIL ESTIMADA AGOTADA» sin romper el diseño; la simulación puede pausarse y reiniciarse.
- El tiempo simulado se calcula con el tiempo real transcurrido por la velocidad, no contando ticks, para que no se distorsione si el navegador limita los temporizadores de una pestaña en segundo plano.
- Velocidades: 1 h = 4 s, 1 h = 2 s (por defecto) y 1 h = 1 s.
- En demostración las horas se muestran como «T+hh:mm» de tiempo simulado, nunca como una hora de reloj falsa.

**Niveles de estado.** Cada carga tiene dos niveles y la tarjeta muestra el peor.

| Nivel | Color y forma | Por vida útil | Por temperatura | Texto del aviso |
| --- | --- | --- | --- | --- |
| Normal | Verde lima `#84CC16`, círculo | ≥ 60 % | En rango | ESTABLE · CADENA DE FRÍO |
| Atención | Amarillo `#FACC15`, triángulo | 40 a < 60 % | No aplica | ATENCIÓN · VIDA ÚTIL EN DESCENSO |
| Advertencia | Naranja `#FF8500`, rombo | 20 a < 40 % | No aplica | ADVERTENCIA · PRIORIZAR ENTREGA |
| Crítico | Rojo `#FF0000`, octógono | < 20 % | Fuera de rango durante 2 lecturas consecutivas | ALERTA · PRIORIDAD CRÍTICA, con la causa: «Pérdida de frío (T > 8 °C)», «Frío excesivo (T < 0 °C)» o «Vida útil estimada < 20 %» |
| Sin datos | Gris `#8FA3B5`, círculo punteado | No se calcula | Sin lectura válida reciente | SIN LECTURA · REVISAR SONDA |

- Los umbrales de vida (60, 40 y 20) y el rango de temperatura (mínimo 0 °C y máximo 8 °C) viven en `CONFIG`; el rango también se edita en la página. Exige 2 lecturas consecutivas fuera de rango para evitar que un solo dato erróneo dispare la alerta.
- El color nunca es la única señal: cada nivel lleva forma y texto.
- Cada tarjeta muestra también el historial objetivo: número de excursiones fuera de rango y tiempo total fuera de rango. Una carga puede verse en verde y haber tenido una excursión; eso debe ser visible.

**Recomendación de entrega** (es la función central: va en el tablero, grande, bajo las dos tarjetas):

- Regla: se entrega primero la carga con **menor** vida útil estimada.
- Si la diferencia es menor que 2 puntos (`EMPATE_PUNTOS = 2`): «CARGAS SIMILARES», sin elegir una.
- Si a una carga le falta lectura válida reciente: «NO SE PUEDE COMPARAR» y el motivo. No calcules nada con una lectura ausente tomada como cero.
- Si ambas llegan a 0 %: «AMBAS AGOTADAS (ESTIMACIÓN)».
- Muestra una línea de motivo, por ejemplo «La carga B tiene 10.0 puntos menos de vida útil estimada», y el nivel de estado de cada carga al lado.
- Texto fijo y siempre visible bajo la recomendación: «Sugerencia basada en una estimación provisional. No certifica la inocuidad ni la calidad del producto.»

## 5. Tablero

**Prioridades.** `[M]` imprescindible, `[S]` deseable, `[C]` opcional. Si el tiempo aprieta, recorta de abajo hacia arriba: primero `[C]`, luego `[S]`. Nunca recortes un `[M]`.

**Navegación** `[M]`. Una sola página con rutas por hash: `#/` (institucional), `#/dashboard`, `#/dashboard/cargas`, `#/dashboard/temperatura`, `#/dashboard/alertas`, `#/dashboard/dispositivos`, `#/dashboard/reportes` y `#/autotest`. Menú lateral: Resumen, Cargas, Temperatura, Alertas, Dispositivos, Reportes. Sin recargas; el botón Atrás funciona; al navegar, el foco pasa al título principal y el ítem activo lleva `aria-current="page"`.

**Barra superior** `[M]`. Control segmentado **DEMOSTRACIÓN | SENSORES REALES**; cada vez que se abre la página arranca en DEMOSTRACIÓN. En demostración hay una insignia permanente «DATOS SIMULADOS» con el nombre del escenario. Junto al control, un chip de conexión con estos estados:

- Demostración: «Modo demostración · sin hardware».
- Sin Web Serial: «Este navegador no permite USB. Abra la página en Chrome o Edge». La demostración sigue funcionando.
- USB desconectado, con el botón «Conectar por USB».
- Conectando, mientras se espera el selector de puerto. Si la persona cancela el selector, no es un error: vuelve a «USB desconectado».
- «USB conectado · VID:PID 1234:ABCD» (nunca «COM3»).
- «USB conectado · esperando datos del Nodo A», durante los primeros segundos tras abrir el puerto (la placa suele reiniciarse).
- «Se perdió la conexión USB», con el botón «Reconectar».

Al pasar a sensores reales, la página deja de simular, borra el estado de demostración y empieza a registrar. Los datos simulados jamás se mezclan con los reales. Al desconectarse conserva lo registrado. `[S]` Al cargar, intenta reabrir un puerto ya autorizado con `navigator.serial.getPorts()`; puede no funcionar desde `file://`, así que nada depende de ello. Si lo encuentra, solo ofrece el botón «Reconectar»; nunca cambia de modo por su cuenta.

**Vista Resumen** `[M]`. A 1366×768, sin desplazarse, deben verse las dos tarjetas de carga y la recomendación de entrega. Debajo, fuera de la primera pantalla: la gráfica reducida y los últimos 5 eventos.

Cada **tarjeta de carga** contiene:

- Nombre del lote editable con un clic y guardado: «KD-LOT-A · Hielera» y «KD-LOT-B · Ambiente» por defecto (en `CONFIG`). En modo real la etiqueta puede no corresponder a dónde está la sonda, por eso se edita.
- Aviso de nivel con forma, color y texto (sección 4).
- Temperatura gigante (unos 88 px, cifras tabulares) con °C y la antigüedad de la lectura: «hace 3 s» en real, «T+05:12» en demostración. Su color sigue el estado térmico.
- Porcentaje de vida útil y horas equivalentes, por ejemplo «78 % · 93.6 h equivalentes a 4 °C».
- Barra de progreso horizontal de al menos 28 px de alto y todo el ancho de la tarjeta, con marcas en 20, 40 y 60 y transición suave de color y ancho.
- Etiqueta de origen: «DATOS SIMULADOS» en demostración; «Estimación en validación · parámetros provisionales» en real.
- Historial: excursiones, tiempo fuera de rango y datos faltantes.

**Controles de demostración** `[M]` (solo en demostración; botones de al menos 44 px, legibles a un metro):

- Reproducir o pausar, velocidad (sección 4), Reiniciar y selector de escenario.
- «Abrir hielera»: A tiende a 24 °C con constante de tiempo de 0.5 h simulada. «Cerrar hielera»: vuelve a 4 °C con constante de 1 h simulada. Es el control para que el jurado participe. Su efecto se superpone al escenario.
- «Simular falla de sonda B» y «Reconectar sonda B»: B deja de enviar lecturas válidas; la tarjeta pasa a SIN LECTURA y la recomendación a NO SE PUEDE COMPARAR.

**Vista Temperatura** `[M]`. Gráfica en SVG propio, sin librerías:

- Selector de carga (A, B, A+B) y de ventana (Última hora, 5 horas, 24 horas, Todo; en demostración es tiempo simulado).
- A en línea continua turquesa `#08C6BE` y B en línea discontinua marfil `#E8F1F8`, con la etiqueta directa al final de cada línea; no dependas solo de una leyenda.
- Banda sombreada del rango aceptable (turquesa al 10 %) y un marcador rojo, con borde, en cada lectura fuera de rango.
- Cursor vertical con descripción emergente (hora, carga, valor) al pasar el mouse o tocar. Ejes con unidades.
- Sin datos: un mensaje claro, no un gráfico vacío. Máximo 600 puntos dibujados por serie, conservando mínimos, máximos y marcadores de alerta.
- `[C]` Interruptor «Ver como tabla».

**Panel de límites de temperatura** `[M]`: mínimo (0 °C por defecto) y máximo (8 °C), con mínimo menor que máximo y valores entre −10 y 40 °C. El cambio se aplica de inmediato a la banda, a los marcadores, a los avisos y a los eventos nuevos; los eventos pasados conservan el límite con que se generaron. Cada cambio queda registrado como evento, por ejemplo «Límite máximo cambiado de 8 a 6 °C». Un panel hermano permite editar Q10, Tref, Lref y E0 con la etiqueta «provisionales».

**Vista Alertas** `[M]`. Registro de eventos, el más reciente arriba, máximo 500: hora (T+hh:mm en demostración; fecha y hora locales en real), tipo, carga, valor, recomendación y estado (activa o cerrada). Eventos: salida de rango (inicio y fin), cambio de nivel por vida útil, falla de sonda, nodo sin datos o recuperado, conexión y desconexión USB, cambio de parámetros o límites y reinicio de monitoreo. Se registra un evento por transición, nunca uno por lectura. Ejemplo de recomendación: «Carga B subió a 24.5 °C. Recomendación: revisar de inmediato y priorizar su entrega.» `[S]` Filtros por carga y tipo.

**Vista Cargas** `[S]`. Por carga: curva de vida útil en el tiempo, T mínima, media y máxima, excursiones, datos faltantes y el campo E0.

**Vista Dispositivos** `[M]`. Diagnóstico para el jurado:

- Por nodo: modelo de placa (de `CONFIG`: «ESP-32D de 38 pines»), ID de la sonda leído del serial, última lectura «hace N s», intervalo observado, lecturas recibidas, paquetes perdidos, RSSI si llega, y estado.
- Conexión: transporte (demostración, USB o reproducción de archivo), VID:PID, baudios, líneas recibidas, líneas ignoradas y errores de análisis.
- Consola de diagnóstico plegable con las últimas 50 líneas crudas en tipografía monoespaciada y un botón «Copiar». `[S]` Botón «Cargar captura (.txt, .jsonl)» que reproduce un archivo de líneas con el mismo analizador: sirve para ensayar sin hardware y como plan B si falla el USB.

**Vista Reportes** `[M]`:

- «Descargar muestras (CSV)»: UTF-8 con BOM, coma como separador, punto decimal, fechas ISO 8601. Columnas: `origen` (`simulado` o `real`), `escenario`, `carga`, `nodo`, `sensor_id`, `t_c`, `ok`, `marca_tiempo` (solo real), `t_sim_h` (solo simulado, con 2 decimales), `vida_pct` y `horas_equiv_consumidas`. El nombre del archivo lleva el origen: `kairos_real_AAAAMMDD_HHMMSS.csv` o `kairos_simulado_AAAAMMDD_HHMMSS.csv`. Un CSV de datos simulados no demuestra auditabilidad, por eso `origen` aparece en todas las filas.
- «Descargar eventos (CSV)» `[M]` y «Descargar metadatos (JSON)» `[S]` con parámetros, límites, versión de la página, navegador, VID:PID e inicio del monitoreo.
- `[S]` Resumen imprimible por carga, con hoja de estilos para impresión.
- «Borrar datos locales» con una ventana de confirmación propia, no `confirm()`.
- Persistencia en `localStorage` con prefijo `kairos.v1.`, solo de datos reales, con tope de 5,000 muestras por nodo y todo dentro de `try/catch`. Si no hay almacenamiento, avisa: «Sin almacenamiento local: los datos se perderán al cerrar la página».

**Modo presentación** `[S]`: botón o tecla `P`. Sube la tipografía base un 25 %, oculta la barra lateral y deja el Resumen a pantalla completa. `[C]` Espacio pausa o reanuda la demostración y `R` la reinicia.

## 6. Página institucional (`#/`)

Objetivo: que alguien sin conocimientos técnicos entienda el problema y la idea en 20 segundos y vea el producto funcionando. Usa los textos de esta sección tal cual; no escribas otros.

- **Barra de navegación fija** `[M]`. Marca de texto KAIROS (turquesa) y DYNAMICS (naranja). Enlaces: Inicio, Cómo funciona, Tecnología y el botón Ver Dashboard. Los tres primeros se desplazan dentro de la misma página, respetando `prefers-reduced-motion`; Ver Dashboard va a `#/dashboard`.
- **Hero** `[M]`. Título: «Cada grado importa.», con la palabra «grado» en un degradado turquesa a naranja (frío a calor). Subtítulo: «Monitoreo inteligente de temperatura para el transporte refrigerado de fresa». Botón principal «Probar la plataforma», que lleva a `#/dashboard`, y botón secundario «Cómo funciona». A un lado, en lugar de una ilustración genérica, una versión reducida y viva del Resumen en demostración, hecha con los mismos componentes, con la insignia «DEMOSTRACIÓN · DATOS SIMULADOS», sin controles y que se reinicia sola al terminar.
- **El problema** `[M]`. Título: «Una alarma solo ve el presente». Texto: «Durante el transporte, la fresa se desgasta con el tiempo y con la temperatura. Un termómetro o una alarma de umbral dicen cómo está la carga en este momento, pero no cuánto desgaste acumuló antes.»
- **Nuestra solución** `[M]`. Título: «Registrar paso a paso, comparar y decidir». Texto: «KAIROS DYNAMICS registra la temperatura de cada carga, suma el efecto acumulado con una ecuación sencilla (Q10) y sugiere cuál conviene entregar primero.»
- **Tres pasos** `[M]`, en tarjetas numeradas con ícono:
  1. MEDIR: «Una sonda sumergible dentro de cada carga mide la temperatura.»
  2. SUPERVISAR: «Las lecturas y el historial se guardan en la propia computadora, sin internet.»
  3. ACTUAR: «El sistema sugiere qué carga entregar primero.»
- **Tecnología** `[M]`, en tarjetas:
  - «Sondas DS18B20 sumergibles, de acero inoxidable. Precisión nominal de ±0.5 °C entre −10 y +85 °C.»
  - «Dos placas ESP-32D, una por carga. La placa B envía su lectura a la A por ESP-NOW, sin Wi-Fi ni internet.»
  - «Conexión USB a la computadora y una página local que abre con doble clic, sin servidores.»
  - «Modelo Q10: ecuación de desgaste acumulado con parámetros provisionales.»
- **Alcance y límites** `[M]`, visible y no escondido: «Esto es un prototipo educativo. La estimación de vida útil usa parámetros provisionales que aún no tienen validación experimental. No certifica la inocuidad ni la calidad del producto. Los datos de demostración son simulados.»
- **Equipo y evento** `[S]`: los cuatro nombres y la línea del pie de la sección 1, más el número de registro si `CONFIG` lo trae.
- Cierre con el botón «Probar la plataforma» repetido.

**Prohibido en esta página:** cifras de pérdida o desperdicio de alimentos (el equipo las añadirá después, con fuente y página del informe), testimonios, logotipos de terceros, métricas inventadas y cualquier mención de inteligencia artificial.

## 7. Dirección visual

**Concepto: sala de control de un laboratorio de frío.** Oscuro, sobrio y preciso. La información manda y el color se reserva para el estado. La identidad es el paso de frío (turquesa) a calor (naranja): úsalo en el degradado de la palabra «grado», en la marca y en el borde superior de las tarjetas según su nivel, y en ningún otro lugar.

**Composición.** Cuadrícula tipo bento de 12 columnas, separación de 16 px (escala de 4 y 8), radio de 14 px, bordes de 1 px y jerarquía por tamaño de cifras. Mucho aire alrededor de la recomendación. Barra lateral de 232 px que pasa a barra inferior por debajo de 900 px.

**Tokens.** Decláralos como variables CSS en `:root`. Los contrastes son WCAG calculados (fondo / tarjeta).

| Token | Valor | Uso | Contraste sobre fondo / tarjeta |
| --- | --- | --- | --- |
| `--bg` | `#0B1B2B` | Fondo general | n/a |
| `--card` | `#123451` | Tarjetas y elementos de frío | 1.36 contra el fondo: separar con borde |
| `--border` | `#3E5162` | Borde de 1 px de las tarjetas | 2.12 sobre el fondo |
| `--ink` | `#E8F1F8` | Texto principal | 15.2 / 11.2 |
| `--ink-dim` | `#9DB4C8` | Texto secundario | 8.1 / 6.0 |
| `--cyan` | `#08C6BE` | KAIROS, frío, serie A | 8.2 / 6.0 |
| `--orange` | `#FF850F` | DYNAMICS, marca | 7.1 / 5.3 |
| `--ok` | `#84CC16` | Normal | 8.8 / 6.5 |
| `--attn` | `#FACC15` | Atención | 11.4 / 8.4 |
| `--warn` | `#FF8500` | Advertencia | 7.1 / 5.3 |
| `--crit` | `#FF0000` | Crítico: rellenos, barras, íconos y cifras grandes | 4.4 / 3.2 |
| `--crit-text` | `#FF6B6B` | Crítico: texto pequeño | 6.3 / 4.6 |
| `--nodata` | `#8FA3B5` | Sin datos | 6.7 / 4.9 |

- Texto normal: al menos 4.5:1. Texto grande (24 px o más, o 19 px en negrita): al menos 3:1.
- `#FF0000` solo en rellenos, barras, íconos y cifras grandes. El texto rojo pequeño usa `--crit-text`. Sobre un relleno rojo, texto blanco de 19 px o más en negrita (4.0:1).
- Sobre rellenos lima, amarillo, naranja y turquesa, el texto es `--bg`.
- `--warn` y `--orange` se ven casi iguales; se conservan los dos tokens para respetar el encargo original.
- Los fondos de estado semitransparentes (por ejemplo, un color al 14 % sobre la tarjeta) deben medirse de nuevo: en la Etapa 5, un script comprueba el contraste real de cada texto sobre su fondo calculado.

**Tipografía, sin fuentes remotas.** Interfaz: `"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif`. Diagnóstico y consola: `"Cascadia Mono", Consolas, ui-monospace, monospace`. Las cifras llevan siempre `font-variant-numeric: tabular-nums` para que no bailen. Escala: 12 (etiquetas en mayúsculas con 0.08 em de espaciado), 14, 16, 20, 28, 44 y 88 px; pesos 400, 600 y 700; espaciado de letras −0.02 em en cifras de 44 px o más. Si se incrusta una fuente, debe ser libre (OFL), en base64, declarada en el README y sumar menos de 400 KB.

**Componentes**

- Tarjetas: fondo `--card` con un degradado muy sutil hacia `#0F2A42`, borde de 1 px, realce interior superior y un borde superior de 3 px con el color del nivel de estado.
- Fondo: degradado radial turquesa al 8 % en la esquina superior izquierda y retícula de puntos al 4 %, en CSS o SVG en línea. Sin imágenes de archivo.
- Íconos: SVG en línea propios, trazo de 1.75 px, rejilla de 24 px y un solo estilo. Una forma distinta por nivel (círculo, triángulo, rombo, octógono). Sin emoji.
- Estados vacíos, de carga y de error diseñados; nunca una pantalla en blanco.
- `backdrop-filter` como máximo en la barra superior: la laptop de la escuela puede ser modesta.

**Movimiento**

- Ancho y color de la barra: 600 ms con `cubic-bezier(.2,.8,.2,1)`. Cifras que cambian con interpolación de 300 a 400 ms. Las secciones entran una sola vez con desvanecimiento y 8 px de desplazamiento.
- Anima solo `transform` y `opacity`; nada que reacomode la cuadrícula.
- El aviso Crítico puede pulsar suavemente (ciclo de 1.6 s, máximo 3 repeticiones). Nada parpadea más de 3 veces por segundo.
- Respeta `prefers-reduced-motion: reduce`: sin animaciones, salvo el cambio de valores.

**Responsivo.** 1920×1080, 1366×768 (referencia principal), 1024×768 y 390×844, sin desplazamiento horizontal. Objetivos táctiles de al menos 44 px.

**Accesibilidad como parte del diseño.** El estado nunca depende solo del color (forma más texto). Foco visible de 2 px con `--cyan`. `lang="es-MX"`. Zonas semánticas (`header`, `nav`, `main`, `footer`) y enlace «Saltar al contenido». `aria-live="polite"` solo para el aviso de nivel de cada carga y para la recomendación, no para cada cifra.

**Evita lo que delata una plantilla genérica:** degradados morados, ilustraciones de archivo, emojis como íconos, cristal esmerilado en todas partes, neón estilo ciberpunk, carruseles, efectos parallax, métricas o testimonios falsos, logotipos inventados y sombras gruesas.

## 8. Restricciones de ingeniería

**Entregable de ejecución.** `kairos_dashboard.html`: un solo archivo con HTML, CSS y JS en línea, con script clásico (no `type="module"`), sin dependencias, sin frameworks, sin CDN y sin fuentes remotas. Debe funcionar con doble clic en Chrome o Edge de escritorio actuales, sin internet, sin servidor y sin Node.js. Durante el desarrollo puedes usar herramientas que necesiten internet, pero el producto final no puede necesitarlas. Vite, React y Recharts quedan descartados: su salida normal no abre desde `file://` (sección 2).

**Cero red** `[M]`. El archivo no hace ninguna petición HTTP. Abierto desde `file://`, el registro de peticiones debe mostrar solo la propia página.

**Peso y rendimiento.** Objetivo: 300 KB o menos, sin imágenes incrustadas pesadas. Memoria acotada: máximo 20,000 muestras por nodo en un búfer circular. Dibujo con `requestAnimationFrame` a no más de 30 cuadros por segundo. El DOM no crece con el tiempo: tras 10 minutos de demostración a la velocidad máxima, el número de nodos DOM varía menos del 5 %.

**Organización del código.** Secciones en este orden, con comentarios en español que expliquen el porqué, no el qué:

1. `CONFIG`: constantes y textos que el equipo puede cambiar. Solo lo que realmente deba cambiar.
2. Modelo Q10: funciones puras.
3. Estado y niveles: funciones puras.
4. Transportes con una misma interfaz (`start`, `stop`, `onLine`): demostración, Web Serial y reproducción de archivo. Así todo el flujo se prueba sin hardware.
5. Analizador NDJSON.
6. Detector de eventos, con histeresis (2 lecturas consecutivas).
7. Almacenamiento y exportación.
8. Interfaz: rutas, vistas y componentes.
9. Gráfica SVG.
10. Autopruebas.

Expone en `window.KAIROS` las funciones puras (modelo, niveles y analizador) para poder probarlas, y documéntalo.

**Autopruebas** `[M]`. `#/autotest` muestra en pantalla PASS o FAIL de cada vector de la sección 11, sin instalar nada. Así el equipo puede comprobarlo en la laptop de la escuela.

**Seguridad.** Los datos del puerto serial no son confiables: se muestran con `textContent`, nunca con `innerHTML`. `JSON.parse` va dentro de `try/catch`. Sin `eval`, sin `Function`, sin `document.write` y sin `alert`, `confirm` ni `prompt`.

**Tiempo.** Los intervalos se miden con `performance.now()`. `Date.now()` se usa solo para la marca de tiempo de las lecturas reales.

**Compatibilidad.** Chrome y Edge de escritorio recientes. Sin Web Serial, la demostración, la reproducción de archivo y todas las vistas funcionan; solo falta el USB, con un mensaje claro.

**Legibilidad para defenderlo.** El equipo debe poder explicar cada función. Nada de trucos, sin minificar, nombres de dominio en español (`vidaUtilPct`) y en inglés solo los términos técnicos estándar. En `docs/ARQUITECTURA.md` indica qué partes generó Claude, para que el equipo pueda declarar el uso de IA si la convocatoria lo pide.

**Versión visible.** Pie del tablero: «v1.0 · compilado AAAA-MM-DD HH:mm».

## 9. Firmware

Todo lo nuevo va en la carpeta `firmware/`. No modifiques ni borres ningún firmware previo: el equipo conserva su página servida por la placa como respaldo.

| Carpeta y sketch | Etapa | Qué hace |
| --- | --- | --- |
| `00_mac_address/00_mac_address.ino` | 1 | Imprime la dirección MAC de la placa A con `WiFi.mode(WIFI_STA)` y `WiFi.macAddress()`. El equipo la copia a `MAC_NODO_A` en el sketch de B. |
| `etapa1_nodo_A_json/etapa1_nodo_A_json.ino` | 1 | Parte de `KAIROS_Etapa1_LecturaSonda.ino`. Mide la sonda propia cada `INTERVALO_S` y emite `hello` y `reading` (`node` A, `via` local) en NDJSON. Permite probar la página con una sola placa y sin ESP-NOW. |
| `nodo_B/nodo_B.ino` | 3 | Lee la sonda cada `INTERVALO_S` y envía por ESP-NOW a `MAC_NODO_A` una estructura con `node`, ROM, `t_c`, `ok`, `err`, `seq` y `up_ms`. |
| `nodo_A/nodo_A.ino` | 3 | Lo mismo que el de la Etapa 1, más la recepción de B. Imprime un `reading` por paquete (`via` espnow, con `rssi` si el núcleo lo entrega) y un `status` cada 10 s con `peer_age_ms`. |

**Requisitos de los sketches**

- Placa «ESP32 Dev Module», sonda en GPIO4 con 4.7 kΩ, 115200 baudios, librerías OneWire y DallasTemperature (anota sus versiones).
- `INTERVALO_S = 5` como constante declarada arriba y común a los tres sketches de medición.
- Reglas de lectura: −127 (`DEVICE_DISCONNECTED_C`) da `err` `"disconnected"`; 85.0 da `"power_on_85"`; sin sonda da `"no_sensor"`. Nunca emitas un `t_c` numérico con `ok` en `false`.
- La ROM de la sonda sale en 16 caracteres hexadecimales en mayúsculas (`getAddress`).
- ESP-NOW: ambos nodos en modo `WIFI_STA` y en el mismo canal, fijado de forma explícita con una constante (`CANAL_ESPNOW = 1`). La firma de los callbacks de ESP-NOW cambió entre el núcleo Arduino-ESP32 2.x y 3.x: declara para cuál compilas y, si puedes, soporta ambas con `#if ESP_ARDUINO_VERSION_MAJOR >= 3`. Comprueba la firma exacta en la documentación de la versión que uses; no la escribas de memoria.
- Sin `String` de Arduino en el bucle: el JSON se arma con `snprintf` en un búfer fijo de 256 bytes y las temperaturas llevan 2 decimales. Los tiempos se controlan con `millis()`, sin pausas largas.
- Cada sketch abre con una cabecera: versión, núcleo y librerías, y la línea «Compilado: SÍ (herramienta y fecha)» o «Compilado: NO». Si `arduino-cli` está instalado, compila los cuatro sketches y muestra el resultado. Si no, escribe NO COMPILADO y no afirmes que funcionan.
- Comentarios en español que expliquen el cableado físico.

**Pruebas de hardware.** Las ejecuta el equipo, no tú. Crea `docs/PRUEBAS.md` como plantilla con columnas «Resultado esperado», «Resultado real», «Fecha» y «Quién», **sin llenar los resultados**:

1. En la laptop de la escuela, con Chrome o Edge: al conectar la placa A, ¿aparece el puerto en el selector? ¿llegan líneas JSON?
2. Nodo B encendido con su power bank: ¿llegan lecturas con `via` espnow?
3. Calentar la sonda B con la mano durante 1 minuto: ¿sube la temperatura y cambia la recomendación?
4. Desconectar la sonda B: ¿la tarjeta pasa a SIN LECTURA y la recomendación a NO SE PUEDE COMPARAR?
5. Funcionamiento continuo durante 30 minutos: paquetes perdidos, lagunas y estado de la conexión.
6. Reabrir la página y reconectar: ¿los datos reales se conservan y los simulados no?

## 10. Etapas y entregables

**Estructura de la carpeta**

```text
kairos/
  kairos_dashboard.html        (Etapas 2 a 5; es lo único que se abre con doble clic)
  README.md
  firmware/                    (sección 9)
  docs/
    ARQUITECTURA.md  PROTOCOLO.md  PENDIENTES.md  PRUEBAS.md
    wireframes.html  capturas/
  tests/                       (opcional: scripts de prueba con navigator.serial simulado)
  respaldo/                    (solo si la carpeta no es un repositorio git)
```

| Etapa | Qué entrega | Parada |
| --- | --- | --- |
| 1. Planeación | Documentos, wireframes y firmware de prueba. **Sin código del tablero.** | Sí, si RITMO = ETAPAS |
| 2. Núcleo de demostración | `kairos_dashboard.html` con tokens, rutas, Resumen completo, simulador con los dos escenarios y sus controles, modelo Q10 y `#/autotest` | No |
| 3. USB | Transporte Web Serial, reproducción de archivo, analizador, vista Dispositivos con diagnóstico, estados de conexión, firmware de A y B, prueba con `navigator.serial` simulado | No |
| 4. Resto del tablero | Temperatura (gráfica y límites), Alertas, Cargas, Reportes (CSV y persistencia), página institucional, modo presentación y pulido visual | No |
| 5. Verificación | Sección 11 completa, capturas en los cuatro tamaños, README, `docs/PRUEBAS.md` y el informe final | Fin |

**Etapa 1, contenido exacto** (una sola respuesta):

- `docs/ARQUITECTURA.md`, de dos páginas como máximo: flujo de datos (placa B, ESP-NOW, placa A, USB, página), los módulos de la sección 8, la máquina de estados de la conexión USB (los estados de la sección 5), las decisiones tomadas con las alternativas descartadas y por qué, y qué partes generó Claude.
- `docs/PROTOCOLO.md`: el contrato de la sección 3, ocho líneas de ejemplo con fallas incluidas y las reglas del analizador.
- `docs/wireframes.html`: archivo estático, sin dependencias, con tres pantallas dibujadas en HTML o SVG: Resumen en demostración, Resumen en modo USB y Dispositivos. Si hay Playwright o un navegador sin interfaz disponible, genera también PNG en `docs/capturas/`.
- `firmware/00_mac_address` y `firmware/etapa1_nodo_A_json`.
- `docs/PENDIENTES.md`: contradicciones entre este prompt y los archivos, datos que faltan y riesgos sin verificar.
- Un plan de pruebas de unas 10 líneas.
- Cierre de 15 líneas como máximo: lo hecho, lo no comprobado y las decisiones que necesitas del usuario. Luego **detente**.

**Reglas entre etapas**

- Al cerrar cada etapa, un resumen de cinco líneas con Verificado, No probado y Pendiente.
- Respaldo: si la carpeta ya es un repositorio git, un commit por hito; si no lo es, no inicialices uno y copia el HTML a `respaldo/E<n>_kairos_dashboard.html`.
- No instales nada global. Si necesitas una herramienta (Playwright, arduino-cli) y no está, dilo, sigue sin ella y marca la prueba como NO EJECUTADA.
- Ante una duda de diseño que no cambie lo que ve el jurado, decide tú y anótalo; ante una que sí lo cambie, pregunta.

## 11. Criterios de aceptación e informe final

Todo lo siguiente se comprueba, no se supone. Para cada punto, el informe final dice PASA, FALLA o NO EJECUTADA, con el comando o la evidencia. Si no hay Playwright, marca NO EJECUTADA y deja escritos los pasos para que el equipo lo haga a mano.

**Vectores del modelo** (Tref = 4 °C y Lref = 120 h, salvo que se indique). Deben pasar en `#/autotest`:

| # | Entrada | Resultado esperado |
| --- | --- | --- |
| V1 | Factor f(T) con Q10 = 2 | f(4) = 1; f(8) ≈ 1.32; f(14) = 2.00; f(24) = 4.00 |
| V2 | Carga A: 10 h a 4 °C y 4 h a 24 °C, Q10 = 2 | E = 26 h; saldo 94 h; 78.33 % |
| V3 | Carga B: 14 h a 4 °C, Q10 = 2 | E = 14 h; saldo 106 h; 88.33 % |
| V4 | La carga A de V2 con Q10 = 2.5 | E = 35 h; 70.83 % |
| V5 | La carga A de V2 con Q10 = 3 | E = 46 h; 61.67 % |
| V6 | E mayor que Lref | 0 %, nunca negativo |
| V7 | Lecturas cada 5 s y luego una a los 60 s (intervalo observado de 5 s) | El tramo de 55 s no se integra y se cuenta como laguna |
| V8 | `t_c` de −127 o 85.0, o `ok` en `false` | No se integra ni cambia el porcentaje |
| V9 | E0 de A = 26.4 h y de B = 86.4 h (escenario 1) | 78.0 % y 28.0 % |
| V10 | Escenario 1 con B a 24.5 °C | B llega a 0 % en unas 8.1 h simuladas (f = 4.14) |
| V11 | Recomendación con A 78.33 % y B 88.33 % | Entregar primero la carga A; diferencia de 10.0 puntos |
| V12 | Diferencia de 1.5 puntos | CARGAS SIMILARES |
| V13 | Una carga sin lectura válida reciente | NO SE PUEDE COMPARAR |

**Verificación del producto**

1. **Sin red.** Abre `kairos_dashboard.html` desde `file://` en Chromium sin interfaz y registra las peticiones: solo debe aparecer la propia página. Sin errores ni avisos en consola.
2. **Autopruebas.** `#/autotest` en PASS para V1 a V13.
3. **Escenario 2 completo** a 1 h = 1 s: al terminar, A ≈ 78.33 % y B ≈ 88.33 % (±0.5 puntos) y la recomendación es «Entregar primero: Carga A».
4. **Escenario 1.** Arranca con A en 78 % y B en 28 %. B llega a «VIDA ÚTIL ESTIMADA AGOTADA» sin errores de interfaz.
5. **Falla de sonda B.** Aparecen SIN LECTURA y NO SE PUEDE COMPARAR. Al reconectar, el tramo ausente queda como laguna, no como cero.
6. **Serial simulado.** Sustituye `navigator.serial` por un doble que emite 3 minutos de NDJSON con: líneas de arranque que no son JSON, una línea partida en dos fragmentos, −127, 85.0, un salto de `seq`, un reinicio (`up_ms` baja) y B en silencio durante 30 s. La página debe ignorar lo que no es JSON, contar los saltos, marcar el reinicio, mostrar «Nodo B sin datos hace 30 s» y no producir ningún error en consola.
7. **Reproducción de archivo.** El mismo flujo con una captura `.jsonl`.
8. **Persistencia.** Al recargar se conservan los datos reales y no los simulados. «Borrar datos locales» funciona. Sin `localStorage`, la página avisa y sigue funcionando.
9. **CSV.** Se abre con los acentos bien en Excel (BOM), `origen` está en todas las filas y el número de filas coincide con el de muestras.
10. **Pantallas.** Capturas a 1920×1080, 1366×768, 1024×768 y 390×844, sin desplazamiento horizontal. A 1366×768 el Resumen muestra las tarjetas y la recomendación sin desplazarse. Mira las capturas tú mismo y corrige lo que se vea mal.
11. **Accesibilidad.** Recorrido solo con teclado por las seis vistas, con el foco siempre visible. Un script calcula el contraste real de cada texto sobre su fondo: mínimo 4.5:1, o 3:1 en texto grande.
12. **Honestidad del texto.** En el HTML deben estar: «DATOS SIMULADOS» en demostración, «Estimación en validación» junto al porcentaje en real y el aviso del pie que dice que no certifica inocuidad. No deben estar: «certificado», «validado» (salvo «no validado»), «preciso», «inteligencia artificial», «IA» como palabra suelta ni «machine learning».
13. **Rendimiento.** Tras 10 minutos de demostración a 1 h = 1 s, el DOM se mantiene estable (±5 %) y la CPU en reposo es baja.
14. **Rutas.** Cada ruta carga y el botón Atrás funciona. Una ruta desconocida lleva al Resumen o a la página institucional, nunca a una pantalla en blanco.

**Informe final, con este formato fijo**

- **Verificado**: lista con la evidencia (comando y resultado).
- **No probado**: todo lo que exige hardware o la laptop de la escuela (Web Serial real, driver USB, ESP-NOW, batería).
- **Pendiente del equipo**: lo de `docs/PENDIENTES.md` (número de registro, modelo de placa frente al informe, capacidad del power bank y lo que falte).
- **Cómo abrirlo**, en tres pasos.
- Una advertencia explícita: ninguna prueba con `navigator.serial` simulado demuestra que funcione con la placa real.

##
