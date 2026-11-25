// =====================================================================
// KAIROS DYNAMICS · etapa1_nodo_A_json · versión 1.0
// ---------------------------------------------------------------------
// Parte de KAIROS_Etapa1_LecturaSonda.ino (no se modificó el original).
// Diferencias con el original:
//   - Emite líneas JSON (NDJSON) según docs/PROTOCOLO.md, no texto libre.
//   - Mide cada INTERVALO_S = 5 s usando millis(), sin delay().
//   - Envía la dirección ROM de la sonda, un contador seq y up_ms.
// Sirve para probar la página con UNA sola placa (Nodo A) y sin ESP-NOW.
//
// Placa:      ESP-32D de 38 pines -> en Arduino IDE: "ESP32 Dev Module"
// Núcleo:     Arduino-ESP32 2.x o 3.x (no usa ESP-NOW ni funciones que
//             cambien entre versiones). Anote aquí la que use: ______
// Librerías:  OneWire (versión: ______) y DallasTemperature (versión: ______)
//             Arduino IDE > Herramientas > Administrar bibliotecas muestra
//             la versión instalada; anótela para el informe.
// Compilado:  NO (arduino-cli no está instalado en el entorno donde se
//             escribió; 2026-11-25). No se afirma que compile ni que funcione.
//
// Cableado de la sonda DS18B20 sumergible (3 cables):
//   Cable rojo     (VCC)  -> pin 3V3 de la placa. NO usar 5V: el GPIO del
//                            ESP32 trabaja a 3.3 V.
//   Cable negro    (GND)  -> pin GND de la placa.
//   Cable amarillo (DATA) -> GPIO4 (en la serigrafía puede decir "D4" o "4").
//   Resistencia de 4.7 kOhm entre DATA (amarillo) y 3V3 (rojo). Sin ella
//   la línea 1-Wire no vuelve a nivel alto y la sonda responde -127.
//   Verifique los colores con su proveedor: no son universales.
//
// Monitor Serie / página: 115200 baudios. Cada línea es un JSON que
// termina en '\n'. Ejemplo (inventado):
// {"v":1,"type":"reading","node":"A","sensor":"28FF641E8D3C0A12","t_c":3.81,"ok":true,"seq":12,"up_ms":60211,"via":"local"}
// =====================================================================

#include <OneWire.h>
#include <DallasTemperature.h>

// ---------------- Constantes que el equipo puede cambiar ----------------
const char* NOMBRE_NODO  = "A";                    // este sketch es para la placa A
const char* VERSION_FW   = "kairos-A-etapa1-1.0";
const char* MODELO_PLACA = "ESP32-D";
const int   PIN_SONDA    = 4;                      // GPIO4

// Intervalo de medición. Debe ser el mismo en los tres sketches de medición
// (etapa1_nodo_A_json, nodo_A y nodo_B). La página no lo supone: lo mide.
const unsigned long INTERVALO_S = 5;

// Con resolución de 12 bits la hoja de datos indica hasta 750 ms por
// conversión. Se espera ese tiempo sin bloquear el programa.
const unsigned long ESPERA_CONVERSION_MS = 750;

// 85.0 °C es el valor que el DS18B20 guarda al encenderse: si se lee,
// la conversión no terminó y no es una medición real.
const float VALOR_ARRANQUE_C = 85.0;

// ------------------------------ Estado ---------------------------------
OneWire bus(PIN_SONDA);
DallasTemperature sondas(&bus);

DeviceAddress romSonda;            // 8 bytes que identifican a la sonda
bool haySonda = false;             // ¿se encontró una sonda en el bus?
bool esperandoConversion = false;  // ¿hay una medición en curso?
bool primerCiclo = true;           // para medir de inmediato al arrancar
unsigned long inicioCicloMs = 0;
unsigned long inicioConversionMs = 0;
unsigned long seq = 0;             // sube 1 en cada lectura (válida o no)

// Búfer fijo: se evita la clase String para no fragmentar la memoria.
char linea[256];

// Convierte la ROM (8 bytes) en 16 caracteres hexadecimales en mayúsculas.
// destino debe tener espacio para 17 caracteres (16 + fin de cadena).
void romATexto(const DeviceAddress rom, char* destino) {
  for (int i = 0; i < 8; i++) {
    snprintf(destino + i * 2, 3, "%02X", rom[i]);
  }
}

// Busca la primera sonda del bus. Se llama al arrancar y cada vez que la
// sonda falla, para detectar si la reconectaron.
bool buscarSonda() {
  sondas.begin();
  if (!sondas.getAddress(romSonda, 0)) {
    return false;
  }
  sondas.setResolution(romSonda, 12);
  // No esperar la conversión: así loop() nunca se detiene 750 ms.
  sondas.setWaitForConversion(false);
  return true;
}

// Escribe la línea en el puerto serie terminada solo en '\n' (NDJSON).
void enviarLinea() {
  Serial.print(linea);
  Serial.print('\n');
}

void emitirHello() {
  snprintf(linea, sizeof(linea),
           "{\"v\":1,\"type\":\"hello\",\"node\":\"%s\",\"fw\":\"%s\",\"board\":\"%s\",\"sensors\":%d}",
           NOMBRE_NODO, VERSION_FW, MODELO_PLACA, (int)sondas.getDeviceCount());
  enviarLinea();
}

// ok = true  -> se envía t_c con 2 decimales y sin "err".
// ok = false -> t_c es null y se envía "err". Nunca un número con ok false.
// conRom indica si se conoce la dirección de la sonda (si no, sensor = null).
void emitirLectura(bool ok, float temperatura, const char* error, bool conRom) {
  seq++;
  char textoSensor[24];
  if (conRom) {
    char rom[17];
    romATexto(romSonda, rom);
    snprintf(textoSensor, sizeof(textoSensor), "\"%s\"", rom);
  } else {
    snprintf(textoSensor, sizeof(textoSensor), "null");
  }

  if (ok) {
    snprintf(linea, sizeof(linea),
             "{\"v\":1,\"type\":\"reading\",\"node\":\"%s\",\"sensor\":%s,\"t_c\":%.2f,\"ok\":true,\"seq\":%lu,\"up_ms\":%lu,\"via\":\"local\"}",
             NOMBRE_NODO, textoSensor, temperatura, seq, (unsigned long)millis());
  } else {
    snprintf(linea, sizeof(linea),
             "{\"v\":1,\"type\":\"reading\",\"node\":\"%s\",\"sensor\":%s,\"t_c\":null,\"ok\":false,\"err\":\"%s\",\"seq\":%lu,\"up_ms\":%lu,\"via\":\"local\"}",
             NOMBRE_NODO, textoSensor, error, seq, (unsigned long)millis());
  }
  enviarLinea();
}

void setup() {
  Serial.begin(115200);
  haySonda = buscarSonda();
  emitirHello();
}

void loop() {
  unsigned long ahora = millis();

  // Paso 1: ¿toca empezar una medición nueva?
  if (!esperandoConversion) {
    if (!primerCiclo && (ahora - inicioCicloMs < INTERVALO_S * 1000UL)) {
      return;  // aún no pasa el intervalo
    }
    primerCiclo = false;
    inicioCicloMs = ahora;

    if (!haySonda) {
      haySonda = buscarSonda();
    }
    if (!haySonda) {
      // No hay ninguna sonda en el bus: se avisa sin inventar temperatura.
      emitirLectura(false, 0, "no_sensor", false);
      return;
    }
    sondas.requestTemperatures();  // pide la conversión y regresa de inmediato
    inicioConversionMs = ahora;
    esperandoConversion = true;
    return;
  }

  // Paso 2: ¿ya terminó la conversión?
  if (ahora - inicioConversionMs < ESPERA_CONVERSION_MS) {
    return;
  }
  esperandoConversion = false;
  float t = sondas.getTempC(romSonda);

  if (t == DEVICE_DISCONNECTED_C) {
    // -127: la sonda no respondió (cable suelto, sin resistencia, etc.).
    emitirLectura(false, 0, "disconnected", true);
    haySonda = false;  // en el siguiente ciclo se vuelve a buscar
  } else if (t == VALOR_ARRANQUE_C) {
    emitirLectura(false, 0, "power_on_85", true);
  } else {
    emitirLectura(true, t, NULL, true);
  }
}
