/**
 * zlib.wasm SIDE_MODULE wrapper
 * Exports core zlib functions for dynamic loading by MAIN_MODULE libraries
 */

#include <zlib.h>
#include <stdlib.h>
#include <emscripten.h>

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
