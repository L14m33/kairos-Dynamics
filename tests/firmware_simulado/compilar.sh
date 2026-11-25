#!/usr/bin/env bash
# Compila los cuatro sketches con g++ contra cabeceras SIMULADAS y valida que
# lo que imprimen sea JSON. NO sustituye compilar con el núcleo ESP32 real:
# solo revisa sintaxis, tipos y las firmas de ESP-NOW (copiadas de esp_now.h
# de ESP-IDF 4.4.7 para el núcleo 2.x y de ESP-IDF 5.5 para el núcleo 3.x).
# Uso: bash tests/firmware_simulado/compilar.sh
set -euo pipefail
cd "$(dirname "$0")"
FW=../../firmware
OUT=$(mktemp -d)
CXX="g++ -std=gnu++17 -Wall -Wextra -Werror -Iinc -include Arduino.h"
$CXX -x c++ $FW/etapa1_nodo_A_json/etapa1_nodo_A_json.ino -x none main_etapa1.cpp -o $OUT/etapa1 && echo "etapa1_nodo_A_json: compila"
$CXX -include WiFi.h -include esp_wifi.h -x c++ $FW/00_mac_address/00_mac_address.ino -x none main_mac.cpp -o $OUT/mac && echo "00_mac_address: compila"
for V in 2 3; do
  $CXX -DESP_ARDUINO_VERSION_MAJOR=$V -x c++ $FW/nodo_B/nodo_B.ino -x none main_b.cpp -o $OUT/b$V && echo "nodo_B (núcleo $V.x simulado): compila"
  $CXX -DESP_ARDUINO_VERSION_MAJOR=$V -x c++ $FW/nodo_A/nodo_A.ino -x none main_a.cpp -o $OUT/a$V && echo "nodo_A (núcleo $V.x simulado): compila"
done
(cd $OUT && ./etapa1 > etapa1.txt && ./mac > mac.txt && ./b3 > b.txt 2>/dev/null && ./a3 > a3.txt 2>/dev/null && ./b2 >/dev/null 2>&1 && ./a2 > a2.txt 2>/dev/null)
python3 - "$OUT" <<'PY'
import json, sys, os
d = sys.argv[1]
for f in ['etapa1.txt', 'b.txt', 'a3.txt', 'a2.txt']:
    ls = [l for l in open(os.path.join(d, f), 'rb').read().split(b'\n') if l.strip()]
    js = [l for l in ls if l.startswith(b'{')]
    for l in js:
        json.loads(l); assert len(l) <= 240
    print(f'{f}: {len(js)} líneas JSON válidas (máx {max(len(l) for l in js)} bytes); {len(ls) - len(js)} líneas de texto')
print('RSSI con núcleo 3.x:', b'"rssi"' in open(os.path.join(d, 'a3.txt'), 'rb').read(), '· con núcleo 2.x:', b'"rssi"' in open(os.path.join(d, 'a2.txt'), 'rb').read())
PY
rm -rf "$OUT"
