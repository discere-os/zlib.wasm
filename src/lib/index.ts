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
} from './types.ts'
import type {
  ZlibModule,
  ZlibOptions,
  ZlibResult,
  ZlibCapabilities,
  ZlibLoadingOptions,
  CompressionPerformance,
  BenchmarkResult
} from './types.ts'

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
      const wasmBinary = await this.loadWasmBinary()

      // Create module with wasmBinary
      const module = await moduleFactory({
        wasmBinary: wasmBinary
      })

      // Emscripten may return the module directly or a promise - ensure we have the initialized module
      this.module = await module

      // Verify WASM functions available
      const requiredFunctions = [
        '_zlib_compress_buffer',
        '_zlib_decompress_buffer',
        '_zlib_compress_bound',
        '_zlib_crc32',
        '_zlib_adler32',
        '_zlib_get_version'
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

      // Perform compression with output parameter API
      const level = options.level ?? ZlibCompression.DEFAULT_COMPRESSION

      // Allocate output buffer - get max compressed size
      const maxCompressedSize = this.module!._zlib_compress_bound(data.length)
      const outputPtr = this.module!._malloc(maxCompressedSize)

      // Allocate space for output length parameter
      const outputLenPtr = this.module!._malloc(4)  // unsigned long is 4 bytes in wasm32
      this.module!.setValue(outputLenPtr, maxCompressedSize, 'i32')

      // Call compression function with output parameters
      const result = this.module!._zlib_compress_buffer(
        inputPtr,
        data.length,
        outputPtr,
        outputLenPtr,
        level
      )

      // Read the actual compressed size
      const compressedSize = this.module!.getValue(outputLenPtr, 'i32')

      // Free input buffer and length pointer
      this.module!._free(inputPtr)
      this.module!._free(outputLenPtr)

      if (result !== 0) {  // Z_OK = 0
        this.module!._free(outputPtr)
        throw new ZlibCompressionError(`Compression failed with error code: ${result}`)
      }

      // Copy compressed data
      const compressedData = new Uint8Array(compressedSize)
      compressedData.set(
        this.module!.HEAPU8.subarray(outputPtr, outputPtr + compressedSize)
      )

      // Free output buffer
      this.module!._free(outputPtr)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      return {
        data: compressedData,
        originalSize: data.length,
        compressedSize: compressedSize,
        compressionRatio: data.length / compressedSize,
        processingTime,
        simdAccelerated: false  // SIMD detection to be added
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

      // Allocate output buffer - estimate 20x compressed size (zlib can achieve 10-20x compression)
      const estimatedSize = Math.max(data.length * 20, 64 * 1024)  // At least 64KB
      const outputPtr = this.module!._malloc(estimatedSize)

      // Allocate space for output length parameter
      const outputLenPtr = this.module!._malloc(4)
      this.module!.setValue(outputLenPtr, estimatedSize, 'i32')

      // Perform decompression
      const result = this.module!._zlib_decompress_buffer(
        inputPtr,
        data.length,
        outputPtr,
        outputLenPtr
      )

      // Read the actual decompressed size
      const decompressedSize = this.module!.getValue(outputLenPtr, 'i32')

      // Free input buffer and length pointer
      this.module!._free(inputPtr)
      this.module!._free(outputLenPtr)

      if (result !== 0) {  // Z_OK = 0
        this.module!._free(outputPtr)
        throw new ZlibCompressionError(`Decompression failed with error code: ${result}`)
      }

      // Copy decompressed data
      const decompressedData = new Uint8Array(decompressedSize)
      decompressedData.set(
        this.module!.HEAPU8.subarray(outputPtr, outputPtr + decompressedSize)
      )

      // Free output buffer
      this.module!._free(outputPtr)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      return {
        data: decompressedData,
        originalSize: decompressedSize,
        compressedSize: data.length,
        compressionRatio: decompressedSize / data.length,
        processingTime,
        simdAccelerated: false  // SIMD detection to be added
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

    const crc = this.module!._zlib_crc32(0, inputPtr, data.length)

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

    const adler = this.module!._zlib_adler32(0, inputPtr, data.length)

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

    // Check SIMD capabilities
    const simdSupported = this.module!._zlib_has_simd?.() ?? false

    // Get version string
    const versionPtr = this.module!._zlib_get_version?.()
    const version = versionPtr ? this.module!.UTF8ToString(versionPtr) : '1.4.2'

    return {
      simdSupported,
      simdCapabilities: simdSupported ? 'WASM SIMD128' : 'None',
      version,
      maxMemoryMB: this.loadingOptions.maxMemoryMB ?? 256,
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
    // Clean up module resources
    this.module = null
    this.initialized = false
  }

  /**
   * Load WASM module with CDN fallback logic
   */
  private async loadWASMModule(): Promise<any> {
    const fallbackUrls = this.loadingOptions.fallbackUrls || []
    const urls = [this.loadingOptions.cdnUrl, ...fallbackUrls]

    // Try local builds first
    const localJsPaths = [
      './../../install/wasm/zlib-main.js',     // Meson build
      './../../install/wasm/zlib-release.js',  // Dual build
    ]

    for (const jsPath of localJsPaths) {
      try {
        const modulePath = new URL(jsPath, import.meta.url).href
        const localModule = await import(modulePath) as any
        console.log(`✅ Loaded zlib module from: ${jsPath}`)
        return localModule.default
      } catch (error) {
        // Continue to next path
        console.log(`⚠️ Failed to load from ${jsPath}:`, (error as Error).message)
      }
    }

    // Fall back to CDN
    for (const baseUrl of urls) {
      try {
        const moduleUrl = `${baseUrl}install/wasm/zlib-release.js`
        const moduleFactory = await import(moduleUrl)
        return moduleFactory.default
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to load from ${baseUrl}: ${errorMessage}`)
      }
    }

    throw new ZlibInitError('Failed to load zlib.wasm from all sources')
  }

  private async loadWasmBinary(): Promise<ArrayBuffer> {
    // Try local build paths first (for Deno and Node.js testing)
    // @ts-ignore - Deno global may not exist in all environments
    if (typeof globalThis.Deno !== 'undefined') {
      // Deno environment - use Deno.readFile
      const localPaths = [
        './install/wasm/zlib-main.wasm',             // Meson build main module
        './install/wasm/zlib-release.wasm',          // Dual build system main module
        './install/wasm/zlib.wasm',                  // Legacy path
        './build-dual-main-release/zlib-release.wasm', // Direct build output
        './build/zlib-release.wasm'                  // Fallback location
      ]

      for (const localPath of localPaths) {
        try {
          // @ts-ignore - Deno is checked above
          const wasmBuffer = await Deno.readFile(localPath)
          console.log(`✅ Loaded zlib.wasm binary from: ${localPath}`)
          return wasmBuffer.buffer
        } catch (error) {
          console.log(`⚠️ Failed to load WASM from ${localPath}:`, (error as Error).message)
          continue
        }
      }
    }

    // @ts-ignore - process global may not exist in all environments
    if (typeof globalThis.process !== 'undefined' && globalThis.process?.versions?.node) {
      // Node.js environment
      const { readFile } = await import('fs/promises')
      const { fileURLToPath } = await import('url')
      const path = await import('path')

      const localPaths = [
        '../../../install/wasm/zlib-main.wasm',      // Meson build main module
        '../../../install/wasm/zlib-release.wasm',   // Dual build system main module
        '../../../install/wasm/zlib.wasm',           // Legacy path
        '../../../build-dual-main-release/zlib-release.wasm', // Direct build output
        '../../../build/zlib-release.wasm'           // Fallback location
      ]

      for (const localPath of localPaths) {
        try {
          // Use URL-based path resolution for Deno
          const baseUrl = new URL('.', import.meta.url)
          const wasmUrl = new URL(localPath, baseUrl)
          const wasmBuffer = await readFile(wasmUrl.pathname)
          console.log(`✅ Loaded zlib.wasm binary from: ${localPath}`)
          return new ArrayBuffer(wasmBuffer.byteLength).constructor === ArrayBuffer
            ? wasmBuffer.buffer as ArrayBuffer
            : new Uint8Array(wasmBuffer).buffer
        } catch (error) {
          console.log(`⚠️ Failed to load WASM from ${localPath}:`, (error as Error).message)
          continue
        }
      }
    }

    // Try CDN loading for production use
    const fallbackUrls = this.loadingOptions.fallbackUrls || []
    const urls = [this.loadingOptions.cdnUrl, ...fallbackUrls]

    for (const url of urls) {
      if (!url) continue
      try {
        const wasmUrl = url.endsWith('/') ? `${url}zlib.wasm` : `${url}/zlib.wasm`
        const response = await fetch(wasmUrl)
        if (response.ok) {
          console.log(`✅ Loaded zlib.wasm binary from CDN: ${url}`)
          return await response.arrayBuffer()
        }
      } catch (error) {
        console.warn(`Failed to load WASM from CDN ${url}:`, error)
        continue
      }
    }

    throw new Error('No zlib.wasm binary available. Run "deno task build:wasm" to build locally, or check CDN availability.')
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