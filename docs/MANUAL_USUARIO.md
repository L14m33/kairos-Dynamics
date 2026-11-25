# Manual de usuario · KAIROS DYNAMICS

> **BORRADOR generado por Claude (P4) para que el equipo lo revise.** Sigue los 11 elementos que pide la convocatoria para el manual de usuario (CONVOCATORIA.pdf, p. 28–29). Antes del viernes hay que pasarlo a un procesador de texto, agregar fotos reales del montaje, imprimirlo y engargolarlo con portada y contraportada transparentes (p. 29). No se inventaron datos: lo que falta va marcado con «PENDIENTE».

---

## 1. Portada

**KAIROS DYNAMICS**
Monitor de cadena de frío para fresa · Manual de usuario

Número de registro: PENDIENTE
Equipo: Liam Misael Alvarez Reyes, David Elim Duarte Cano, Alejandro Manzanera Mares y Victor Rodrigo Vazquez Orozco
CBTis No. 130 · Durango · Etapa local · 27 de noviembre de 2026
Versión del tablero: v1.0

## 2. Índice

1. Portada · 2. Índice · 3. Introducción · 4. Requisitos previos · 5. Descripción general · 6. Guía de uso · 7. Mantenimiento y actualización · 8. Solución de problemas · 9. Glosario · 10. Apéndices · 11. Datos de contacto

## 3. Introducción

KAIROS DYNAMICS mide la temperatura de dos cargas de fresa, suma el efecto de esa temperatura a lo largo del tiempo con una ecuación sencilla (modelo Q10) y sugiere qué carga conviene entregar primero.

**Importante:** es un prototipo educativo. La estimación de vida útil usa parámetros provisionales que aún no tienen validación experimental. No certifica la inocuidad ni la calidad del producto.

## 4. Requisitos previos

| Necesita | Detalle |
| --- | --- |
| Computadora | Windows, macOS o Linux con **Google Chrome o Microsoft Edge** de escritorio, versión 89 o más reciente. Firefox y Safari no permiten USB desde una página. |
| Archivo | `kairos_dashboard.html` (no necesita internet ni instalar nada). |
| Placa A | ESP-32D de 38 pines con su sonda DS18B20 y el firmware `nodo_A` (o `etapa1_nodo_A_json` para usar una sola placa). |
| Placa B (opcional) | ESP-32D con su sonda, el firmware `nodo_B` y un power bank o cargador. |
| Cables | Un cable Micro-USB **de datos** para la placa A (algunos cables solo cargan). |
| Controlador USB | El del chip USB-serie de la placa (CP210x o CH340). PENDIENTE: confirmar cuál trae la placa y si la laptop de la escuela ya lo tiene. |

**Advertencias de seguridad**

- La sonda va a **3V3**, nunca a 5V.
- No energice un montaje con cables o polaridad sin revisar.
- En el stand, no use agua abierta ni hielo seco y lleve la fresa en su empaque sellado (convocatoria, p. 32). Use la hielera con gel refrigerante sellado.
- Use un power bank comercial cerrado.

## 5. Descripción general

```text
Sonda B → Placa B ~~ ESP-NOW (sin Wi-Fi) ~~> Placa A ← Sonda A
                                               │ USB
                                      kairos_dashboard.html (Chrome/Edge)
```

- **Medición:** cada placa lee su sonda cada 5 s.
- **Envío:** la placa B manda su lectura a la A por radio (ESP-NOW). La placa A manda todo a la computadora por USB.
- **Página:** calcula el desgaste acumulado de cada carga y muestra:
  - un nivel de estado por carga: Normal, Atención, Advertencia, Crítico o Sin datos, cada uno con su color, su forma y su texto;
  - la recomendación de entrega.
- **Dos modos:** **DEMOSTRACIÓN** (datos simulados, sin hardware) y **SENSORES REALES** (datos de las placas).

Capturas sugeridas para esta sección: `docs/capturas/resumen_1366x768.png` e `inicio_1366x768.png`.

## 6. Guía de uso

### 6.1 Abrir la página

1. Abra la carpeta del proyecto.
2. Haga doble clic en `kairos_dashboard.html`. Si se abre en otro navegador, haga clic derecho, elija «Abrir con» y luego Chrome o Edge.
3. Presione **Ver Dashboard** o **Probar la plataforma**.

### 6.2 Usar la demostración (sin hardware)

1. La página siempre arranca en **DEMOSTRACIÓN**, con la insignia amarilla «DATOS SIMULADOS».
2. Elija el escenario:
   - **Escenario 1 · Contraste**: carga A en hielera y carga B al ambiente.
   - **Escenario 2 · Ejemplo del informe**: el ejemplo de la p. 18 del informe.
3. Ajuste la velocidad: 1 h simulada = 4 s, 2 s o 1 s.
4. Presione **Abrir hielera** para que el jurado vea cómo sube la temperatura de A. Presione **Cerrar hielera** para regresarla.
5. Presione **Simular falla de sonda B**. La tarjeta B pasa a «SIN LECTURA» y la recomendación a «NO SE PUEDE COMPARAR».

### 6.3 Conectar los sensores reales

1. Encienda la placa B con su power bank.
2. Conecte la placa A a la computadora con el cable de datos.
3. En la página, presione **SENSORES REALES** y luego **Conectar por USB**.
4. En la ventana del navegador, elija el puerto de la placa y presione **Conectar**. El puerto no aparece como «COM3»: aparece con el nombre del chip USB.
5. Espere unos segundos con el aviso «esperando datos del Nodo A», porque la placa suele reiniciarse al conectarla. Después aparece «USB conectado · VID:PID …».

### 6.4 Leer el Resumen

- **Tarjeta de cada carga:**
  - nombre del lote, editable con un clic;
  - aviso de nivel;
  - temperatura grande y antigüedad de la lectura;
  - vida útil estimada en % y en horas equivalentes a 4 °C;
  - barra con marcas en 20, 40 y 60 %;
  - historial de excursiones, tiempo fuera de rango y datos faltantes.
- **Recomendación de entrega:** se entrega primero la carga con menor vida útil estimada. Si la diferencia es menor de 2 puntos, dice «CARGAS SIMILARES». Si falta una lectura reciente, dice «NO SE PUEDE COMPARAR».

### 6.5 Otras vistas

| Vista | Para qué |
| --- | --- |
| Cargas | Curva de vida útil, temperaturas mínima, media y máxima, y consumo inicial E0. |
| Temperatura | Gráfica por carga y por ventana de tiempo, límites del rango (0 a 8 °C por defecto) y parámetros del modelo (provisionales). |
| Alertas | Registro de eventos con filtros por carga y por tipo. |
| Dispositivos | Estado de cada placa, paquetes perdidos, consola con las líneas que llegan y **Cargar captura** (plan B sin hardware). |
| Reportes | Descargar muestras y eventos en CSV, metadatos en JSON, imprimir el resumen y borrar datos locales. |

**Modo presentación:** tecla **P**. Agranda la letra y oculta el menú. En demostración, **Espacio** pausa y **R** reinicia.

## 7. Mantenimiento y actualización

- **Firmware:** se carga desde Arduino IDE con la placa «ESP32 Dev Module» y las librerías OneWire y DallasTemperature. Ver el apéndice B.
- **Página:** para actualizarla, se reemplaza el archivo `kairos_dashboard.html`. Los textos que el equipo puede cambiar están al inicio del código, en `CONFIG`: nombres de lote, número de registro y límites.
- **Datos:** la página guarda solo los datos reales en la propia computadora. Se borran desde **Reportes → Borrar datos locales**.
- **Sondas:** revise que el cable y la resistencia de 4.7 kΩ estén firmes. La sonda mide el aire o el entorno de la carga, no el centro de la fruta.

## 8. Solución de problemas

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| «Este navegador no permite USB» | Firefox, Safari o un Chrome muy viejo | Abra la página en Chrome o Edge actualizados. |
| El puerto no aparece en la lista | Cable que solo carga, o falta el controlador del chip USB | Pruebe otro cable e instale el controlador CP210x o CH340. |
| «No se pudo abrir el puerto USB» | El Monitor Serie de Arduino u otro programa lo está usando | Cierre ese programa y presione **Reconectar**. |
| «esperando datos del Nodo A» por más de 10 s | La placa no tiene el firmware de KAIROS o la velocidad no es 115200 | Cargue `nodo_A` (o `etapa1_nodo_A_json`) y vuelva a conectar. |
| Tarjeta «SIN LECTURA · REVISAR SONDA», falla de sonda | Sonda desconectada (−127) o sin resistencia | Revise los cables rojo (3V3), negro (GND), amarillo (GPIO4) y la resistencia de 4.7 kΩ. |
| «Nodo B sin datos» | Placa B apagada, lejos o con otra MAC configurada | Revise el power bank, acerque las placas y confirme `MAC_NODO_A` en `nodo_B`. |
| «Se perdió la conexión USB» | Cable movido o desconectado | Conecte de nuevo y presione **Reconectar**. Lo registrado se conserva. |
| No hay placas el día del evento | — | Use **DEMOSTRACIÓN** o **Dispositivos → Cargar captura**. Ambas se rotulan como no reales. |

## 9. Glosario

- **Q10:** cuántas veces más rápido se desgasta el producto si la temperatura sube 10 °C.
- **Horas equivalentes:** horas de desgaste expresadas como si la carga hubiera estado a 4 °C.
- **Vida útil estimada:** porcentaje de horas equivalentes que le quedan a la carga según el modelo (provisional).
- **E0:** desgaste que la carga ya traía antes de empezar a medir.
- **Excursión:** periodo con la temperatura fuera del rango aceptable durante al menos 2 lecturas seguidas.
- **Datos faltantes (laguna):** tramo sin lecturas que no se suma al cálculo.
- **ESP-NOW:** forma de comunicación por radio entre placas ESP32 sin Wi-Fi ni internet.
- **VID:PID:** número que identifica al chip USB de la placa.

## 10. Apéndices

**A. Cableado de cada sonda DS18B20:**
- rojo a 3V3;
- negro a GND;
- amarillo (DATA) a GPIO4;
- resistencia de 4.7 kΩ entre DATA y 3V3.

PENDIENTE: agregar una foto del montaje real.

**B. Orden de carga del firmware:**
1. Cargue `00_mac_address` en la placa A y copie la MAC que imprime.
2. Péguela en `MAC_NODO_A`, dentro de `nodo_B.ino`, y cargue ese sketch en la placa B.
3. Cargue `nodo_A` en la placa A.
4. Anote en este manual la versión del núcleo ESP32 y de las librerías que usaron.

**C. Formato de las líneas USB:** ver `docs/PROTOCOLO.md`.

**D. Manual de instalación y ensamble:** la convocatoria también lo pide según el tipo de prototipo (p. 28–29) y resta 1 punto si falta. PENDIENTE del equipo: decidir si se entrega aparte, con estos apéndices A y B como base.

## 11. Datos de contacto

PENDIENTE: el equipo debe escribir aquí el correo o los datos que autorice el plantel. No se agregaron datos personales en este borrador.
