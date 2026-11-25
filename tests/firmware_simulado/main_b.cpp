#include "Arduino.h"
#include "esp_now.h"
#include "WiFi.h"
#include "DallasTemperature.h"
#include <cstdio>
unsigned long g_millis = 0; SerialMock Serial; WiFiMock WiFi; bool g_presente = true; float g_lectura = 24.5f; int g_canal = 0;
esp_now_recv_cb_t g_cb = nullptr; uint8_t g_enviado[64]; int g_largo = 0; int g_envios = 0;
void setup(); void loop();
int main() {
  FILE* f = fopen("paquetes_b.bin", "wb");
  setup();
  int ultimos = 0;
  for (g_millis = 0; g_millis <= 30000; g_millis += 10) {
    if (g_millis == 1000) g_lectura = 24.4375f;
    if (g_millis == 12000) g_presente = false;
    if (g_millis == 22000) { g_presente = true; g_lectura = 3.8125f; }
    loop();
    if (g_envios != ultimos) { ultimos = g_envios; fwrite(&g_largo, sizeof(int), 1, f); fwrite(g_enviado, 1, g_largo, f); }
  }
  fclose(f);
  fprintf(stderr, "canal=%d envios=%d largo=%d\n", g_canal, g_envios, g_largo);
}
