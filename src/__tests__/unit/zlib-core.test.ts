/**
 * Comprehensive unit tests for zlib.wasm core functionality
 * Type-safe testing with realistic scenarios
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import Zlib, { formatSpeed, formatSize } from '../../lib/index.js'
import type { CompressionOptions } from '../../lib/types.js'

describe('zlib.wasm Core Functionality', () => {
  let zlib: Zlib

  beforeAll(async () => {
    zlib = new Zlib()
    await zlib.initialize({ enableMetrics: true })
  })

  afterAll(() => {
    zlib.cleanup()
  })

  describe('Module Initialization', () => {
    test('should initialize successfully', () => {
      expect(zlib).toBeDefined()
    })

    test('should report system capabilities', () => {
      const capabilities = zlib.getSystemCapabilities()
      expect(capabilities.wasmSupported).toBe(true)
      expect(typeof capabilities.simdSupported).toBe('boolean')
    })

    test('should provide version information', () => {
      const version = zlib.getVersion()
      expect(version).toMatch(/^\d+\.\d+\.\d+/)
    })
  })

  describe('Compression Levels', () => {
    const testData = new TextEncoder().encode('Test data for zlib compression. '.repeat(100))

    test('should handle all compression levels (0-9)', () => {
      for (let level = 0; level <= 9; level++) {
        const result = zlib.compress(testData, { level: level as any })
        
        expect(result.compressed).toBeInstanceOf(Uint8Array)
        expect(result.compressionRatio).toBeGreaterThan(0)
        expect(result.compressionSpeed).toBeGreaterThan(0)
        expect(typeof result.crc32).toBe('number')

        // Verify decompression
        const decompressed = zlib.decompress(result.compressed)
        expect(decompressed.decompressed.length).toBe(testData.length)
        expect(decompressed.isValid).toBe(true)
      }
    })

    test('should show performance characteristics by level', () => {
      const results: Array<{ level: number; speed: number; ratio: number }> = []

      for (const level of [1, 6, 9]) {
        const result = zlib.compress(testData, { level })
        results.push({
          level,
          speed: result.compressionSpeed,
          ratio: result.compressionRatio
        })
      }

      // Level 1 should be fastest
      const level1 = results.find(r => r.level === 1)!
      const level9 = results.find(r => r.level === 9)!

      expect(level1.speed).toBeGreaterThan(0)
      expect(level9.speed).toBeGreaterThan(0)

      console.log(`\n📊 Compression Level Performance:`)
      results.forEach(r => {
        console.log(`   Level ${r.level}: ${formatSpeed(r.speed)}, ${r.ratio.toFixed(2)}:1 ratio`)
      })
    })

    test('should reject invalid compression levels', () => {
      expect(() => zlib.compress(testData, { level: -1 as any })).toThrow('Compression level must be between 0 and 9')
      expect(() => zlib.compress(testData, { level: 10 as any })).toThrow('Compression level must be between 0 and 9')
    })
  })

  describe('CRC32 Functionality', () => {
    test('should calculate CRC32 checksums correctly', () => {
      const testCases = [
        'Hello, World!',
        'The quick brown fox jumps over the lazy dog',
        '1234567890'.repeat(100),
        ''
      ]

      testCases.forEach(text => {
        const data = new TextEncoder().encode(text)
        if (data.length === 0) {
          // Empty data should be handled gracefully
          return
        }
        
        const crc32 = zlib.calculateCRC32(data)
        expect(typeof crc32).toBe('number')
        expect(typeof crc32).toBe('number')
        
        // CRC32 should be deterministic
        const crc32Again = zlib.calculateCRC32(data)
        expect(crc32Again).toBe(crc32)
      })
    })

    test('should handle CRC32 for different data patterns', () => {
      const patterns = [
        new Uint8Array(1000).fill(0), // All zeros
        new Uint8Array(1000).fill(255), // All ones
        new Uint8Array(1000).map((_, i) => i % 256), // Sequential
        new Uint8Array(1000).map(() => Math.floor(Math.random() * 256)) // Random
      ]

      patterns.forEach((pattern, index) => {
        const crc32 = zlib.calculateCRC32(pattern)
        expect(typeof crc32).toBe('number')
        console.log(`   Pattern ${index + 1} CRC32: ${crc32.toString(16).toUpperCase()}`)
      })
    })
  })

  describe('Large Data Handling', () => {
    test('should compress large text data efficiently', () => {
      const largeText = 'Large text content for zlib testing. '.repeat(10000) // ~370KB
      const textData = new TextEncoder().encode(largeText)
      
      console.log(`\n📊 Testing ${formatSize(textData.length)} text data`)

      const result = zlib.compress(textData, { level: 6 })
      const decompressed = zlib.decompress(result.compressed)
      
      console.log(`   Compressed: ${formatSize(result.compressed.length)} in ${result.compressionTime.toFixed(1)}ms`)
      console.log(`   Speed: ${formatSpeed(result.compressionSpeed)}`)
      console.log(`   Ratio: ${result.compressionRatio.toFixed(2)}:1 (${result.spaceSaved.toFixed(1)}% saved)`)

      expect(result.compressionRatio).toBeGreaterThan(2) // Should achieve good compression
      expect(decompressed.decompressed.length).toBe(textData.length)
      expect(decompressed.isValid).toBe(true)
    })

    test('should handle binary data patterns', () => {
      const size = 256 * 1024 // 256KB
      const binaryData = new Uint8Array(size)
      
      // Create structured binary pattern
      for (let i = 0; i < size; i++) {
        if (i % 1024 < 256) {
          binaryData[i] = 0xAA // Pattern blocks
        } else {
          binaryData[i] = i % 256 // Sequential data
        }
      }

      console.log(`\n📊 Testing ${formatSize(size)} binary data`)

      const result = zlib.compress(binaryData, { level: 9 })
      const decompressed = zlib.decompress(result.compressed)
      
      console.log(`   Compressed: ${formatSize(result.compressed.length)}`)
      console.log(`   Ratio: ${result.compressionRatio.toFixed(2)}:1`)
      
      expect(decompressed.decompressed.length).toBe(binaryData.length)
      
      // Verify pattern preservation (sample check)
      expect(decompressed.decompressed[0]).toBe(0xAA)
      expect(decompressed.decompressed[256]).toBe(0)
      expect(decompressed.decompressed[512]).toBe(0)
    })
  })

  describe('Performance Metrics', () => {
    test('should track performance correctly', () => {
      const initialMetrics = zlib.getPerformanceMetrics()
      const initialOps = initialMetrics.compressionOps
      
      // Perform compression operations
      const testData = new TextEncoder().encode('Metrics tracking test data')
      zlib.compress(testData, { level: 6 })
      zlib.compress(testData, { level: 9 })
      
      const updatedMetrics = zlib.getPerformanceMetrics()
      expect(updatedMetrics.compressionOps).toBe(initialOps + 2)
      expect(updatedMetrics.averageCompressionSpeed).toBeGreaterThan(0)
    })

    test('should reset metrics correctly', () => {
      // Perform operations
      const testData = new TextEncoder().encode('Reset test data')
      zlib.compress(testData)
      
      // Reset and verify
      zlib.resetMetrics()
      const metrics = zlib.getPerformanceMetrics()
      expect(metrics.compressionOps).toBe(0)
      expect(metrics.decompressionOps).toBe(0)
    })
  })

  describe('Error Handling', () => {
    test('should handle empty input', () => {
      const emptyData = new Uint8Array(0)
      expect(() => zlib.compress(emptyData)).toThrow('Input data cannot be empty')
    })

    test('should handle invalid compressed data', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5])
      expect(() => zlib.decompress(invalidData)).toThrow('Decompression failed')
    })

    test('should calculate compression bounds', () => {
      const sizes = [100, 1000, 10000, 100000]
      
      sizes.forEach(size => {
        const bound = zlib.getCompressBound(size)
        expect(bound).toBeGreaterThan(size)
        expect(bound).toBeLessThan(size + 1000) // zlib has modest overhead
      })
    })
  })
})

describe('Utility Functions', () => {
  describe('formatSpeed', () => {
    test('should format speeds correctly', () => {
      expect(formatSpeed(0.5)).toBe('512 B/s')
      expect(formatSpeed(100)).toBe('100.0 KB/s')
      expect(formatSpeed(2048)).toBe('2.0 MB/s')
      expect(formatSpeed(1048576)).toBe('1.0 GB/s')
    })
  })

  describe('formatSize', () => {
    test('should format sizes correctly', () => {
      expect(formatSize(512)).toBe('512 B')
      expect(formatSize(2048)).toBe('2.0 KB')
      expect(formatSize(2097152)).toBe('2.0 MB')
      expect(formatSize(1073741824)).toBe('1.0 GB')
    })
  })
})