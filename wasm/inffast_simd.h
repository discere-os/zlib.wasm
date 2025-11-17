/**
 * SIMD-Optimized Inflate Fast Path for zlib
 *
 * High-performance SIMD implementation of inflate_fast() for 3x+ speedup
 * using WebAssembly SIMD128 for vectorized match copying.
 */

#ifndef INFFAST_SIMD_H
#define INFFAST_SIMD_H

#include "zlib.h"
#include "inflate.h"

#ifdef __cplusplus
extern "C" {
#endif

/* SIMD-optimized inflate_fast implementation
 * Target: 3x+ speedup for decompression
 * Uses vectorized memory operations for match copying */
void ZLIB_INTERNAL inflate_fast_simd(z_streamp strm, unsigned start);

/* Check if SIMD inflate is available */
int inflate_have_simd(void);

#ifdef __cplusplus
}
#endif

#endif /* INFFAST_SIMD_H */
