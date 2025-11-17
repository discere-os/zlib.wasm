/**
 * WebAssembly SIMD-Optimized Checksums for zlib
 *
 * High-performance SIMD implementations of Adler-32 and CRC-32 checksums
 * using WebAssembly SIMD128 intrinsics for 4-5x speedup over scalar code.
 *
 * Based on proven algorithms from zlib-ng and optimized for WASM SIMD128.
 */

#ifndef WEB_NATIVE_SIMD_CHECKSUMS_H
#define WEB_NATIVE_SIMD_CHECKSUMS_H

#include "zlib.h"

#ifdef __cplusplus
extern "C" {
#endif

/* SIMD-optimized Adler-32 checksum
 * Target: 4-5x speedup for buffers >= 32 bytes
 * Falls back to scalar for small buffers */
uLong simd_adler32(uLong adler, const Bytef *buf, uInt len);

/* Scalar fallback for Adler-32 (always available) */
uLong adler32_scalar(uLong adler, const Bytef *buf, uInt len);

/* SIMD-optimized CRC-32 checksum
 * Target: 3-4x speedup for buffers >= 64 bytes
 * Uses vectorized table lookups */
uLong simd_crc32(uLong crc, const Bytef *buf, uInt len);

/* Scalar fallback for CRC-32 (always available) */
uLong crc32_scalar(uLong crc, const Bytef *buf, uInt len);

/* Check if SIMD is available at runtime */
int checksums_have_simd(void);

#ifdef __cplusplus
}
#endif

#endif /* WEB_NATIVE_SIMD_CHECKSUMS_H */
