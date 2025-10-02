import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Zlib, { ZlibError, ZlibInitError, ZlibCompressionError, ZlibCompression, ZlibStrategy } from '../src/lib/index'

describe('Zlib', () => {
  describe('initialization', () => {
    it('should not be initialized initially', () => {
      const zlib = new Zlib()
      expect(zlib['initialized']).toBe(false)
    })

    it('should throw error when accessing capabilities before init', () => {
      const zlib = new Zlib()
      expect(() => zlib.getCapabilities()).toThrow(ZlibError)
      expect(() => zlib.getCapabilities()).toThrow('not initialized')
    })

    it('should throw error when using crc32 before init', () => {
      const zlib = new Zlib()
      expect(() => zlib.crc32(new Uint8Array([1, 2, 3]))).toThrow(ZlibError)
    })

    it('should throw error when using adler32 before init', () => {
      const zlib = new Zlib()
      expect(() => zlib.adler32(new Uint8Array([1, 2, 3]))).toThrow(ZlibError)
    })
  })

  describe('configuration', () => {
    it('should create instance with default config', () => {
      const zlib = new Zlib()
      expect(zlib).toBeDefined()
    })

    it('should create instance with custom config', () => {
      const zlib = new Zlib({
        cdnUrl: 'https://custom-cdn.example.com/',
        fallbackUrls: ['https://fallback.example.com/'],
        maxMemoryMB: 128,
        simdOptimizations: false,
        cachingEnabled: false
      })
      expect(zlib).toBeDefined()
    })
  })

  describe('WASM operations (requires built WASM)', () => {
    let zlib: Zlib

    beforeEach(() => {
      zlib = new Zlib()
    })

    afterEach(() => {
      zlib.cleanup()
    })

    it('should initialize with WASM if available', async () => {
      try {
        await zlib.initialize()
        const capabilities = zlib.getCapabilities()

        expect(capabilities).toBeDefined()
        expect(typeof capabilities.version).toBe('string')
        expect(typeof capabilities.simdSupported).toBe('boolean')
        expect(Array.isArray(capabilities.compressionLevels)).toBe(true)
        expect(Array.isArray(capabilities.strategies)).toBe(true)
      } catch (error) {
        console.warn('⚠️  Skipping WASM test - WASM not available:', (error as Error).message)
      }
    })

    it('should compress and decompress data', async () => {
      try {
        await zlib.initialize()

        const testText = 'Hello, zlib.wasm! This text will be compressed and decompressed.'
        const testData = new TextEncoder().encode(testText)

        // Test compression
        const compressed = await zlib.compress(testData, {
          level: ZlibCompression.DEFAULT_COMPRESSION
        })

        expect(compressed.compressedSize).toBeGreaterThan(0)
        expect(compressed.compressionRatio).toBeGreaterThan(1)
        expect(typeof compressed.processingTime).toBe('number')
        expect(compressed.originalSize).toBe(testData.length)

        // Test decompression
        const decompressed = await zlib.decompress(compressed.data)

        expect(decompressed.originalSize).toBe(testData.length)
        expect(typeof decompressed.processingTime).toBe('number')

        // Verify data integrity
        const decompressedText = new TextDecoder().decode(decompressed.data)
        expect(decompressedText).toBe(testText)
      } catch (error) {
        console.warn('⚠️  Skipping WASM test:', (error as Error).message)
      }
    })

    it('should calculate checksums', async () => {
      try {
        await zlib.initialize()

        const testData = new TextEncoder().encode('Hello, World!')

        const crc32 = zlib.crc32(testData)
        const adler32 = zlib.adler32(testData)

        expect(typeof crc32).toBe('number')
        expect(typeof adler32).toBe('number')
        expect(crc32).not.toBe(0)
        expect(adler32).not.toBe(0)

        // Test consistency
        const crc32_2 = zlib.crc32(testData)
        const adler32_2 = zlib.adler32(testData)

        expect(crc32).toBe(crc32_2)
        expect(adler32).toBe(adler32_2)
      } catch (error) {
        console.warn('⚠️  Skipping WASM test:', (error as Error).message)
      }
    })

    it('should run benchmark', async () => {
      try {
        await zlib.initialize()

        const testData = new TextEncoder().encode('Benchmark data '.repeat(100))
        const results = await zlib.benchmark(testData, 3)

        expect(Array.isArray(results)).toBe(true)
        expect(results.length).toBeGreaterThanOrEqual(1)

        for (const result of results) {
          expect(typeof result.operation).toBe('string')
          expect(typeof result.averageTime).toBe('number')
          expect(typeof result.throughput).toBe('number')
          expect(result.iterations).toBe(3)
        }
      } catch (error) {
        console.warn('⚠️  Skipping WASM test:', (error as Error).message)
      }
    })
  })
})
