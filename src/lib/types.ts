/**
 * Type definitions for zlib.wasm
 * Professional, type-safe interface for high-performance compression
 */

// Core WASM module interface
export interface ZlibModule {
  // Optimized compression functions (preferred)
  _zlib_compress_optimized?(
    input: number,
    inputLen: number,
    output: number,
    outputLen: number,
    level: number
  ): number
  
  _zlib_decompress_optimized?(
    input: number,
    inputLen: number,
    output: number,
    outputLen: number
  ): number

  _zlib_compress_bound_optimized?(inputLen: number): number
  _zlib_get_version_optimized?(): number
  _zlib_crc32_optimized?(crc: number, data: number, len: number): number

  // Standard fallback functions
  _zlib_compress_buffer(
    input: number,
    inputLen: number,
    output: number,
    outputLen: number,
    level: number
  ): number
  
  _zlib_decompress_buffer(
    input: number,
    inputLen: number,
    output: number,
    outputLen: number
  ): number

  _zlib_compress_bound(inputLen: number): number
  _zlib_get_version(): number
  _zlib_crc32(crc: number, data: number, len: number): number

  // SIMD-accelerated functions (production-ready performance)
  _zlib_compress_simd(input: number, input_len: number, output: number, output_len: number, level: number): number
  _zlib_crc32_simd_optimized(crc: number, data: number, len: number): number
  _zlib_benchmark_simd_compression(data: number, len: number, iterations: number): number
  _zlib_simd_capabilities(): number
  _zlib_simd_analysis(input: number, input_len: number, compression_ratio: number, simd_speedup: number, memory_efficiency: number): void

  // Optional optimized memory management
  _zlib_init_optimized_memory?(): void
  _zlib_cleanup_optimized_memory?(): void

  // Memory management
  _malloc(size: number): number
  _free(ptr: number): void

  // Runtime interface
  HEAPU8: Uint8Array
  HEAP32: Int32Array
  HEAPF64: Float64Array
  setValue(ptr: number, value: number, type: 'i8' | 'i16' | 'i32' | 'float' | 'double'): void
  getValue(ptr: number, type: 'i8' | 'i16' | 'i32' | 'float' | 'double'): number
  UTF8ToString?(ptr: number): string
  AsciiToString?(ptr: number): string
}

// Extended navigator interface for device memory
export interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number
}

// Compression configuration
export interface CompressionOptions {
  /** Compression level (0=none, 1=fast, 6=default, 9=maximum) */
  level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  /** Strategy hint for compression algorithm */
  strategy?: 'default' | 'filtered' | 'huffman' | 'rle' | 'fixed'
}

// Compression result with performance metrics
export interface CompressionResult {
  /** Compressed data */
  compressed: Uint8Array
  /** Compression ratio (original/compressed) */
  compressionRatio: number
  /** Time taken in milliseconds */
  compressionTime: number
  /** Compression speed in KB/s */
  compressionSpeed: number
  /** Space saved as percentage */
  spaceSaved: number
  /** CRC32 checksum of original data */
  crc32: number
  /** Original data size in bytes */
  originalSize: number
  /** Compressed data size in bytes */
  compressedSize: number
}

// Decompression result with validation
export interface DecompressionResult {
  /** Decompressed data */
  decompressed: Uint8Array
  /** Time taken in milliseconds */
  decompressionTime: number
  /** Decompression speed in KB/s */
  decompressionSpeed: number
  /** Round-trip validation successful */
  isValid: boolean
  /** CRC32 checksum verification */
  crc32Valid: boolean
}

// Performance monitoring
export interface PerformanceMetrics {
  /** Number of compression operations */
  compressionOps: number
  /** Number of decompression operations */
  decompressionOps: number
  /** Average compression speed in KB/s */
  averageCompressionSpeed: number
  /** Average decompression speed in KB/s */
  averageDecompressionSpeed: number
  /** Total compression time in milliseconds */
  totalCompressionTime: number
  /** Total decompression time in milliseconds */
  totalDecompressionTime: number
  /** Whether SIMD acceleration is active */
  simdAcceleration: boolean
}

// Module initialization options
export interface InitializationOptions {
  /** Prefer optimized build with SIMD */
  preferOptimized?: boolean
  /** Enable performance monitoring */
  enableMetrics?: boolean
  /** Custom WASM module path */
  wasmPath?: string
}

// Capability detection
export interface SystemCapabilities {
  /** WebAssembly support */
  wasmSupported: boolean
  /** SIMD instruction support */
  simdSupported: boolean
  /** Memory size estimation */
  estimatedMemory: number | undefined
  /** CPU core count */
  coreCount: number | undefined
}

// Benchmark result structure
export interface BenchmarkResult {
  /** Test data characteristics */
  dataType: 'text' | 'json' | 'binary' | 'random'
  /** Input size in bytes */
  inputSize: number
  /** Results per compression level */
  results: Record<number, {
    compressionSpeed: number
    decompressionSpeed: number
    compressionRatio: number
    spaceSaved: number
    time: number
  }>
  /** Optimal configuration recommendation */
  recommendation: {
    fastestCompression: number
    bestRatio: number
    balanced: number
  }
}

// File processing result
export interface FileCompressionResult {
  /** Original filename */
  fileName: string
  /** Original file size */
  originalSize: number
  /** Compressed data */
  compressedData: Uint8Array
  /** Compression metrics */
  metrics: CompressionResult
  /** Suggested filename for compressed file */
  suggestedFilename: string
}