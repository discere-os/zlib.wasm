/**
 * zlib.wasm SIDE_MODULE wrapper
 * Exports core zlib functions for dynamic loading by MAIN_MODULE libraries
 */

#include <zlib.h>
#include <stdlib.h>
#include <stdint.h>
#include <emscripten.h>

// Forward declarations for SIMD functions
extern int zlib_compress_simd(const uint8_t* input, size_t input_len,
                             uint8_t* output, size_t* output_len, int level);
extern uint32_t zlib_crc32_simd_optimized(uint32_t crc, const uint8_t* data, size_t len);

// Export core zlib compression functions
EMSCRIPTEN_KEEPALIVE
int zlib_compress_buffer(const unsigned char* src, unsigned long src_len, 
                        unsigned char* dest, unsigned long* dest_len, int level) {
    if (level < 0 || level > 9) level = Z_DEFAULT_COMPRESSION;
    return compress2(dest, dest_len, src, src_len, level);
}

EMSCRIPTEN_KEEPALIVE  
int zlib_decompress_buffer(const unsigned char* src, unsigned long src_len,
                          unsigned char* dest, unsigned long* dest_len) {
    return uncompress(dest, dest_len, src, src_len);
}

EMSCRIPTEN_KEEPALIVE
unsigned long zlib_compress_bound(unsigned long sourceLen) {
    return compressBound(sourceLen);
}

EMSCRIPTEN_KEEPALIVE
unsigned long zlib_crc32(unsigned long crc, const unsigned char* buf, unsigned int len) {
    return crc32(crc, buf, len);
}

EMSCRIPTEN_KEEPALIVE
unsigned long zlib_adler32(unsigned long adler, const unsigned char* buf, unsigned int len) {
    return adler32(adler, buf, len);
}

EMSCRIPTEN_KEEPALIVE
const char* zlib_get_version(void) {
    return zlibVersion();
}

EMSCRIPTEN_KEEPALIVE
int zlib_has_simd(void) {
#ifdef __wasm_simd128__
    return 1;
#else
    return 0;
#endif
}

// SIMD-accelerated compression (wrapper for external implementation)
EMSCRIPTEN_KEEPALIVE
int zlib_compress_simd_buffer(const unsigned char* src, unsigned long src_len,
                             unsigned char* dest, unsigned long* dest_len, int level) {
#ifdef __wasm_simd128__
    if (src_len >= 8192) {  // Use SIMD for large buffers
        return zlib_compress_simd(src, src_len, dest, dest_len, level);
    }
#endif
    // Fallback to standard compression for small buffers
    return compress2(dest, dest_len, src, src_len, level);
}

// SIMD-accelerated CRC32 (wrapper for external implementation)
EMSCRIPTEN_KEEPALIVE
unsigned long zlib_crc32_simd(unsigned long crc, const unsigned char* buf, unsigned int len) {
#ifdef __wasm_simd128__
    if (len >= 64) {  // Use SIMD for larger buffers
        return zlib_crc32_simd_optimized(crc, buf, len);
    }
#endif
    return crc32(crc, buf, len);
}
