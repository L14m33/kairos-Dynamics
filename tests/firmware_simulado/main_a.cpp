#include "Arduino.h"
#include "esp_now.h"
#include "WiFi.h"
#include "DallasTemperature.h"
#include <cstdio>
unsigned long g_millis = 0; SerialMock Serial; WiFiMock WiFi; bool g_presente = true; float g_lectura = 4.0625f; int g_canal = 0;
esp_now_recv_cb_t g_cb = nullptr; uint8_t g_enviado[64]; int g_largo = 0; int g_envios = 0;
void setup(); void loop();
int main() {
  FILE* f = fopen("paquetes_b.bin", "rb");
  setup();
  for (g_millis = 0; g_millis <= 30000; g_millis += 10) {
    if (g_millis % 5000 == 300) {           // llega un paquete de B
      int largo; uint8_t buf[64];
      if (fread(&largo, sizeof(int), 1, f) == 1 && fread(buf, 1, largo, f) == (size_t)largo) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
        wifi_pkt_rx_ctrl_t rx{}; rx.rssi = -58; uint8_t src[6] = {0}; esp_now_recv_info_t info{src, nullptr, &rx};
        g_cb(&info, buf, largo);
#else
        uint8_t src[6] = {0}; g_cb(src, buf, largo);
#endif
      }
    }
    if (g_millis == 15000) { uint8_t basura[5] = {1,2,3,4,5}; 
#if ESP_ARDUINO_VERSION_MAJOR >= 3
      wifi_pkt_rx_ctrl_t rx{}; esp_now_recv_info_t info{nullptr, nullptr, &rx}; g_cb(&info, basura, 5);
#else
      g_cb(nullptr, basura, 5);
#endif
    }
    loop();
  }
  fprintf(stderr, "canal=%d\n", g_canal);
}
