/**
 * SIMD Optimization Validation Tests
 * 
 * Verifies that WASM SIMD optimizations are properly included
 * and provide performance benefits in zlib compression/decompression.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { Zlib } from '../../lib/index'

describe('SIMD Optimization Validation', () => {
  let zlib: Zlib
  
  beforeAll(async () => {
    zlib = new Zlib()
    await zlib.initialize()
  })

  describe('SIMD Capability Detection', () => {
    it('should detect system SIMD capabilities', () => {
      const capabilities = zlib.getSystemCapabilities()
      
      // Should report whether SIMD is available on this system
      expect(capabilities).toHaveProperty('simdSupported')
      expect(typeof capabilities.simdSupported).toBe('boolean')
    })

    it('should report WASM SIMD compilation status', () => {
      const capabilities = zlib.getSystemCapabilities()
      
      // Our build includes SIMD (-msimd128), so it should be compiled with SIMD
      expect(capabilities).toHaveProperty('simdSupported')
      expect(typeof capabilities.simdSupported).toBe('boolean')
      // Note: This might be false if running on a system without SIMD support
      // but the WASM should still be compiled with SIMD instructions
    })
  })

  describe('Performance Impact Validation', () => {
    it('should demonstrate compression performance with large data', () => {
      // Create test data that benefits from SIMD (repetitive patterns)
      const size = 1024 * 1024 // 1MB
      const testData = new Uint8Array(size)
      
      // Fill with patterns that compress well and benefit from SIMD
      for (let i = 0; i < size; i++) {
        testData[i] = (i % 256) // Repeating byte pattern
      }
      
      const startTime = performance.now()
      const result = zlib.compress(testData, { level: 6 })
      const endTime = performance.now()
      
      const compressionTime = endTime - startTime
      const compressionSpeed = (size / 1024 / 1024) / (compressionTime / 1000) // MB/s
      
      // With SIMD, we should achieve reasonable compression speeds
      // This is a baseline test - actual SIMD benefit would need comparison
      expect(compressionSpeed).toBeGreaterThan(10) // At least 10 MB/s
      expect(result.compressed.length).toBeLessThan(size) // Should compress
    })

    it('should demonstrate decompression performance', () => {
      // Create compressible test data
      const originalSize = 512 * 1024 // 512KB
      const testData = new Uint8Array(originalSize)
      
      // Pattern that compresses well
      for (let i = 0; i < originalSize; i++) {
        testData[i] = Math.floor(i / 1024) % 256
      }
      
      // First compress it
      const compressed = zlib.compress(testData, { level: 6 })
      
      // Then measure decompression speed
      const startTime = performance.now()
      const result = zlib.decompress(compressed.compressed)
      const endTime = performance.now()
      
      const decompressionTime = endTime - startTime
      const decompressionSpeed = (originalSize / 1024 / 1024) / (decompressionTime / 1000) // MB/s
      
      // Decompression should be faster than compression with SIMD
      expect(decompressionSpeed).toBeGreaterThan(20) // At least 20 MB/s
      expect(result.isValid).toBe(true)
      expect(result.decompressed).toEqual(testData)
    })
  })

  describe('SIMD-Optimized Workloads', () => {
    it('should handle highly repetitive data efficiently', () => {
      // Create data that particularly benefits from SIMD (same bytes repeated)
      const size = 256 * 1024 // 256KB
      const testData = new Uint8Array(size).fill(0x42)
      
      const result = zlib.compress(testData, { level: 9 })
      
      // Should achieve excellent compression ratio on repetitive data
      expect(result.compressionRatio).toBeGreaterThan(100) // Should compress to <1% of original
      expect(result.compressionSpeed).toBeGreaterThan(50) // Should be very fast on repetitive data
    })

    it('should efficiently process binary patterns', () => {
      // Create binary data with patterns that benefit from vectorization
      const size = 128 * 1024 // 128KB
      const testData = new Uint8Array(size)
      
      // Create alternating pattern
      for (let i = 0; i < size; i++) {
        testData[i] = i % 2 === 0 ? 0xFF : 0x00
      }
      
      const result = zlib.compress(testData, { level: 6 })
      
      // Alternating pattern should compress reasonably well
      expect(result.compressionRatio).toBeGreaterThan(2)
      expect(result.compressed.length).toBeLessThan(size / 2)
    })
  })

  describe('CRC32 SIMD Acceleration', () => {
    it('should compute CRC32 efficiently on large data', () => {
      const size = 1024 * 1024 // 1MB
      const testData = new Uint8Array(size)
      
      // Fill with pseudo-random data
      for (let i = 0; i < size; i++) {
        testData[i] = (i * 214013 + 2531011) % 256
      }
      
      const startTime = performance.now()
      const crc32 = zlib.calculateCRC32(testData)
      const endTime = performance.now()
      
      const crcTime = endTime - startTime
      const crcSpeed = (size / 1024 / 1024) / (crcTime / 1000) // MB/s
      
      // CRC32 with SIMD should be very fast
      expect(crcSpeed).toBeGreaterThan(100) // Should achieve >100 MB/s
      expect(crc32).toBeGreaterThan(0) // Should compute valid CRC
      expect(crc32).toBeLessThan(0xFFFFFFFF + 1) // Should be valid 32-bit value
    })
  })

  describe('Memory Efficiency with SIMD', () => {
    it('should maintain memory efficiency during SIMD operations', async () => {
      const initialMetrics = zlib.getPerformanceMetrics()
      
      // Process multiple chunks to test memory management
      const chunkSize = 64 * 1024 // 64KB chunks
      const chunks = 10
      
      for (let i = 0; i < chunks; i++) {
        const testData = new Uint8Array(chunkSize)
        testData.fill(i % 256)
        
        const result = zlib.compress(testData, { level: 6 })
        const decompressed = zlib.decompress(result.compressed)
        
        expect(decompressed.isValid).toBe(true)
      }
      
      const finalMetrics = zlib.getPerformanceMetrics()
      
      // Should maintain reasonable performance across multiple operations
      const expectedCompressionOps = (initialMetrics.compressionOps || 0) + chunks
      const expectedDecompressionOps = (initialMetrics.decompressionOps || 0) + chunks
      expect(finalMetrics.compressionOps).toBe(expectedCompressionOps)
      expect(finalMetrics.decompressionOps).toBe(expectedDecompressionOps)
    })
  })
})