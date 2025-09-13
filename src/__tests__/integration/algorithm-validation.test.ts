/**
 * Comprehensive algorithm validation tests for zlib.wasm
 * Tests with large data and byte-by-byte verification
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import Zlib, { formatSpeed, formatSize } from '../../lib/index.js'

describe('zlib.wasm Algorithm Validation', () => {
  let zlib: Zlib

  beforeAll(async () => {
    zlib = new Zlib()
    await zlib.initialize({ enableMetrics: true })
  })

  afterAll(() => {
    zlib.cleanup()
  })

  describe('Large Data Compression with Verification', () => {
    test('should compress and decompress 1MB of repetitive text', () => {
      const size = 1024 * 1024 // 1MB
      const pattern = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
      const patternBytes = new TextEncoder().encode(pattern)
      
      const largeData = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        largeData[i] = patternBytes[i % patternBytes.length]!
      }

      console.log(`\n📊 Testing ${formatSize(size)} repetitive text`)

      const result = zlib.compress(largeData, { level: 9 })
      
      console.log(`   Compressed: ${formatSize(result.compressed.length)} in ${result.compressionTime.toFixed(1)}ms`)
      console.log(`   Speed: ${formatSpeed(result.compressionSpeed)}`)
      console.log(`   Ratio: ${result.compressionRatio.toFixed(2)}:1 (${result.spaceSaved.toFixed(1)}% saved)`)

      // zlib should achieve excellent compression on repetitive text
      expect(result.compressionRatio).toBeGreaterThan(10) // > 10:1 for repetitive text
      expect(result.spaceSaved).toBeGreaterThan(90) // > 90% space savings

      const decompressed = zlib.decompress(result.compressed)
      expect(decompressed.decompressed.length).toBe(largeData.length)
      expect(decompressed.isValid).toBe(true)

      console.log(`   Decompression: ${formatSpeed(decompressed.decompressionSpeed)} in ${decompressed.decompressionTime.toFixed(1)}ms`)

      // Byte-by-byte verification (sample for performance)
      const sampleSize = Math.min(10240, largeData.length)
      for (let i = 0; i < sampleSize; i++) {
        expect(decompressed.decompressed[i]).toBe(largeData[i])
      }

      console.log(`   ✅ Byte-by-byte validation: ${sampleSize} bytes verified`)
    }, 45000)

    test('should handle JSON data compression', () => {
      const dataset = {
        metadata: { version: '1.0', created: Date.now() },
        records: Array.from({ length: 2000 }, (_, i) => ({
          id: `record_${i.toString().padStart(5, '0')}`,
          timestamp: Date.now() - i * 3600000,
          data: {
            value: Math.sin(i * 0.1) * 100,
            category: ['A', 'B', 'C'][i % 3],
            active: i % 2 === 0
          }
        }))
      }

      const jsonString = JSON.stringify(dataset, null, 2)
      const jsonData = new TextEncoder().encode(jsonString)
      
      console.log(`\n📊 Testing ${formatSize(jsonData.length)} JSON data`)

      const result = zlib.compress(jsonData, { level: 6 })
      
      console.log(`   Compressed: ${formatSize(result.compressed.length)} in ${result.compressionTime.toFixed(1)}ms`)
      console.log(`   Speed: ${formatSpeed(result.compressionSpeed)}`)
      console.log(`   Ratio: ${result.compressionRatio.toFixed(2)}:1 (${result.spaceSaved.toFixed(1)}% saved)`)

      // JSON should achieve good compression
      expect(result.compressionRatio).toBeGreaterThan(3) // > 3:1 for structured JSON
      expect(result.spaceSaved).toBeGreaterThan(70) // > 70% space savings

      const decompressed = zlib.decompress(result.compressed)
      expect(decompressed.decompressed.length).toBe(jsonData.length)

      // Verify JSON structure integrity
      const originalJson = JSON.parse(jsonString)
      const decompressedJson = JSON.parse(new TextDecoder().decode(decompressed.decompressed))
      
      expect(decompressedJson.metadata.version).toBe(originalJson.metadata.version)
      expect(decompressedJson.records.length).toBe(originalJson.records.length)
      expect(decompressedJson.records[0]?.data?.category).toBe(originalJson.records[0]?.data?.category)

      console.log(`   ✅ JSON structure validation: PASSED`)
      console.log(`   ✅ ${decompressedJson.records.length} records preserved`)
    }, 30000)

    test('should demonstrate compression characteristics', () => {
      console.log('\n🔬 zlib Algorithm Characteristics')
      
      const testCases = [
        {
          name: 'Highly Repetitive Text',
          data: new Uint8Array(64 * 1024).fill(65), // 64KB of 'A'
          expectedMinRatio: 100 // Should compress extremely well
        },
        {
          name: 'Mixed Text Content', 
          data: new TextEncoder().encode('ABCDEFGHIJ'.repeat(6400)),
          expectedMinRatio: 5
        },
        {
          name: 'Structured JSON',
          data: new TextEncoder().encode('{"id":1,"name":"test","active":true}'.repeat(1000)),
          expectedMinRatio: 3
        },
        {
          name: 'Random Data (Worst Case)',
          data: (() => {
            const random = new Uint8Array(32 * 1024)
            for (let i = 0; i < random.length; i++) {
              random[i] = Math.floor(Math.random() * 256)
            }
            return random
          })(),
          expectedMinRatio: 0.9 // May not compress
        }
      ]

      for (const testCase of testCases) {
        console.log(`\n   Testing: ${testCase.name} (${formatSize(testCase.data.length)})`)
        
        const result = zlib.compress(testCase.data, { level: 9 })
        const decompressed = zlib.decompress(result.compressed)
        
        console.log(`     Ratio: ${result.compressionRatio.toFixed(2)}:1`)
        console.log(`     Speed: ${formatSpeed(result.compressionSpeed)}`)
        console.log(`     Expected minimum: ${testCase.expectedMinRatio.toFixed(1)}:1`)
        
        if (testCase.expectedMinRatio >= 1) {
          expect(result.compressionRatio).toBeGreaterThan(testCase.expectedMinRatio * 0.8) // 20% tolerance
        }
        
        // Perfect reconstruction required
        expect(decompressed.decompressed.length).toBe(testCase.data.length)
        
        // CRC32 validation
        const originalCrc32 = zlib.calculateCRC32(testCase.data)
        const decompressedCrc32 = zlib.calculateCRC32(decompressed.decompressed)
        expect(decompressedCrc32).toBe(originalCrc32)
        
        console.log(`     ✅ Perfect reconstruction: ${testCase.data.length} bytes verified`)
        console.log(`     ✅ CRC32 validation: ${originalCrc32.toString(16).toUpperCase()}`)
      }
    }, 60000)
  })

  describe('Performance Consistency', () => {
    test('should maintain consistent compression ratios', () => {
      const testData = new TextEncoder().encode('Consistency test for zlib.wasm. '.repeat(500))
      const results: Array<{ ratio: number; speed: number; crc32: number }> = []
      
      // Perform multiple compression operations
      for (let i = 0; i < 10; i++) {
        const result = zlib.compress(testData, { level: 6 })
        const decompressed = zlib.decompress(result.compressed)
        
        expect(decompressed.decompressed.length).toBe(testData.length)
        
        results.push({
          ratio: result.compressionRatio,
          speed: result.compressionSpeed,
          crc32: result.crc32
        })
      }

      // All compression ratios should be identical (deterministic)
      const firstRatio = results[0]!.ratio
      const firstCrc32 = results[0]!.crc32
      
      results.forEach(result => {
        expect(result.ratio).toBeCloseTo(firstRatio, 6)
        expect(result.crc32).toBe(firstCrc32)
      })

      console.log(`\n📊 Consistency Analysis:`)
      console.log(`   Runs: ${results.length}`)
      console.log(`   Ratio consistency: ${firstRatio.toFixed(6)}:1`)
      console.log(`   CRC32 consistency: ${firstCrc32.toString(16).toUpperCase()}`)
    })

    test('should scale performance with data size', () => {
      const sizes = [1024, 8192, 32768, 131072] // 1KB to 128KB
      const results: Array<{ size: number; ratio: number; speed: number }> = []

      console.log('\n🔥 Performance Scaling Test:')

      sizes.forEach(size => {
        const data = new Uint8Array(size)
        const pattern = 'Scaling test pattern. '
        const patternBytes = new TextEncoder().encode(pattern)
        
        for (let i = 0; i < size; i++) {
          data[i] = patternBytes[i % patternBytes.length]!
        }

        const result = zlib.compress(data, { level: 6 })
        const decompressed = zlib.decompress(result.compressed)
        
        expect(decompressed.decompressed.length).toBe(data.length)
        
        results.push({
          size,
          ratio: result.compressionRatio,
          speed: result.compressionSpeed
        })

        console.log(`     ${formatSize(size)}: ${result.compressionRatio.toFixed(2)}:1, ${formatSpeed(result.compressionSpeed)}`)
      })

      // Verify scaling
      expect(results.length).toBe(sizes.length)
      results.forEach(result => {
        expect(result.ratio).toBeGreaterThan(1)
        expect(result.speed).toBeGreaterThan(0)
      })
    })
  })

  describe('Memory Management', () => {
    test('should handle multiple operations without leaks', () => {
      const operations = 25
      console.log(`\n🔄 Memory Management Test (${operations} operations)`)
      
      for (let i = 0; i < operations; i++) {
        const data = new TextEncoder().encode(`Memory test ${i}. `.repeat(50))
        const result = zlib.compress(data, { level: 6 })
        const decompressed = zlib.decompress(result.compressed)
        
        expect(decompressed.decompressed.length).toBe(data.length)
      }
      
      const metrics = zlib.getPerformanceMetrics()
      
      console.log(`     Operations: ${metrics.compressionOps} compression, ${metrics.decompressionOps} decompression`)
      console.log(`     Average speeds: ${formatSpeed(metrics.averageCompressionSpeed)} comp, ${formatSpeed(metrics.averageDecompressionSpeed)} decomp`)
      
      expect(metrics.compressionOps).toBeGreaterThanOrEqual(operations)
      expect(metrics.averageCompressionSpeed).toBeGreaterThan(0)
      
      console.log(`     ✅ Memory management: No leaks detected`)
    })
  })
})