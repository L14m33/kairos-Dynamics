# Pendientes, contradicciones y riesgos

Actualizado: 2026-11-25 (Etapa 1). Regla: si los archivos contradicen `PROMPT_KAIROS.md`, manda el prompt y la diferencia se anota aquí. **Nada de esta lista se corrige en la página**; el equipo lo aclara con el jurado.

Páginas del informe = número impreso al pie de `KAIROS_DYNAMICS_INFORME.pdf`. Páginas de la convocatoria = página del PDF `CONVOCATORIA.pdf` (no trae numeración impresa).

## 1. Contradicciones entre el informe y el montaje real (manda el montaje)

| # | Informe dice | Montaje real / prompt | Páginas |
| --- | --- | --- | --- |
| 1 | Una placa **ESP32-C3 SuperMini** | Dos placas **ESP-32D de 38 pines** («ESP32 Dev Module») | Informe p. 1, 8, 9, 12, 15 |
| 2 | Una sola placa con dos canales: carga A en **GPIO4**, carga B en **GPIO5** | Una placa por carga; las dos sondas en **GPIO4** | p. 9, 10, 24 |
| 3 | Comunicación por **Wi-Fi y servicio de datos / nube** | **ESP-NOW** de B a A y **USB** a una página local; sin Wi-Fi, sin nube | p. 8, 9, 12 |
| 4 | **Power bank de 10,000 mAh** ($160.55) | Capacidad real **no confirmada** | p. 15 (Tabla 12) |
| 5 | Lista de materiales con **1** placa ($124.41) y protoboard | Hay **2** placas; el costo real no coincide con la tabla | p. 15 (Tablas 12 y 13) |
| 6 | Muestreo de **1 lectura por minuto** | `INTERVALO_S = 5` s en los sketches nuevos | p. 10 |
| 7 | JSON con `lot_id`, `sensor_id`, `timestamp`, `temperature_c`, `status`, `sequence` | Protocolo v1: `node`, `sensor`, `t_c`, `ok`, `err`, `seq`, `up_ms`, `via` (ver `PROTOCOLO.md`). La hora la pone la laptop | p. 10 (Tabla 4) |
| 8 | Aplicación «no conectada al sensor»; JSON «previsto, no implementado» | Tras la Etapa 3 la página leerá JSON por USB (pendiente de probar con hardware) | p. 9 (Tabla 2), p. 12 (Tabla 9) |
| 9 | QR por lote | No está en el prompt ni en el tablero | p. 8, 9, 13 |
| 10 | DS18B20 con «**exactitud** especificada de ±0.5 °C»; advierte que resolución no es exactitud (en p. 14 usa «precisión especificada») | La tarjeta de Tecnología del prompt dice «**Precisión** nominal de ±0.5 °C» (ver pregunta P1) | p. 8, 9, 14 |

El PDF del informe se generó el 18 de noviembre de 2026 (metadatos del archivo); es anterior al montaje actual.

## 2. Otras diferencias encontradas

- **Sketch original** `KAIROS_Etapa1_LecturaSonda.ino`: mide cada 2 s con `delay(2000)` e imprime texto libre. No se modificó; el nuevo `etapa1_nodo_A_json` mide cada 5 s y emite NDJSON.
- **No están en la carpeta:** el firmware previo del Nodo B (por eso su intervalo es desconocido y la página lo mide) ni la página web servida por la placa. No se tocó nada de eso.
- **Nombre del concurso:** la convocatoria lo llama «XXIX Concurso Nacional de Prototipos y Proyectos de Emprendimiento **2027**» (p. 1–2); su rúbrica dice «2026» (p. 39). La línea del pie del prompt no lleva año en el nombre, así que no cambia. Horario: 10:00 h (p. 2).
- **Errata del prompt:** el panel de límites dice «entre ∂10 y 40 °C». Se interpreta como **−10 a 40 °C**.
- **Informe, Anexo C (p. 25):** con datos faltantes pide «marcar la estimación como incompleta». El prompt pide «Datos faltantes: N min». Decisión: se muestra lo del prompt y, si N > 0, se añade «· estimación incompleta». No cambia el cálculo.
- **Informe p. 6:** la sonda mide el aire o el entorno de la carga, no el centro del fruto. El texto del prompt («una sonda sumergible dentro de cada carga») es compatible; conviene decirlo así ante el jurado.

## 3. Datos que faltan (no se muestran en la página mientras falten)

- [ ] **Número de registro** (el informe dice «[NÚMERO DE REGISTRO POR COMPLETAR]» en todas las páginas). Va en `CONFIG`.
- [ ] Capacidad real del power bank y duración de la batería con el Nodo B encendido.
- [ ] **Chip USB-serie** de las placas (CP2102 o CH340: viene impreso en el chip junto al conector) y si la laptop de la escuela tiene su driver.
- [ ] Versión del núcleo Arduino-ESP32 y de las librerías OneWire y DallasTemperature que usa el equipo.
- [ ] MAC de la placa A (se obtiene con `firmware/00_mac_address`).
- [ ] Cifras de pérdida de alimentos para la página institucional (prohibidas hasta que el equipo las elija). Las que ya están en el informe, con fuente: 1.05 mil millones de t y 19 % (UNEP, 2024; p. 1); ~20.4 millones de t en México (Valencia-Sánchez et al., 2024; p. 1); 526 millones de t y 12 % con cifras de 2017 (DGSIAP, 2023; p. 3).
- [ ] Q10 y Lref propios de la fresa: no existen; los valores 2, 4 °C y 120 h son provisionales (informe p. 7, 18).

## 4. Riesgos sin verificar (Supuesto o No probado)

| Riesgo | Estado | Qué hacer |
| --- | --- | --- |
| Web Serial con la placa real en la laptop de la escuela (Chrome/Edge ≥ 89, driver, políticas que bloqueen el puerto serie o `file://`) | No probado | Prueba 1 de `PRUEBAS.md` **hoy o mañana**. Plan B: «Cargar captura (.jsonl)» y la demostración. |
| Abrir el puerto reinicia la placa y llegan 2–3 s de texto de arranque | Supuesto frecuente | La página lo tolera (`ESPERANDO`). Verificar en la prueba 1. |
| ESP-NOW: mismo canal en A y B, alcance e interferencia en el auditorio | No probado | Pruebas 2 y 5. |
| Firmware no compilado con el núcleo ESP32 real | No probado | Solo se compiló contra cabeceras simuladas en la PC (ver P3). |
| Pantalla de 1366×768 con Chrome y barra de tareas: unos 630 px de alto útiles | Supuesto | El Resumen se diseña para ese alto; aun así, usar **F11** el día del evento. |
| Batería de la laptop: la convocatoria pide llevar extensión si se necesita corriente (p. 35) | No verificado | Llevar extensión y cargador. |
| La versión de Chrome/Edge de la laptop puede ser antigua o administrada | No verificado | Revisar `chrome://version` en la prueba 1. |

## 5. Hallazgos de la convocatoria que afectan el día del evento

- **p. 32 (prohibido):** comida que no esté **sellada** en su empaque → fresas reales solo en su empaque cerrado. **Agua** salvo en un depósito cerrado que forme parte del aparato → no sumergir la sonda en un vaso de agua en el stand; usar la hielera con gel sellado (informe p. 10) y la mano para calentar la sonda. Hielo seco prohibido. Baterías con celdas abiertas prohibidas (un power bank comercial cerrado no lo es: Supuesto).
- **p. 35:** sin proyector ni internet; la mesa la pone el comité; llevar extensión eléctrica.
- **p. 35, inciso e):** el asesor no puede intervenir ni contestar preguntas → el equipo debe poder explicar el código.
- **p. 28–29:** el **manual de usuario es obligatorio** para todo prototipo, más manual de instalación o ensamble según el caso; si falta un elemento hay sanción. El prompt no lo pide (ver P4).
- **p. 41 (rúbrica, Criterio III):** «Demuestra el funcionamiento del prototipo y ejemplos de uso» vale 0–10, y los manuales 0–10.

## 6. Preguntas para el usuario (Etapa 1)

| # | Pregunta | Recomendación |
| --- | --- | --- |
| P1 | ¿Cambiar «Precisión nominal» por «**Exactitud** nominal» en la tarjeta de Tecnología, como dice el informe (p. 8–9)? | Sí: es el término de la hoja de datos y evita una pregunta incómoda del jurado. |
| P2 | Escenario 1 (el que se carga por defecto): cuando B llega a 0 % y A no, ¿qué dice la recomendación? | «ENTREGAR PRIMERO: CARGA B» con el motivo «Vida útil estimada de la carga B agotada: revisar su estado antes de entregarla». Sigue la regla de menor vida útil y el «prioridad de revisión/entrega» del informe (p. 18). |
| P3 | ¿Autorizas descargar `arduino-cli` y el núcleo ESP32 en una carpeta temporal (no global, fuera del repositorio, ~1 GB) para compilar los cuatro sketches en la Etapa 3? | Sí: pasar de «NO COMPILADO» a «compila» reduce el riesgo del viernes. Si la red lo bloquea, se queda en NO COMPILADO. |
| P4 | ¿El equipo ya tiene el manual de usuario obligatorio? Si no, ¿quieres un borrador `docs/MANUAL_USUARIO.md` en la Etapa 5? | Sí al borrador, solo con lo que esté verificado. |
