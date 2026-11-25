// =====================================================================
// KAIROS DYNAMICS · nodo_B · versión 1.0
// ---------------------------------------------------------------------
// Placa B (carga B): mide su sonda cada INTERVALO_S y envía la lectura a
// la placa A por ESP-NOW. No necesita Wi-Fi, router ni internet.
//
// Placa:      ESP-32D de 38 pines -> en Arduino IDE: "ESP32 Dev Module"
// Núcleo:     Arduino-ESP32 2.x o 3.x. Este sketch NO registra la función
//             de "envío terminado" de ESP-NOW, porque su firma cambió en
//             ESP-IDF 5.5 (núcleo 3.3). Las pérdidas se detectan en la
//             página con el contador seq. Anote aquí su versión: ______
// Librerías:  OneWire (versión: ______) y DallasTemperature (versión: ______)
// Compilado:  NO (arduino-cli no se pudo descargar en el entorno donde se
//             escribió; 2026-11-25). Se compiló solo contra cabeceras
//             simuladas en la PC, con las firmas de esp_now.h copiadas de
//             ESP-IDF 4.4.7 y 5.5. No se afirma que funcione en la placa.
//
// Cableado de la sonda DS18B20 (igual que en la placa A):
//   Cable rojo     (VCC)  -> 3V3 de la placa (NO 5V).
//   Cable negro    (GND)  -> GND.
//   Cable amarillo (DATA) -> GPIO4.
//   Resistencia de 4.7 kOhm entre DATA (amarillo) y 3V3 (rojo).
// Alimentación: cable de carga desde un power bank o cargador.
//
// ANTES DE CARGAR: copie en MAC_NODO_A la MAC que imprimió
// firmware/00_mac_address en la placa A.
//
// Si conecta esta placa B sola a la computadora, también imprime sus
// lecturas en JSON (node "B", via "local"), útil para revisar su sonda.
// =====================================================================

#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ---------------- Constantes que el equipo puede cambiar ----------------
uint8_t MAC_NODO_A[6] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00};   // <- PEGAR AQUÍ
const uint8_t CANAL_ESPNOW = 1;          // debe ser el MISMO en nodo_A
const char* NOMBRE_NODO = "B";
const int   PIN_SONDA = 4;               // GPIO4
const unsigned long INTERVALO_S = 5;     // igual en los tres sketches de medición
const unsigned long ESPERA_CONVERSION_MS = 750;   // 12 bits: hasta 750 ms
const float VALOR_ARRANQUE_C = 85.0;

// ------------- Paquete ESP-NOW (idéntico en nodo_A y nodo_B) -------------
// "packed" evita que el compilador meta bytes de relleno: así A y B leen
// los mismos bytes en el mismo orden.
enum ErrorSonda : uint8_t { ERR_NINGUNO = 0, ERR_DESCONECTADA = 1, ERR_ARRANQUE_85 = 2, ERR_SIN_SONDA = 3 };
typedef struct __attribute__((packed)) {
  uint8_t  version;        // versión del paquete: 1
  char     nodo;           // 'B'
  uint8_t  ok;             // 1 = lectura válida
  uint8_t  err;            // ErrorSonda
  uint8_t  tieneRom;       // 1 si rom[] trae la dirección de la sonda
  uint8_t  rom[8];         // dirección ROM del DS18B20
  int16_t  tcCentesimas;   // temperatura × 100 (2 decimales), solo si ok = 1
  uint32_t seq;            // sube 1 en cada lectura
  uint32_t upMs;           // millis() de la placa B
} PaqueteKairos;

// ------------------------------ Estado ---------------------------------
OneWire bus(PIN_SONDA);
DallasTemperature sondas(&bus);
DeviceAddress romSonda;
bool haySonda = false;
bool esperandoConversion = false;
bool primerCiclo = true;
bool espNowListo = false;
unsigned long inicioCicloMs = 0;
unsigned long inicioConversionMs = 0;
unsigned long seq = 0;
char linea[256];

void romATexto(const DeviceAddress rom, char* destino) {
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

// Fija el canal de radio. A y B deben estar en el mismo canal o no se oyen.
void fijarCanal() {
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(CANAL_ESPNOW, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);
}

bool macVacia() {
  for (int i = 0; i < 6; i++) {
    if (MAC_NODO_A[i] != 0) { return false; }
  }
  return true;
}

void iniciarEspNow() {
  WiFi.mode(WIFI_STA);      // modo estación, sin conectarse a ninguna red
  WiFi.disconnect();
  fijarCanal();
  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: no se pudo iniciar ESP-NOW");
    return;
  }
  esp_now_peer_info_t par;
  memset(&par, 0, sizeof(par));
  memcpy(par.peer_addr, MAC_NODO_A, 6);
  par.channel = CANAL_ESPNOW;
  par.ifidx = WIFI_IF_STA;
  par.encrypt = false;
  if (esp_now_add_peer(&par) != ESP_OK) {
    Serial.println("ERROR: no se pudo registrar la placa A como destino");
    return;
  }
  espNowListo = true;
}

// Envía el paquete a la placa A e imprime la misma lectura en JSON.
void emitirLectura(bool ok, float temperatura, uint8_t error, bool conRom) {
  seq++;
  PaqueteKairos p;
  memset(&p, 0, sizeof(p));
  p.version = 1;
  p.nodo = 'B';
  p.ok = ok ? 1 : 0;
  p.err = ok ? (uint8_t)ERR_NINGUNO : error;
  p.tieneRom = conRom ? 1 : 0;
  if (conRom) { memcpy(p.rom, romSonda, 8); }
  // Se redondea a centésimas: la misma precisión que el JSON (2 decimales).
  p.tcCentesimas = ok ? (int16_t)lroundf(temperatura * 100.0f) : 0;
  p.seq = (uint32_t)seq;
  p.upMs = (uint32_t)millis();

  if (espNowListo) {
    esp_err_t r = esp_now_send(MAC_NODO_A, (const uint8_t*)&p, sizeof(p));
    if (r != ESP_OK) {
      Serial.print("AVISO: esp_now_send devolvio el codigo ");
      Serial.println((int)r);
    }
  }

  // Copia local en NDJSON (node B, via local) por si B se conecta por USB.
  char textoSensor[24];
  if (conRom) {
    char rom[17];
    romATexto(romSonda, rom);
    snprintf(textoSensor, sizeof(textoSensor), "\"%s\"", rom);
  } else {
    snprintf(textoSensor, sizeof(textoSensor), "null");
  }
  const char* textoError = error == ERR_DESCONECTADA ? "disconnected" : (error == ERR_ARRANQUE_85 ? "power_on_85" : "no_sensor");
  if (ok) {
    snprintf(linea, sizeof(linea),
             "{\"v\":1,\"type\":\"reading\",\"node\":\"%s\",\"sensor\":%s,\"t_c\":%.2f,\"ok\":true,\"seq\":%lu,\"up_ms\":%lu,\"via\":\"local\"}",
             NOMBRE_NODO, textoSensor, p.tcCentesimas / 100.0, seq, (unsigned long)p.upMs);
  } else {
    snprintf(linea, sizeof(linea),
             "{\"v\":1,\"type\":\"reading\",\"node\":\"%s\",\"sensor\":%s,\"t_c\":null,\"ok\":false,\"err\":\"%s\",\"seq\":%lu,\"up_ms\":%lu,\"via\":\"local\"}",
             NOMBRE_NODO, textoSensor, textoError, seq, (unsigned long)p.upMs);
  }
  Serial.print(linea);
  Serial.print('\n');
}

void setup() {
  Serial.begin(115200);
  iniciarEspNow();
  if (macVacia()) {
    Serial.println("AVISO: MAC_NODO_A esta en ceros. Copie la MAC de la placa A (00_mac_address).");
  }
  haySonda = buscarSonda();
}

void loop() {
  unsigned long ahora = millis();

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
      emitirLectura(false, 0, ERR_SIN_SONDA, false);
      return;
    }
    sondas.requestTemperatures();
    inicioConversionMs = ahora;
    esperandoConversion = true;
    return;
  }

  if (ahora - inicioConversionMs < ESPERA_CONVERSION_MS) {
    return;
  }
  esperandoConversion = false;
  float t = sondas.getTempC(romSonda);
  if (t == DEVICE_DISCONNECTED_C) {
    emitirLectura(false, 0, ERR_DESCONECTADA, true);
    haySonda = false;
  } else if (t == VALOR_ARRANQUE_C) {
    emitirLectura(false, 0, ERR_ARRANQUE_85, true);
  } else {
    emitirLectura(true, t, ERR_NINGUNO, true);
  }
}
