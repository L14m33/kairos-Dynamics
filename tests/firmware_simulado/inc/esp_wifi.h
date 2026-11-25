#pragma once
#include "esp_err_mock.h"
#include <cstdint>
typedef enum { WIFI_IF_STA = 0, WIFI_IF_AP } wifi_interface_t;
typedef enum { WIFI_SECOND_CHAN_NONE = 0, WIFI_SECOND_CHAN_ABOVE, WIFI_SECOND_CHAN_BELOW } wifi_second_chan_t;
typedef struct { signed rssi: 8; unsigned rate: 5; } wifi_pkt_rx_ctrl_t;
extern int g_canal;
inline esp_err_t esp_wifi_set_promiscuous(bool) { return ESP_OK; }
inline esp_err_t esp_wifi_set_channel(uint8_t primary, wifi_second_chan_t) { g_canal = primary; return ESP_OK; }
inline esp_err_t esp_wifi_get_mac(wifi_interface_t, uint8_t mac[6]) { const uint8_t r[6]={0x24,0x6F,0x28,0xAA,0xBB,0xCC}; memcpy(mac,r,6); return ESP_OK; }
