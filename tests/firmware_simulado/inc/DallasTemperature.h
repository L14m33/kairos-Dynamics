#pragma once
#include "OneWire.h"
#define DEVICE_DISCONNECTED_C -127
typedef uint8_t DeviceAddress[8];
// Comportamiento guionado de la sonda simulada (lo decide main.cpp).
extern bool g_presente; extern float g_lectura;
class DallasTemperature {
 public:
  explicit DallasTemperature(OneWire*) {}
  void begin() {}
  uint8_t getDeviceCount() { return g_presente ? 1 : 0; }
  bool getAddress(uint8_t* d, uint8_t) { if (!g_presente) return false; const uint8_t r[8]={0x28,0xFF,0x64,0x1E,0x8D,0x3C,0x0A,0x12}; memcpy(d,r,8); return true; }
  bool setResolution(const uint8_t*, uint8_t) { return true; }
  void setWaitForConversion(bool) {}
  void requestTemperatures() {}
  float getTempC(const uint8_t*) { return g_presente ? g_lectura : DEVICE_DISCONNECTED_C; }
};
