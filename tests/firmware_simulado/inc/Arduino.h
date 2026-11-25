// Cabecera SIMULADA de Arduino para compilar en la PC (no es el núcleo ESP32).
#pragma once
#include <cstdio>
#include <cstdint>
#include <cstring>
#include <cmath>
#include "freertos_mock.h"
extern unsigned long g_millis;
inline unsigned long millis() { return g_millis; }
struct SerialMock {
  void begin(unsigned long) {}
  void print(const char* s) { fputs(s, stdout); }
  void print(char c) { fputc(c, stdout); }
  void println(const char* s) { fputs(s, stdout); fputs("\r\n", stdout); }
  void println() { fputs("\r\n", stdout); }
  void print(int v) { printf("%d", v); }
  void println(int v) { printf("%d\r\n", v); }
};
extern SerialMock Serial;
