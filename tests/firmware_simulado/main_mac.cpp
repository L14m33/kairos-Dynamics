#include "Arduino.h"
#include "WiFi.h"
unsigned long g_millis = 0; SerialMock Serial; WiFiMock WiFi;
void setup(); void loop();
int main() { setup(); for (g_millis = 0; g_millis <= 7000; g_millis += 10) loop(); }
