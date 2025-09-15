/**
 * zlib.wasm - TypeScript-first compression library for WebAssembly
 * High-performance zlib with SIMD optimizations and dynamic dependency loading
 *
 * Based on zlib v1.4.2 with comprehensive WASM-native enhancements
 */


import {
  ZlibCompression,
  ZlibStrategy,
  ZlibError,
  ZlibMemoryError,
  ZlibCompressionError,
  ZlibInitError
} from './types.js'
import type {
  ZlibModule,
  ZlibOptions,
  ZlibResult,
  ZlibCapabilities,
  ZlibLoadingOptions,
  CompressionPerformance,
  BenchmarkResult
} from './types.js'

export default class Zlib {
  private module: ZlibModule | null = null
  private initialized = false
  private loadingOptions: ZlibLoadingOptions

  constructor(options: ZlibLoadingOptions = {}) {
    this.loadingOptions = {
      cdnUrl: 'https://cdn.discere.cloud/npm/@discere-os/zlib.wasm/',
      fallbackUrls: [
        'https://cdn.jsdelivr.net/npm/@discere-os/zlib.wasm/',
        'https://unpkg.com/@discere-os/zlib.wasm/'
      ],
      cachingEnabled: true,
      simdOptimizations: true,
      maxMemoryMB: 256,
      ...options
    }
  }

  /**
   * Initialize zlib.wasm module with SIMD optimizations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load WASM module with CDN fallback
      const moduleFactory = await this.loadWASMModule()
      this.module = await moduleFactory()

      // Verify WASM functions available
      const requiredFunctions = [
        '_zlib_compress_buffer',
        '_zlib_decompress_buffer',
        '_zlib_crc32',
        '_zlib_adler32'
      ]

      if (!this.module) {
        throw new ZlibInitError('WASM module is null after initialization')
      }

      for (const func of requiredFunctions) {
        if (typeof this.module[func] !== 'function') {
          throw new ZlibInitError(`Missing WASM function: ${func}`)
        }
      }

      this.initialized = true
      console.log('✅ zlib.wasm initialized with SIMD optimizations')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ZlibInitError(`Failed to initialize zlib.wasm: ${errorMessage}`)
    }
  }

  /**
   * Compress data with optimal settings
   */
  async compress(
    data: Uint8Array,
    options: ZlibOptions = {}
  ): Promise<ZlibResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = performance.now()

    try {
      // Allocate input buffer
      const inputPtr = this.module!._malloc(data.length)
      this.module!.HEAPU8.set(data, inputPtr)

      // Calculate maximum output buffer size
      const maxOutputSize = this.module!._zlib_compress_bound?.(data.length) ||
                            Math.ceil(data.length * 1.1) + 12

      // Allocate output buffer
      const outputPtr = this.module!._malloc(maxOutputSize)

      // Perform compression
      const result = this.module!._zlib_compress_buffer(
        inputPtr,
        data.length,
        options.level || ZlibCompression.DEFAULT_COMPRESSION,
        options.strategy || ZlibStrategy.DEFAULT_STRATEGY
      )

      if (result.size === 0) {
        throw new ZlibCompressionError('Compression failed - no output generated')
      }

      // Copy compressed data
      const compressedData = new Uint8Array(result.size)
      compressedData.set(
        this.module!.HEAPU8.subarray(result.dataPtr, result.dataPtr + result.size)
      )

      // Free memory
      this.module!._free(inputPtr)
      this.module!._free(outputPtr)
      if (result.dataPtr !== outputPtr) {
        this.module!._free(result.dataPtr)
      }

      const endTime = performance.now()
      const processingTime = endTime - startTime

      return {
        data: compressedData,
        originalSize: data.length,
        compressedSize: result.size,
        compressionRatio: data.length / result.size,
        processingTime,
        simdAccelerated: result.simdUsed
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ZlibCompressionError(`Compression failed: ${errorMessage}`)
    }
  }

  /**
   * Decompress zlib data
   */
  async decompress(data: Uint8Array): Promise<ZlibResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    const startTime = performance.now()

    try {
      // Allocate input buffer
      const inputPtr = this.module!._malloc(data.length)
      this.module!.HEAPU8.set(data, inputPtr)

      // Perform decompression
      const result = this.module!._zlib_decompress_buffer(inputPtr, data.length)

      if (result.size === 0) {
        throw new ZlibCompressionError('Decompression failed - no output generated')
      }

      // Copy decompressed data
      const decompressedData = new Uint8Array(result.size)
      decompressedData.set(
        this.module!.HEAPU8.subarray(result.dataPtr, result.dataPtr + result.size)
      )

      // Free memory
      this.module!._free(inputPtr)
      if (result.dataPtr) {
        this.module!._free(result.dataPtr)
      }

      const endTime = performance.now()
      const processingTime = endTime - startTime

      return {
        data: decompressedData,
        originalSize: result.size,
        compressedSize: data.length,
        compressionRatio: result.size / data.length,
        processingTime,
        simdAccelerated: result.simdUsed
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ZlibCompressionError(`Decompression failed: ${errorMessage}`)
    }
  }

  /**
   * Calculate CRC32 checksum
   */
  crc32(data: Uint8Array): number {
    if (!this.initialized) {
      throw new ZlibError('zlib.wasm not initialized')
    }

    const inputPtr = this.module!._malloc(data.length)
    this.module!.HEAPU8.set(data, inputPtr)

    const crc = this.module!._zlib_crc32(inputPtr, data.length)

    this.module!._free(inputPtr)
    return crc
  }

  /**
   * Calculate Adler32 checksum
   */
  adler32(data: Uint8Array): number {
    if (!this.initialized) {
      throw new ZlibError('zlib.wasm not initialized')
    }

    const inputPtr = this.module!._malloc(data.length)
    this.module!.HEAPU8.set(data, inputPtr)

    const adler = this.module!._zlib_adler32(inputPtr, data.length)

    this.module!._free(inputPtr)
    return adler
  }

  /**
   * Get SIMD capabilities and performance info
   */
  getCapabilities(): ZlibCapabilities {
    if (!this.initialized) {
      throw new ZlibError('zlib.wasm not initialized')
    }

    return {
      simdSupported: this.module!._zlib_simd_supported?.() || false,
      simdCapabilities: this.module!._zlib_simd_capabilities?.() || 'None',
      version: this.module!._zlib_get_version?.() || '1.4.2',
      maxMemoryMB: this.loadingOptions.maxMemoryMB || 256,
      compressionLevels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      strategies: Object.values(ZlibStrategy).filter(v => typeof v === 'number') as ZlibStrategy[]
    }
  }

  /**
   * Run compression performance benchmark
   */
  async benchmark(data: Uint8Array, iterations: number = 10): Promise<BenchmarkResult[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    const results: BenchmarkResult[] = []

    // Compression benchmark
    const compressStart = performance.now()
    let compressedData: Uint8Array
    let simdUsed = false

    for (let i = 0; i < iterations; i++) {
      const result = await this.compress(data)
      compressedData = result.data
      simdUsed = result.simdAccelerated
    }

    const compressEnd = performance.now()
    const compressTime = compressEnd - compressStart

    results.push({
      operation: 'compression',
      iterations,
      totalTime: compressTime,
      averageTime: compressTime / iterations,
      throughput: (data.length * iterations / 1024 / 1024) / (compressTime / 1000),
      simdAccelerated: simdUsed
    })

    // Decompression benchmark
    if (compressedData!) {
      const decompressStart = performance.now()

      for (let i = 0; i < iterations; i++) {
        const result = await this.decompress(compressedData)
        simdUsed = result.simdAccelerated
      }

      const decompressEnd = performance.now()
      const decompressTime = decompressEnd - decompressStart

      results.push({
        operation: 'decompression',
        iterations,
        totalTime: decompressTime,
        averageTime: decompressTime / iterations,
        throughput: (data.length * iterations / 1024 / 1024) / (decompressTime / 1000),
        simdAccelerated: simdUsed
      })
    }

    return results
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.module) {
      this.module!._zlib_cleanup?.()
      this.module = null
    }
    this.initialized = false
  }

  /**
   * Load WASM module with CDN fallback logic
   */
  private async loadWASMModule(): Promise<any> {
    const fallbackUrls = this.loadingOptions.fallbackUrls || []
    const urls = [this.loadingOptions.cdnUrl, ...fallbackUrls]

    for (const baseUrl of urls) {
      try {
        const moduleUrl = `${baseUrl}install/wasm/zlib-release.js`

        // Try to load from local file first (development)
        try {
          // Use dynamic import with absolute path to avoid TypeScript module resolution
          const modulePath = new URL('./../../install/wasm/zlib-release.js', import.meta.url).href
          const localModule = await import(modulePath) as any
          return localModule.default
        } catch {
          // Fall back to CDN
          const moduleFactory = await import(moduleUrl)
          return moduleFactory.default
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to load from ${baseUrl}: ${errorMessage}`)
      }
    }

    throw new ZlibInitError('Failed to load zlib.wasm from all sources')
  }
}

// Export types and classes
export {
  ZlibCompression,
  ZlibStrategy,
  ZlibError,
  ZlibMemoryError,
  ZlibCompressionError,
  ZlibInitError
}
export type {
  ZlibModule,
  ZlibOptions,
  ZlibResult,
  ZlibCapabilities,
  ZlibLoadingOptions,
  CompressionPerformance,
  BenchmarkResult
}