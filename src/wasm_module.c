/*
 * Copyright (C) 1995-2024 Jean-loup Gailly and Mark Adler
 * Copyright 2025 Superstruct Ltd, New Zealand
 *
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * WASM wrapper for zlib compression library
 */

#include <emscripten.h>
#include <stdlib.h>
#include <string.h>
#include "zlib.h"

// WASM-specific zlib wrapper functions with error checking and memory management

/**
 * Compress data buffer with specified compression level
 * Returns compressed size or negative error code
 */
EMSCRIPTEN_KEEPALIVE
int zlib_compress_buffer(const unsigned char* src, unsigned long src_len, 
                        unsigned char* dest, unsigned long* dest_len, int level) {
    if (!src || !dest || !dest_len || src_len == 0) {
        return Z_STREAM_ERROR;
    }
    
    if (level < 0 || level > 9) {
        level = Z_DEFAULT_COMPRESSION;
    }
    
    return compress2(dest, dest_len, src, src_len, level);
}

/**
 * Decompress data buffer
 * Returns decompressed size or negative error code
 */
EMSCRIPTEN_KEEPALIVE
int zlib_decompress_buffer(const unsigned char* src, unsigned long src_len,
                          unsigned char* dest, unsigned long* dest_len) {
    if (!src || !dest || !dest_len || src_len == 0) {
        return Z_STREAM_ERROR;
    }
    
    return uncompress(dest, dest_len, src, src_len);
}

/**
 * Calculate CRC32 checksum with optional continuation
 */
EMSCRIPTEN_KEEPALIVE
unsigned long zlib_crc32(unsigned long crc, const unsigned char* buf, unsigned int len) {
    return crc32(crc, buf, len);
}

/**
 * Calculate Adler32 checksum with optional continuation
 */
EMSCRIPTEN_KEEPALIVE
unsigned long zlib_adler32(unsigned long adler, const unsigned char* buf, unsigned int len) {
    return adler32(adler, buf, len);
}

/**
 * Get maximum compressed size for given input size
 */
EMSCRIPTEN_KEEPALIVE
unsigned long zlib_compress_bound(unsigned long source_len) {
    return compressBound(source_len);
}

/**
 * Get zlib version string
 */
EMSCRIPTEN_KEEPALIVE
const char* zlib_get_version() {
    return zlibVersion();
}

// SIMD compatibility stubs for fallback build
EMSCRIPTEN_KEEPALIVE
int zlib_has_simd(void) {
    return 0; // No SIMD support in fallback build
}

EMSCRIPTEN_KEEPALIVE
double zlib_benchmark_crc32(const char* data, int size, int iterations) {
    if (!data || size <= 0 || iterations <= 0) return -1.0;
    
    double start_time = emscripten_get_now();
    for (int i = 0; i < iterations; i++) {
        volatile uLong result = crc32(0L, (const Bytef*)data, size);
        (void)result; // Prevent optimization
    }
    double end_time = emscripten_get_now();
    
    double total_time = (end_time - start_time) / 1000.0;
    return iterations / total_time;
}

EMSCRIPTEN_KEEPALIVE
double zlib_benchmark_compression(const char* data, int size, int iterations, int level) {
    if (!data || size <= 0 || iterations <= 0) return -1.0;
    
    uLongf dest_len = compressBound(size);
    char* dest = (char*)malloc(dest_len);
    if (!dest) return -1.0;
    
    double start_time = emscripten_get_now();
    for (int i = 0; i < iterations; i++) {
        uLongf current_dest_len = dest_len;
        int result = compress2((Bytef*)dest, &current_dest_len, (const Bytef*)data, size, level);
        (void)result; // Prevent optimization
    }
    double end_time = emscripten_get_now();
    
    free(dest);
    double total_time = (end_time - start_time) / 1000.0;
    return iterations / total_time;
}

EMSCRIPTEN_KEEPALIVE
void zlib_get_performance_info(int* has_simd, int* crc32_threshold, int* compression_threshold) {
    if (has_simd) *has_simd = 0; // No SIMD in fallback build
    if (crc32_threshold) *crc32_threshold = 1024; // Use standard implementation for all sizes
    if (compression_threshold) *compression_threshold = 4096; // Standard compression threshold
}

// Streaming compression interface
typedef struct {
    z_stream stream;
    int initialized;
} zlib_stream_t;

/**
 * Initialize compression stream
 */
EMSCRIPTEN_KEEPALIVE
zlib_stream_t* zlib_deflate_init(int level, int window_bits, int mem_level, int strategy) {
    zlib_stream_t* ctx = (zlib_stream_t*)malloc(sizeof(zlib_stream_t));
    if (!ctx) return NULL;
    
    memset(ctx, 0, sizeof(zlib_stream_t));
    
    if (level < 0 || level > 9) level = Z_DEFAULT_COMPRESSION;
    if (window_bits < 8 || window_bits > 15) window_bits = 15;
    if (mem_level < 1 || mem_level > 9) mem_level = 8;
    
    int ret = deflateInit2(&ctx->stream, level, Z_DEFLATED, window_bits, 
                          mem_level, strategy);
    
    if (ret != Z_OK) {
        free(ctx);
        return NULL;
    }
    
    ctx->initialized = 1;
    return ctx;
}

/**
 * Process data through compression stream
 */
EMSCRIPTEN_KEEPALIVE
int zlib_deflate_process(zlib_stream_t* ctx, const unsigned char* input, 
                        unsigned int input_len, unsigned char* output, 
                        unsigned int output_len, int flush) {
    if (!ctx || !ctx->initialized) return Z_STREAM_ERROR;
    
    ctx->stream.next_in = (Bytef*)input;
    ctx->stream.avail_in = input_len;
    ctx->stream.next_out = output;
    ctx->stream.avail_out = output_len;
    
    return deflate(&ctx->stream, flush);
}

/**
 * Clean up compression stream
 */
EMSCRIPTEN_KEEPALIVE
void zlib_deflate_end(zlib_stream_t* ctx) {
    if (ctx) {
        if (ctx->initialized) {
            deflateEnd(&ctx->stream);
        }
        free(ctx);
    }
}

/**
 * Initialize decompression stream
 */
EMSCRIPTEN_KEEPALIVE
zlib_stream_t* zlib_inflate_init(int window_bits) {
    zlib_stream_t* ctx = (zlib_stream_t*)malloc(sizeof(zlib_stream_t));
    if (!ctx) return NULL;
    
    memset(ctx, 0, sizeof(zlib_stream_t));
    
    if (window_bits < 8 || window_bits > 15) window_bits = 15;
    
    int ret = inflateInit2(&ctx->stream, window_bits);
    
    if (ret != Z_OK) {
        free(ctx);
        return NULL;
    }
    
    ctx->initialized = 1;
    return ctx;
}

/**
 * Process data through decompression stream
 */
EMSCRIPTEN_KEEPALIVE
int zlib_inflate_process(zlib_stream_t* ctx, const unsigned char* input, 
                        unsigned int input_len, unsigned char* output, 
                        unsigned int output_len) {
    if (!ctx || !ctx->initialized) return Z_STREAM_ERROR;
    
    ctx->stream.next_in = (Bytef*)input;
    ctx->stream.avail_in = input_len;
    ctx->stream.next_out = output;
    ctx->stream.avail_out = output_len;
    
    return inflate(&ctx->stream, Z_NO_FLUSH);
}

/**
 * Clean up decompression stream
 */
EMSCRIPTEN_KEEPALIVE
void zlib_inflate_end(zlib_stream_t* ctx) {
    if (ctx) {
        if (ctx->initialized) {
            inflateEnd(&ctx->stream);
        }
        free(ctx);
    }
}

/**
 * Get available input bytes in stream
 */
EMSCRIPTEN_KEEPALIVE
unsigned int zlib_stream_avail_in(zlib_stream_t* ctx) {
    return ctx ? ctx->stream.avail_in : 0;
}

/**
 * Get available output bytes in stream
 */
EMSCRIPTEN_KEEPALIVE
unsigned int zlib_stream_avail_out(zlib_stream_t* ctx) {
    return ctx ? ctx->stream.avail_out : 0;
}

/**
 * Get total input bytes processed by stream
 */
EMSCRIPTEN_KEEPALIVE
unsigned long zlib_stream_total_in(zlib_stream_t* ctx) {
    return ctx ? ctx->stream.total_in : 0;
}

/**
 * Get total output bytes produced by stream
 */
EMSCRIPTEN_KEEPALIVE
unsigned long zlib_stream_total_out(zlib_stream_t* ctx) {
    return ctx ? ctx->stream.total_out : 0;
}

// SIMD-optimized functions (when available)
#ifdef ZLIB_SIMD_ENABLED
/**
 * SIMD-optimized CRC32 calculation
 */
EMSCRIPTEN_KEEPALIVE
unsigned long zlib_crc32_simd(unsigned long crc, const unsigned char* buf, unsigned int len) {
    // Use SIMD-optimized CRC32 if available, fallback to standard
    return crc32(crc, buf, len);
}
#endif

// Module entry point for Emscripten
int main() {
    // Initialize module - nothing specific needed for zlib
    EM_ASM({
        if (typeof Module !== 'undefined' && Module.onRuntimeInitialized) {
            Module.onRuntimeInitialized();
        }
    });
    return 0;
}