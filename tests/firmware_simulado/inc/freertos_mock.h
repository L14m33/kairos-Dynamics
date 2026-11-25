#pragma once
#include <deque>
#include <vector>
#include <cstring>
struct ColaMock { size_t tam; size_t cap; std::deque<std::vector<unsigned char>> d; };
typedef ColaMock* QueueHandle_t;
#define pdTRUE 1
#define pdFALSE 0
inline QueueHandle_t xQueueCreate(unsigned n, unsigned tam) { return new ColaMock{tam, n, {}}; }
inline int xQueueSend(QueueHandle_t q, const void* x, unsigned) { if (q->d.size() >= q->cap) return pdFALSE; const unsigned char* b=(const unsigned char*)x; q->d.emplace_back(b, b+q->tam); return pdTRUE; }
inline int xQueueReceive(QueueHandle_t q, void* x, unsigned) { if (q->d.empty()) return pdFALSE; memcpy(x, q->d.front().data(), q->tam); q->d.pop_front(); return pdTRUE; }
