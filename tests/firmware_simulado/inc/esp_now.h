// Cabecera SIMULADA para compilar en la PC. Las líneas typedef de esp_now_recv_cb_t,
// esp_now_recv_info_t y esp_now_peer_info_t se copiaron sin cambios de ESP-IDF
// (v4.4.7 y v5.5, components/esp_wifi/include/esp_now.h, licencia Apache 2.0).
#pragma once
#include "esp_wifi.h"
#include <cstring>
#define ESP_NOW_ETH_ALEN 6
#define ESP_NOW_KEY_LEN 16
typedef enum { ESP_NOW_SEND_SUCCESS = 0, ESP_NOW_SEND_FAIL } esp_now_send_status_t;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
typedef struct esp_now_recv_info {
    uint8_t * src_addr;                      /**< Source address of ESPNOW packet */
    uint8_t * des_addr;                      /**< Destination address of ESPNOW packet */
    wifi_pkt_rx_ctrl_t * rx_ctrl;            /**< Rx control info of ESPNOW packet */
} esp_now_recv_info_t;
typedef void (*esp_now_recv_cb_t)(const esp_now_recv_info_t * esp_now_info, const uint8_t *data, int data_len);
#else
typedef void (*esp_now_recv_cb_t)(const uint8_t *mac_addr, const uint8_t *data, int data_len);
#endif
typedef struct esp_now_peer_info {
    uint8_t peer_addr[ESP_NOW_ETH_ALEN];    /**< ESPNOW peer MAC address that is also the MAC address of station or softap */
    uint8_t lmk[ESP_NOW_KEY_LEN];           /**< ESPNOW peer local master key that is used to encrypt data */
    uint8_t channel;                        /**< Wi-Fi channel that peer uses to send/receive ESPNOW data. If the value is 0,
                                                 use the current channel which station or softap is on. Otherwise, it must be
                                                 set as the channel that station or softap is on. */
    wifi_interface_t ifidx;                 /**< Wi-Fi interface that peer uses to send/receive ESPNOW data */
    bool encrypt;                           /**< ESPNOW data that this peer sends/receives is encrypted or not */
    void *priv;                             /**< ESPNOW peer private data */
} esp_now_peer_info_t;
extern esp_now_recv_cb_t g_cb; extern uint8_t g_enviado[64]; extern int g_largo; extern int g_envios;
inline esp_err_t esp_now_init(void) { return ESP_OK; }
inline esp_err_t esp_now_add_peer(const esp_now_peer_info_t *peer) { return peer ? ESP_OK : -1; }
inline esp_err_t esp_now_register_recv_cb(esp_now_recv_cb_t cb) { g_cb = cb; return ESP_OK; }
inline esp_err_t esp_now_send(const uint8_t *peer_addr, const uint8_t *data, size_t len) { (void)peer_addr; memcpy(g_enviado, data, len); g_largo = (int)len; g_envios++; return ESP_OK; }
