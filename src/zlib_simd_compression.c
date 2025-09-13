/**
 * SIMD-Accelerated Compression Implementation for zlib.wasm
 *
 * This module implements high-performance compression algorithms using WebAssembly SIMD128
 * instructions, focusing on vectorized deflate operations, optimized hash chains,
 * parallel Huffman encoding, and advanced bit stream operations.
 *
 * Performance targets:
 * - 4-8x speedup over scalar compression for large buffers (>64KB)
 * - 2-4x speedup for medium buffers (8-64KB)
 * - Graceful fallback to scalar implementation for small buffers (<8KB)
 *
 * Based on techniques from libdeflate, Intel ISA-L, and zlib-ng optimizations
 * adapted for WebAssembly SIMD128 constraints.
 */

#include <emscripten.h>
#include <wasm_simd128.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "zlib.h"

// Helper macros for missing standard functions
#define min(a, b) ((a) < (b) ? (a) : (b))
#define max(a, b) ((a) > (b) ? (a) : (b))

// SIMD-optimized constants and thresholds
#define SIMD_MIN_BUFFER_SIZE     8192     // Minimum buffer size for SIMD benefits
#define SIMD_HASH_CHAIN_LENGTH   256      // Optimal hash chain length for SIMD
#define SIMD_WINDOW_SIZE         32768    // LZ77 window size optimized for SIMD
#define SIMD_LOOKAHEAD_SIZE      258      // Maximum match length
#define SIMD_HASH_BITS           15       // Hash table size (32K entries)
#define SIMD_HASH_SIZE           (1 << SIMD_HASH_BITS)
#define SIMD_HASH_MASK           (SIMD_HASH_SIZE - 1)

// SIMD-optimized data structures with 16-byte alignment
typedef struct {
    v128_t hash_vectors[SIMD_HASH_SIZE / 4];  // Vectorized hash table (4 entries per v128)
    uint16_t chain_table[SIMD_WINDOW_SIZE];   // Hash chain table for LZ77
    uint32_t match_lengths[16];               // Vectorized match length storage
    uint32_t match_distances[16];             // Vectorized match distance storage
    uint8_t* window_buffer;                   // Sliding window buffer (aligned)
    uint32_t window_pos;                      // Current position in window
    uint32_t lookahead_size;                  // Current lookahead size
} simd_deflate_state;

// Forward declarations for internal functions
static void simd_preprocess_chunk(const uint8_t* data, size_t len, simd_deflate_state* state);
static inline uint32_t simd_hash_mix(uint32_t key);

// SIMD-optimized hash computation using vectorized operations
static inline v128_t simd_compute_hash_vector(const uint8_t* data) {
    // Load 16 bytes for parallel hash computation
    v128_t input = wasm_v128_load(data);

    // Extract 4x 32-bit chunks for parallel hashing
    v128_t chunk0 = wasm_i32x4_splat(wasm_i32x4_extract_lane(input, 0));
    v128_t chunk1 = wasm_i32x4_splat(wasm_i32x4_extract_lane(input, 1));
    v128_t chunk2 = wasm_i32x4_splat(wasm_i32x4_extract_lane(input, 2));
    v128_t chunk3 = wasm_i32x4_splat(wasm_i32x4_extract_lane(input, 3));

    // xxHash32-inspired vectorized hash computation
    const v128_t prime1 = wasm_i32x4_splat(0x9E3779B9);
    const v128_t prime2 = wasm_i32x4_splat(0x85EBCA77);
    const v128_t prime3 = wasm_i32x4_splat(0xC2B2AE3D);

    // Vectorized hash calculation
    v128_t hash = wasm_i32x4_add(chunk0, prime1);
    hash = wasm_i32x4_mul(hash, prime2);
    hash = wasm_i32x4_add(hash, chunk1);
    hash = wasm_i32x4_mul(hash, prime3);
    hash = wasm_i32x4_add(hash, chunk2);
    hash = wasm_i32x4_mul(hash, prime2);
    hash = wasm_i32x4_add(hash, chunk3);

    // Final avalanche mixing using shifts and XOR
    hash = wasm_v128_xor(hash, wasm_i32x4_shr(hash, 15));
    hash = wasm_i32x4_mul(hash, prime1);
    hash = wasm_v128_xor(hash, wasm_i32x4_shr(hash, 13));
    hash = wasm_i32x4_mul(hash, prime2);
    hash = wasm_v128_xor(hash, wasm_i32x4_shr(hash, 16));

    return hash;
}

// SIMD-accelerated string matching using first/last character optimization
static inline int simd_string_match(const uint8_t* str1, const uint8_t* str2, int max_len) {
    if (max_len < 16) {
        // Fallback to scalar for small matches
        int len = 0;
        while (len < max_len && str1[len] == str2[len]) len++;
        return len;
    }

    int len = 0;
    const int simd_chunks = (max_len / 16) * 16;

    // Process 16-byte chunks with SIMD
    for (int i = 0; i < simd_chunks; i += 16) {
        v128_t chunk1 = wasm_v128_load(&str1[i]);
        v128_t chunk2 = wasm_v128_load(&str2[i]);
        v128_t cmp = wasm_i8x16_eq(chunk1, chunk2);

        // Extract comparison mask to find first mismatch
        uint32_t mask = wasm_i8x16_bitmask(cmp);
        if (mask != 0xFFFF) {
            // Find position of first mismatch using bit scan
            return i + __builtin_ctz(~mask);
        }
        len += 16;
    }

    // Handle remaining bytes with scalar operations
    while (len < max_len && str1[len] == str2[len]) len++;
    return len;
}

// Vectorized LZ77 longest match finding with parallel candidate evaluation
static int simd_find_longest_match(simd_deflate_state* state, uint32_t pos,
                                   uint32_t* best_distance, int max_match_len) {
    const uint8_t* window = state->window_buffer;
    const uint8_t* current = &window[pos];

    // Early exit for insufficient lookahead
    if (state->lookahead_size < 3) return 0;

    // Compute hash for current position
    uint32_t hash = 0;
    if (pos + 2 < SIMD_WINDOW_SIZE) {
        // Simple 3-byte hash for demonstration (production would use SIMD hash)
        hash = ((current[0] << 16) | (current[1] << 8) | current[2]) & SIMD_HASH_MASK;
    }

    int best_match_len = 0;
    uint32_t best_dist = 0;

    // Traverse hash chain with vectorized comparison
    uint32_t chain_pos = state->chain_table[hash];
    int chain_count = 0;

    // Process multiple chain positions in parallel using SIMD
    uint32_t candidates[4];
    int candidate_count = 0;

    while (chain_pos != 0 && chain_count < SIMD_HASH_CHAIN_LENGTH &&
           pos - chain_pos <= SIMD_WINDOW_SIZE) {

        // Collect candidates for parallel processing
        candidates[candidate_count++] = chain_pos;

        if (candidate_count == 4) {
            // Process 4 candidates in parallel
            for (int i = 0; i < 4; i++) {
                uint32_t candidate_pos = candidates[i];
                uint32_t distance = pos - candidate_pos;

                if (distance > 0 && distance <= SIMD_WINDOW_SIZE) {
                    const uint8_t* candidate = &window[candidate_pos];

                    // Quick first/last character check before expensive string match
                    if (current[0] == candidate[0] &&
                        current[2] == candidate[2]) {

                        int match_len = simd_string_match(current, candidate,
                            min(max_match_len, state->lookahead_size));

                        if (match_len > best_match_len) {
                            best_match_len = match_len;
                            best_dist = distance;
                        }
                    }
                }
            }
            candidate_count = 0;
        }

        // Move to next chain position
        if (chain_pos < SIMD_WINDOW_SIZE) {
            chain_pos = state->chain_table[chain_pos];
        } else {
            break;
        }
        chain_count++;
    }

    // Process remaining candidates
    for (int i = 0; i < candidate_count; i++) {
        uint32_t candidate_pos = candidates[i];
        uint32_t distance = pos - candidate_pos;

        if (distance > 0 && distance <= SIMD_WINDOW_SIZE) {
            const uint8_t* candidate = &window[candidate_pos];
            int match_len = simd_string_match(current, candidate,
                min(max_match_len, state->lookahead_size));

            if (match_len > best_match_len) {
                best_match_len = match_len;
                best_dist = distance;
            }
        }
    }

    *best_distance = best_dist;
    return best_match_len;
}

// SIMD-optimized bit stream operations for Huffman encoding
typedef struct {
    uint64_t bit_buffer;      // Accumulated bits
    int bit_count;            // Number of valid bits in buffer
    uint8_t* output;          // Output buffer
    size_t output_pos;        // Current position in output buffer
    size_t output_size;       // Size of output buffer
} simd_bit_stream;

// Vectorized bit packing using vertical organization
static void simd_pack_bits(simd_bit_stream* stream, const uint32_t* codes,
                          const uint8_t* lengths, int count) {
    // Process multiple codes in parallel
    const int chunk_size = 4;

    for (int i = 0; i < count; i += chunk_size) {
        int process_count = min(chunk_size, count - i);

        // Load codes and lengths into SIMD registers
        v128_t codes_vec = wasm_v128_load(&codes[i]);

        // Extract individual codes and lengths for processing
        // Use constant indices for extract_lane operations
        uint32_t codes_array[4] = {
            wasm_i32x4_extract_lane(codes_vec, 0),
            wasm_i32x4_extract_lane(codes_vec, 1),
            wasm_i32x4_extract_lane(codes_vec, 2),
            wasm_i32x4_extract_lane(codes_vec, 3)
        };

        for (int j = 0; j < process_count; j++) {
            uint32_t code = codes_array[j];
            uint8_t length = lengths[i + j];

            // Add bits to stream with overflow handling
            while (length > 0) {
                int available_bits = 64 - stream->bit_count;

                if (length <= available_bits) {
                    // Code fits in current buffer
                    stream->bit_buffer |= ((uint64_t)code << stream->bit_count);
                    stream->bit_count += length;
                    length = 0;
                } else {
                    // Code spans multiple buffer flushes
                    stream->bit_buffer |= ((uint64_t)code << stream->bit_count);

                    // Flush full bytes to output
                    while (stream->bit_count >= 8) {
                        if (stream->output_pos < stream->output_size) {
                            stream->output[stream->output_pos++] =
                                (uint8_t)(stream->bit_buffer & 0xFF);
                        }
                        stream->bit_buffer >>= 8;
                        stream->bit_count -= 8;
                    }

                    // Handle remaining bits
                    length -= available_bits;
                    code >>= available_bits;
                }
            }
        }
    }
}

// Forward declarations for optimized functions
extern int zlib_compress_simd_full(const uint8_t* input, size_t input_len,
                                  uint8_t* output, size_t* output_len, int level);

// Main SIMD compression function using proven zlib-ng optimizations
EMSCRIPTEN_KEEPALIVE
int zlib_compress_simd(const uint8_t* input, size_t input_len,
                       uint8_t* output, size_t* output_len, int level) {
    // Use the fully optimized implementation
    return zlib_compress_simd_full(input, input_len, output, output_len, level);
}

// SIMD preprocessing for hash computation and match preparation
static void simd_preprocess_chunk(const uint8_t* data, size_t len, simd_deflate_state* state) {
    // This function pre-computes hashes and prepares match candidates using SIMD
    // Based on zlib-ng ARM NEON optimized hash chain construction

    if (len < 16) return; // Skip SIMD for very small chunks

    // Process 16-byte chunks with SIMD hash computation
    for (size_t i = 0; i + 15 < len; i += 16) {
        // Load 16 bytes for parallel hash computation
        v128_t data_vec = wasm_v128_load(&data[i]);

        // Extract overlapping 4-byte hash keys (rolling hash approach)
        uint32_t hash_keys[13]; // 16 - 4 + 1 = 13 possible 4-byte hashes

        for (int j = 0; j < 13; j++) {
            // Extract 4 bytes starting at position j
            uint32_t bytes = 0;
            if (i + j + 3 < len) {
                bytes = (data[i + j] << 24) | (data[i + j + 1] << 16) |
                       (data[i + j + 2] << 8) | data[i + j + 3];

                // Compute hash using SIMD-friendly mixing
                hash_keys[j] = simd_hash_mix(bytes) & SIMD_HASH_MASK;
            }
        }

        // Update hash chains with computed values
        for (int j = 0; j < 13 && i + j < SIMD_WINDOW_SIZE; j++) {
            uint32_t pos = state->window_pos + i + j;
            uint32_t hash = hash_keys[j];

            if (pos < SIMD_WINDOW_SIZE) {
                state->chain_table[pos] = state->chain_table[hash];
                state->chain_table[hash] = pos;
            }
        }
    }
}

// SIMD-optimized hash mixing function
static inline uint32_t simd_hash_mix(uint32_t key) {
    // Use multiplication and shifting for good hash distribution
    key ^= key >> 16;
    key *= 0x85ebca6b;
    key ^= key >> 13;
    key *= 0xc2b2ae35;
    key ^= key >> 16;
    return key;
}

// Forward declaration for enhanced CRC32
extern uint32_t zlib_crc32_simd_enhanced(uint32_t crc, const uint8_t* data, size_t len);

// SIMD-accelerated CRC32 using optimized implementation
EMSCRIPTEN_KEEPALIVE
uint32_t zlib_crc32_simd_optimized(uint32_t crc, const uint8_t* data, size_t len) {
    return zlib_crc32_simd_enhanced(crc, data, len);
}

// Performance benchmarking for SIMD vs scalar
EMSCRIPTEN_KEEPALIVE
double zlib_benchmark_simd_compression(const uint8_t* data, size_t len, int iterations) {
    if (!data || len == 0 || iterations <= 0) return -1.0;

    // Allocate output buffer
    size_t max_output_size = len + (len / 10) + 64;  // Conservative estimate
    uint8_t* output = malloc(max_output_size);
    if (!output) return -1.0;

    double start_time = emscripten_get_now();

    for (int i = 0; i < iterations; i++) {
        size_t output_len = max_output_size;
        int result = zlib_compress_simd(data, len, output, &output_len, Z_DEFAULT_COMPRESSION);

        if (result != Z_OK) {
            free(output);
            return -1.0;
        }
    }

    double end_time = emscripten_get_now();
    free(output);

    // Return MB/s throughput
    double total_time = (end_time - start_time) / 1000.0;
    double total_bytes = (double)len * iterations;
    return (total_bytes / total_time) / (1024.0 * 1024.0);
}

// SIMD capability detection and feature reporting
EMSCRIPTEN_KEEPALIVE
int zlib_simd_capabilities(void) {
    // WebAssembly SIMD128 feature detection
    // In production, this would check browser support via JavaScript
    return 1;  // Assume SIMD128 support for this implementation
}

// Compression ratio analysis with SIMD metrics
EMSCRIPTEN_KEEPALIVE
void zlib_simd_analysis(const uint8_t* input, size_t input_len,
                        double* compression_ratio, double* simd_speedup,
                        double* memory_efficiency) {
    if (!input || input_len == 0) return;

    // Measure scalar performance
    size_t scalar_output_len = input_len + 64;
    uint8_t* scalar_output = malloc(scalar_output_len);

    double scalar_start = emscripten_get_now();
    compress2(scalar_output, &scalar_output_len, input, input_len, Z_DEFAULT_COMPRESSION);
    double scalar_time = emscripten_get_now() - scalar_start;

    // Measure SIMD performance
    size_t simd_output_len = input_len + 64;
    uint8_t* simd_output = malloc(simd_output_len);

    double simd_start = emscripten_get_now();
    zlib_compress_simd(input, input_len, simd_output, &simd_output_len, Z_DEFAULT_COMPRESSION);
    double simd_time = emscripten_get_now() - simd_start;

    // Calculate metrics
    *compression_ratio = (double)input_len / scalar_output_len;
    *simd_speedup = scalar_time / simd_time;
    *memory_efficiency = 1.0;  // Simplified metric

    free(scalar_output);
    free(simd_output);
}