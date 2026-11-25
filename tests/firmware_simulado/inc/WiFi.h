#pragma once
#include "Arduino.h"
#define WIFI_STA 1
struct WiFiMock { void mode(int) {} void disconnect() {} void macAddress(uint8_t* m) { memset(m, 0, 6); } };
extern WiFiMock WiFi;
