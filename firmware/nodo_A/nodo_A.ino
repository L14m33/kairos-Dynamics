// =====================================================================
// KAIROS DYNAMICS · nodo_A · versión 1.0
// ---------------------------------------------------------------------
// Placa A (carga A): mide su propia sonda como etapa1_nodo_A_json y,
// además, recibe por ESP-NOW las lecturas de la placa B. Todo sale por USB
// a la laptop en NDJSON (docs/PROTOCOLO.md):
//   - hello al arrancar;
//   - reading de A (via "local") y de B (via "espnow", con rssi si el
//     núcleo lo entrega);
//   - status cada 10 s con la antigüedad del último paquete de B.
//
// Placa:      ESP-32D de 38 pines -> en Arduino IDE: "ESP32 Dev Module"
// Núcleo:     Arduino-ESP32 2.x o 3.x. La función que recibe ESP-NOW tiene
//             otra firma desde el núcleo 3.0 (ESP-IDF 5.x); se eligen con
//             #if ESP_ARDUINO_VERSION_MAJOR >= 3. Firmas comprobadas en
//             esp_now.h de ESP-IDF 4.4.7, 5.1.4, 5.3.1, 5.4 y 5.5.
//             El RSSI solo existe con el núcleo 3.x. Anote su versión: ______
// Librerías:  OneWire (versión: ______) y DallasTemperature (versión: ______)
// Compilado:  NO (arduino-cli no se pudo descargar en el entorno donde se
//             escribió; 2026-11-25). Se compiló solo contra cabeceras
//             simuladas en la PC. No se afirma que funcione en la placa.
//
// Cableado de la sonda DS18B20:
//   Cable rojo     (VCC)  -> 3V3 de la placa (NO 5V).
//   Cable negro    (GND)  -> GND.
//   Cable amarillo (DATA) -> GPIO4.
//   Resistencia de 4.7 kOhm entre DATA (amarillo) y 3V3 (rojo).
// Conexión a la laptop: cable Micro-USB de DATOS, 115200 baudios.
// =====================================================================

#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ---------------- Constantes que el equipo puede cambiar ----------------
const uint8_t CANAL_ESPNOW = 1;          // debe ser el MISMO en nodo_B
const char* NOMBRE_NODO  = "A";
const char* VERSION_FW   = "kairos-A-1.0";
const char* MODELO_PLACA = "ESP32-D";
const int   PIN_SONDA    = 4;            // GPIO4
const unsigned long INTERVALO_S = 5;     // igual en los tres sketches de medición
const unsigned long ESPERA_CONVERSION_MS = 750;
const unsigned long PERIODO_STATUS_MS = 10000;
const float VALOR_ARRANQUE_C = 85.0;

// ------------- Paquete ESP-NOW (idéntico en nodo_A y nodo_B) -------------
enum ErrorSonda : uint8_t { ERR_NINGUNO = 0, ERR_DESCONECTADA = 1, ERR_ARRANQUE_85 = 2, ERR_SIN_SONDA = 3 };
typedef struct __attribute__((packed)) {
  uint8_t  version;
  char     nodo;
  uint8_t  ok;
  uint8_t  err;
  uint8_t  tieneRom;
  uint8_t  rom[8];
  int16_t  tcCentesimas;
  uint32_t seq;
  uint32_t upMs;
} PaqueteKairos;

// Lo que la función de recepción deja en la cola para loop().
typedef struct {
  PaqueteKairos p;
  int  rssi;
  bool tieneRssi;
} Recibido;

// ------------------------------ Estado ---------------------------------
OneWire bus(PIN_SONDA);
DallasTemperature sondas(&bus);
DeviceAddress romSonda;
bool haySonda = false;
bool esperandoConversion = false;
bool primerCiclo = true;
unsigned long inicioCicloMs = 0;
unsigned long inicioConversionMs = 0;
unsigned long ultimoStatusMs = 0;
unsigned long ultimoPaqueteBMs = 0;
bool hayPaqueteB = false;
unsigned long seq = 0;
QueueHandle_t colaRecibidos = NULL;
volatile unsigned long paquetesInvalidos = 0;
char linea[256];

// ----------------------- Utilidades de la sonda ------------------------
void romATexto(const uint8_t rom[8], char* destino) {
  for (int i = 0; i < 8; i++) {
    snprintf(destino + i * 2, 3, "%02X", rom[i]);
  }
}

bool buscarSonda() {
  sondas.begin();
  if (!sondas.getAddress(romSonda, 0)) {
    return false;
  }
  sondas.setResolution(romSonda, 12);
  sondas.setWaitForConversion(false);
  return true;
}

void enviarLinea() {
  Serial.print(linea);
  Serial.print('\n');
}

const char* textoError(uint8_t error) {
  if (error == ERR_DESCONECTADA) { return "disconnected"; }
  if (error == ERR_ARRANQUE_85)  { return "power_on_85"; }
  return "no_sensor";
}

// Arma y envía un reading. nodo: "A" o "B"; via: "local" o "espnow".
// rom = NULL si no hay sonda. rssi solo se escribe si tieneRssi.
void emitirReading(const char* nodo, const uint8_t* rom, bool ok, float temperatura, uint8_t error,
                   unsigned long numSeq, unsigned long upMs, const char* via, bool tieneRssi, int rssi) {
  char textoSensor[24];
  if (rom != NULL) {
    char texto[17];
    romATexto(rom, texto);
    snprintf(textoSensor, sizeof(textoSensor), "\"%s\"", texto);
  } else {
    snprintf(textoSensor, sizeof(textoSensor), "null");
  }
  char textoRssi[16] = "";
  if (tieneRssi) {
    snprintf(textoRssi, sizeof(textoRssi), ",\"rssi\":%d", rssi);
  }
  if (ok) {
    snprintf(linea, sizeof(linea),
             "{\"v\":1,\"type\":\"reading\",\"node\":\"%s\",\"sensor\":%s,\"t_c\":%.2f,\"ok\":true,\"seq\":%lu,\"up_ms\":%lu,\"via\":\"%s\"%s}",
             nodo, textoSensor, temperatura, numSeq, upMs, via, textoRssi);
  } else {
    snprintf(linea, sizeof(linea),
             "{\"v\":1,\"type\":\"reading\",\"node\":\"%s\",\"sensor\":%s,\"t_c\":null,\"ok\":false,\"err\":\"%s\",\"seq\":%lu,\"up_ms\":%lu,\"via\":\"%s\"%s}",
             nodo, textoSensor, textoError(error), numSeq, upMs, via, textoRssi);
  }
  enviarLinea();
}

// ------------------------------ ESP-NOW --------------------------------
// Se ejecuta en la tarea del Wi-Fi, no en loop(): solo copia el paquete a
// una cola. Imprimir aquí podría mezclar líneas con las de loop().
void guardarRecibido(const uint8_t* datos, int largo, bool tieneRssi, int rssi) {
  if (largo != (int)sizeof(PaqueteKairos) || colaRecibidos == NULL) {
    paquetesInvalidos++;
    return;
  }
  Recibido r;
  memcpy(&r.p, datos, sizeof(PaqueteKairos));
  r.tieneRssi = tieneRssi;
  r.rssi = rssi;
  xQueueSend(colaRecibidos, &r, 0);   // si la cola está llena, el paquete se pierde (seq lo delata)
}

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
// Núcleo 3.x (ESP-IDF 5.x): la información del paquete incluye el RSSI.
void alRecibirEspNow(const esp_now_recv_info_t* info, const uint8_t* datos, int largo) {
  bool hay = (info != NULL && info->rx_ctrl != NULL);
  guardarRecibido(datos, largo, hay, hay ? (int)info->rx_ctrl->rssi : 0);
}
#else
// Núcleo 2.x (ESP-IDF 4.4): solo llega la MAC de origen; no hay RSSI.
void alRecibirEspNow(const uint8_t* mac, const uint8_t* datos, int largo) {
  (void)mac;
  guardarRecibido(datos, largo, false, 0);
}
#endif

void fijarCanal() {
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(CANAL_ESPNOW, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);
}

void iniciarEspNow() {
  colaRecibidos = xQueueCreate(10, sizeof(Recibido));
  WiFi.mode(WIFI_STA);      // modo estación, sin conectarse a ninguna red
  WiFi.disconnect();
  fijarCanal();
  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: no se pudo iniciar ESP-NOW");
    return;
  }
  esp_now_register_recv_cb(alRecibirEspNow);
}

// Imprime en NDJSON lo que llegó de la placa B.
void atenderRecibidos() {
  Recibido r;
  while (colaRecibidos != NULL && xQueueReceive(colaRecibidos, &r, 0) == pdTRUE) {
    if (r.p.version != 1 || r.p.nodo != 'B') {
      paquetesInvalidos++;
      continue;
    }
    hayPaqueteB = true;
    ultimoPaqueteBMs = millis();
    emitirReading("B", r.p.tieneRom ? r.p.rom : NULL, r.p.ok == 1, r.p.tcCentesimas / 100.0f, r.p.err,
                  (unsigned long)r.p.seq, (unsigned long)r.p.upMs, "espnow", r.tieneRssi, r.rssi);
  }
}

void emitirStatus() {
  if (hayPaqueteB) {
    snprintf(linea, sizeof(linea), "{\"v\":1,\"type\":\"status\",\"node\":\"A\",\"peer\":\"B\",\"peer_age_ms\":%lu}",
             (unsigned long)(millis() - ultimoPaqueteBMs));
  } else {
    snprintf(linea, sizeof(linea), "{\"v\":1,\"type\":\"status\",\"node\":\"A\",\"peer\":\"B\",\"peer_age_ms\":null}");
  }
  enviarLinea();
}

// --------------------------- Programa ----------------------------------
void setup() {
  Serial.begin(115200);
  iniciarEspNow();
  haySonda = buscarSonda();
  snprintf(linea, sizeof(linea),
           "{\"v\":1,\"type\":\"hello\",\"node\":\"%s\",\"fw\":\"%s\",\"board\":\"%s\",\"sensors\":%d}",
           NOMBRE_NODO, VERSION_FW, MODELO_PLACA, (int)sondas.getDeviceCount());
  enviarLinea();
  ultimoStatusMs = millis();
}

void medirSondaPropia(unsigned long ahora) {
  if (!esperandoConversion) {
    if (!primerCiclo && (ahora - inicioCicloMs < INTERVALO_S * 1000UL)) {
      return;
    }
    primerCiclo = false;
    inicioCicloMs = ahora;
    if (!haySonda) {
      haySonda = buscarSonda();
    }
    if (!haySonda) {
      seq++;
      emitirReading("A", NULL, false, 0, ERR_SIN_SONDA, seq, millis(), "local", false, 0);
      return;
    }
    sondas.requestTemperatures();   // regresa de inmediato: setWaitForConversion(false)
    inicioConversionMs = ahora;
    esperandoConversion = true;
    return;
  }
  if (ahora - inicioConversionMs < ESPERA_CONVERSION_MS) {
    return;
  }
  esperandoConversion = false;
  float t = sondas.getTempC(romSonda);
  seq++;
  if (t == DEVICE_DISCONNECTED_C) {
    emitirReading("A", romSonda, false, 0, ERR_DESCONECTADA, seq, millis(), "local", false, 0);
    haySonda = false;
  } else if (t == VALOR_ARRANQUE_C) {
    emitirReading("A", romSonda, false, 0, ERR_ARRANQUE_85, seq, millis(), "local", false, 0);
  } else {
    emitirReading("A", romSonda, true, t, ERR_NINGUNO, seq, millis(), "local", false, 0);
  }
}

void loop() {
  unsigned long ahora = millis();
  atenderRecibidos();
  medirSondaPropia(ahora);
  if (ahora - ultimoStatusMs >= PERIODO_STATUS_MS) {
    ultimoStatusMs = ahora;
    emitirStatus();
  }
}
