// =====================================================================
// KAIROS DYNAMICS · 00_mac_address · versión 1.0
// ---------------------------------------------------------------------
// Para qué sirve: imprimir la dirección MAC del Nodo A. El Nodo B la
// necesita para saber a quién enviarle su temperatura por ESP-NOW.
// Se carga UNA vez en la placa A, se copia la MAC y después se carga en
// esa misma placa su firmware normal (etapa1_nodo_A_json o nodo_A).
//
// Placa:      ESP-32D de 38 pines -> en Arduino IDE: "ESP32 Dev Module"
// Núcleo:     Arduino-ESP32 2.x o 3.x (este sketch no usa ESP-NOW, así
//             que no depende de la versión). Anote aquí la que use: ______
// Librerías:  solo WiFi.h y esp_wifi.h, que vienen con el núcleo.
// Compilado:  NO (arduino-cli no está instalado en el entorno donde se
//             escribió; 2026-11-25). No se afirma que compile ni que funcione.
//
// Cableado: no necesita la sonda. Solo el cable Micro-USB de DATOS
// (algunos cables solo cargan y no transmiten datos).
//
// Uso:
//   1. Conecte la placa A a la computadora y cargue este sketch.
//   2. Abra el Monitor Serie a 115200 baudios.
//   3. Copie la línea "uint8_t MAC_NODO_A[6] = {...};" al sketch nodo_B.
//   La MAC se repite cada 3 s porque, al abrir el monitor, la placa suele
//   reiniciarse y la primera impresión se pierde.
// =====================================================================

#include <WiFi.h>
#include <esp_wifi.h>

const unsigned long PERIODO_IMPRESION_MS = 3000;  // cada cuánto se repite
unsigned long ultimaImpresionMs = 0;

// Lee la MAC de la interfaz "estación" (STA). ESP-NOW usa esta MAC
// cuando la placa está en modo WIFI_STA, que es el modo de los dos nodos.
void leerMac(uint8_t mac[6]) {
  WiFi.macAddress(mac);

  // Segunda opción: si la librería devolvió ceros (pasa en algunas
  // versiones si el Wi-Fi aún no terminó de arrancar), se pide la MAC
  // directamente al controlador Wi-Fi del ESP32.
  bool todoCeros = true;
  for (int i = 0; i < 6; i++) {
    if (mac[i] != 0) { todoCeros = false; }
  }
  if (todoCeros) {
    esp_wifi_get_mac(WIFI_IF_STA, mac);
  }
}

void setup() {
  Serial.begin(115200);
  // Modo estación: el mismo que usarán los nodos para ESP-NOW.
  // No se conecta a ninguna red ni necesita internet.
  WiFi.mode(WIFI_STA);
}

void loop() {
  // Se usa millis() en lugar de delay() para seguir el mismo estilo que
  // los sketches de medición (sin pausas largas).
  if (millis() - ultimaImpresionMs < PERIODO_IMPRESION_MS) {
    return;
  }
  ultimaImpresionMs = millis();

  uint8_t mac[6];
  leerMac(mac);

  char linea[96];
  snprintf(linea, sizeof(linea),
           "MAC del Nodo A (WiFi STA): %02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.println(linea);

  snprintf(linea, sizeof(linea),
           "Copie en nodo_B.ino: uint8_t MAC_NODO_A[6] = {0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X};",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.println(linea);
  Serial.println();
}
