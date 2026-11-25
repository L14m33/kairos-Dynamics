#include "Arduino.h"
#include "DallasTemperature.h"
unsigned long g_millis = 0; SerialMock Serial; bool g_presente = true; float g_lectura = 85.0f;
void setup(); void loop();
int main() {
  setup();
  for (g_millis = 0; g_millis <= 70000; g_millis += 10) {
    if (g_millis == 1000) g_lectura = 3.8125f;
    if (g_millis == 20000) g_presente = false;
    if (g_millis == 40000) { g_presente = true; g_lectura = 85.0f; }
    if (g_millis == 47000) g_lectura = -5.5f;
    loop();
  }
}
