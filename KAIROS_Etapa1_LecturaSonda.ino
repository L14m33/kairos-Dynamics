// KAIROS DYNAMICS - Etapa 1: leer la sonda DS18B20
// Sirve para el Nodo A y para el Nodo B. Solo cambie NOMBRE_NODO antes de cargarlo.
//
// Conexion (segun el manual de ensamble):
//   Cable rojo    -> 3V3
//   Cable negro   -> GND
//   Cable amarillo (DATA) -> GPIO4, con una resistencia de 4.7 kOhm entre DATA y 3V3
//
// Librerias (Arduino IDE > Herramientas > Administrar bibliotecas):
//   "OneWire" y "DallasTemperature"
// Placa: "ESP32 Dev Module". Monitor serie a 115200 baudios.

#include <OneWire.h>
#include <DallasTemperature.h>

const char* NOMBRE_NODO = "A";   // cambie a "B" para la otra placa
const int PIN_SONDA = 4;         // GPIO4

OneWire bus(PIN_SONDA);
DallasTemperature sondas(&bus);

void setup() {
  Serial.begin(115200);
  delay(1500);
  sondas.begin();
  Serial.println();
  Serial.print("KAIROS DYNAMICS - Nodo ");
  Serial.println(NOMBRE_NODO);
  Serial.print("Sondas detectadas: ");
  Serial.println(sondas.getDeviceCount());   // debe ser 1
}

void loop() {
  sondas.requestTemperatures();
  float t = sondas.getTempCByIndex(0);

  if (t == DEVICE_DISCONNECTED_C) {
    // El valor -127 significa que no hay respuesta de la sonda.
    Serial.println("ERROR: no se lee la sonda. Revise cables y la resistencia de 4.7k.");
  } else if (t == 85.0) {
    // 85.0 es el valor con el que arranca el sensor; indica lectura fallida.
    Serial.println("AVISO: 85.0 C es el valor de arranque del sensor, no una medicion real.");
  } else {
    Serial.print("Nodo ");
    Serial.print(NOMBRE_NODO);
    Serial.print(" | Temperatura: ");
    Serial.print(t, 2);
    Serial.println(" C");
  }
  delay(2000);
}
