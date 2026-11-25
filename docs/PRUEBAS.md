# Pruebas

## Plan de pruebas (lo que ejecuta Claude, sin hardware)

1. **Vectores V1–V13** del modelo en `#/autotest`, dentro de la propia página, y además con Playwright (Chromium sin interfaz) leyendo el PASS/FAIL.
2. **Cero red:** abrir `kairos_dashboard.html` desde `file://` y registrar las peticiones; solo debe aparecer el propio archivo. Cero errores y avisos en consola.
3. **Escenarios:** escenario 2 completo a 1 h = 1 s (A ≈ 78.33 %, B ≈ 88.33 %, ±0.5) y escenario 1 hasta «VIDA ÚTIL ESTIMADA AGOTADA».
4. **Falla de sonda B** en demostración: SIN LECTURA, NO SE PUEDE COMPARAR y, al reconectar, laguna y no cero.
5. **Serial simulado:** un doble de `navigator.serial` que emite 3 min de NDJSON con texto de arranque, línea partida, −127, 85.0, salto de `seq`, reinicio y B callado 30 s.
6. **Reproducción de archivo** `.jsonl` con el mismo flujo; y el firmware de la Etapa 1 compilado contra cabeceras simuladas, con su salida validada como JSON.
7. **Persistencia y CSV:** recargar (reales sí, simulados no), «Borrar datos locales», sin `localStorage`; CSV con BOM, `origen` en todas las filas y filas = muestras.
8. **Pantallas:** capturas a 1920×1080, 1366×768, 1366×633, 1024×768 y 390×844, sin desplazamiento horizontal; revisarlas a ojo.
9. **Accesibilidad y texto:** recorrido con teclado por las seis vistas; script de contraste real de cada texto; búsqueda de palabras prohibidas.
10. **Rendimiento:** 10 min de demostración a 1 h = 1 s; nodos DOM ±5 %.

**Advertencia:** ninguna prueba con `navigator.serial` simulado demuestra que funcione con la placa real. Eso solo lo dicen las pruebas de abajo.

## Pruebas con hardware (las ejecuta el equipo)

Llenar «Resultado real», «Fecha» y «Quién» al hacer cada prueba. **No inventar resultados**: si no se hizo, se deja vacío.

| # | Prueba | Resultado esperado | Resultado real | Fecha | Quién |
| --- | --- | --- | --- | --- | --- |
| 0 | Cargar `firmware/etapa1_nodo_A_json` en la placa A y abrir el Monitor Serie a 115200 | Una línea `hello` y luego una línea `reading` cada 5 s con `"ok":true` y una temperatura razonable. Anotar versión del núcleo y de las librerías | | | |
| 0b | Cargar `firmware/00_mac_address` en la placa A | Se imprime la MAC cada 3 s; copiarla a este documento: `__:__:__:__:__:__` | | | |
| 1 | En la laptop de la escuela, con Chrome o Edge: conectar la placa A | El puerto aparece en el selector de la página y llegan líneas JSON. Anotar VID:PID y versión del navegador (`chrome://version`) | | | |
| 2 | Nodo B encendido con su power bank | Llegan lecturas con `"via":"espnow"` | | | |
| 3 | Calentar la sonda B con la mano durante 1 minuto | Sube la temperatura de B y cambia la recomendación | | | |
| 4 | Desconectar la sonda B | La tarjeta B pasa a SIN LECTURA y la recomendación a NO SE PUEDE COMPARAR | | | |
| 5 | Funcionamiento continuo durante 30 minutos | Anotar paquetes perdidos, lagunas y estado de la conexión al final | | | |
| 6 | Cerrar y reabrir la página; reconectar | Los datos reales se conservan y los simulados no | | | |

Las pruebas 1 a 6 necesitan `kairos_dashboard.html` (Etapas 2 a 4); las pruebas 2 a 5, también `firmware/nodo_A` y `firmware/nodo_B` (Etapa 3). Las pruebas 0 y 0b se pueden hacer hoy.
