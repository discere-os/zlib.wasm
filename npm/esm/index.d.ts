/**
 * zlib.wasm - TypeScript-first compression library for WebAssembly
 * High-performance zlib with SIMD optimizations and dynamic dependency loading
 *
 * Based on zlib v1.4.2 with comprehensive WASM-native enhancements
 */
import { ZlibCompression, ZlibStrategy, ZlibError, ZlibMemoryError, ZlibCompressionError, ZlibInitError } from './types.js';
import type { ZlibModule, ZlibOptions, ZlibResult, ZlibCapabilities, ZlibLoadingOptions, CompressionPerformance, BenchmarkResult } from './types.js';
export default class Zlib {
    private module;
    private initialized;
    private loadingOptions;
    constructor(options?: ZlibLoadingOptions);
    /**
     * Initialize zlib.wasm module with SIMD optimizations
     */
    initialize(): Promise<void>;
    /**
     * Compress data with optimal settings
     */
    compress(data: Uint8Array, options?: ZlibOptions): Promise<ZlibResult>;
    /**
     * Decompress zlib data
     */
    decompress(data: Uint8Array): Promise<ZlibResult>;
    /**
     * Calculate CRC32 checksum
     */
    crc32(data: Uint8Array): number;
    /**
     * Calculate Adler32 checksum
     */
    adler32(data: Uint8Array): number;
    /**
     * Get SIMD capabilities and performance info
     */
    getCapabilities(): ZlibCapabilities;
    /**
     * Run compression performance benchmark
     */
    benchmark(data: Uint8Array, iterations?: number): Promise<BenchmarkResult[]>;
    /**
     * Cleanup resources
     */
    cleanup(): void;
    /**
     * Load WASM module with CDN fallback logic
     */
    private loadWASMModule;
}
export { ZlibCompression, ZlibStrategy, ZlibError, ZlibMemoryError, ZlibCompressionError, ZlibInitError };
export type { ZlibModule, ZlibOptions, ZlibResult, ZlibCapabilities, ZlibLoadingOptions, CompressionPerformance, BenchmarkResult };
