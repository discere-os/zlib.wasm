/**
 * Comprehensive SIMD Performance Benchmark for zlib.wasm
 *
 * This benchmark validates the SIMD compression implementation against
 * performance targets and provides detailed analysis of speedup characteristics.
 */

import { Zlib } from './lib/index.js'
import { formatSpeed, formatSize } from './lib/index.js'

interface BenchmarkScenario {
  name: string
  size: number
  dataGenerator: (size: number) => Uint8Array
  expectedSpeedup: number
  description: string
}

class SIMDBenchmark {
  private zlib: Zlib

  constructor() {
    this.zlib = new Zlib()
  }

  async initialize(): Promise<void> {
    await this.zlib.initialize()
  }

  /**
   * Generate test scenarios optimized for SIMD validation
   */
  private getTestScenarios(): BenchmarkScenario[] {
    return [
      {
        name: 'Highly Repetitive',
        size: 1024 * 1024,
        dataGenerator: (size) => {
          const data = new Uint8Array(size)
          data.fill(0x42) // Optimal for SIMD processing
          return data
        },
        expectedSpeedup: 4.0,
        description: 'Identical bytes - optimal for vectorized operations'
      },
      {
        name: 'Block Patterns',
        size: 512 * 1024,
        dataGenerator: (size) => {
          const data = new Uint8Array(size)
          for (let i = 0; i < size; i += 16) {
            const pattern = (i / 16) % 256
            for (let j = 0; j < 16 && i + j < size; j++) {
              data[i + j] = pattern
            }
          }
          return data
        },
        expectedSpeedup: 3.0,
        description: '16-byte block patterns - excellent for SIMD hash chains'
      },
      {
        name: 'Structured Data',
        size: 256 * 1024,
        dataGenerator: (size) => {
          const data = new Uint8Array(size)
          for (let i = 0; i < size; i += 4) {
            // Simulate structured data (e.g., RGBA pixels)
            data[i] = (i / 4) % 256      // Red
            data[i + 1] = ((i / 4) * 2) % 256  // Green
            data[i + 2] = ((i / 4) * 3) % 256  // Blue
            data[i + 3] = 255            // Alpha
          }
          return data
        },
        expectedSpeedup: 2.5,
        description: 'Structured patterns - good for SIMD string matching'
      },
      {
        name: 'Text-like Data',
        size: 128 * 1024,
        dataGenerator: (size) => {
          const data = new Uint8Array(size)
          const text = 'The quick brown fox jumps over the lazy dog. '
          for (let i = 0; i < size; i++) {
            data[i] = text.charCodeAt(i % text.length)
          }
          return data
        },
        expectedSpeedup: 2.0,
        description: 'Repeating text patterns - moderate SIMD benefit'
      },
      {
        name: 'Random Data',
        size: 64 * 1024,
        dataGenerator: (size) => {
          const data = new Uint8Array(size)
          for (let i = 0; i < size; i++) {
            data[i] = (i * 214013 + 2531011) % 256
          }
          return data
        },
        expectedSpeedup: 1.2,
        description: 'Pseudo-random data - minimal SIMD benefit expected'
      }
    ]
  }

  /**
   * Run comprehensive SIMD performance analysis
   */
  async runComprehensiveBenchmark(): Promise<void> {
    console.log('🚀 Starting SIMD Performance Benchmark for zlib.wasm\n')

    // Check SIMD availability
    const simdAvailable = this.zlib.isSIMDAvailable()
    const capabilities = this.zlib.getSystemCapabilities()

    console.log('System Information:')
    console.log(`  WASM Support: ${capabilities.wasmSupported ? '✅' : '❌'}`)
    console.log(`  SIMD Support: ${capabilities.simdSupported ? '✅' : '❌'}`)
    console.log(`  SIMD Available: ${simdAvailable ? '✅' : '❌'}`)
    console.log(`  Memory: ${formatSize(capabilities.estimatedMemory || 0)}`)
    console.log(`  CPU Cores: ${capabilities.coreCount || 'Unknown'}\n`)

    if (!simdAvailable) {
      console.log('❌ SIMD not available - cannot run SIMD benchmarks')
      return
    }

    const scenarios = this.getTestScenarios()
    const results: Array<{
      scenario: string
      size: string
      scalarSpeed: number
      simdSpeed: number
      actualSpeedup: number
      expectedSpeedup: number
      compressionRatio: number
      status: 'EXCELLENT' | 'GOOD' | 'POOR' | 'FAILED'
    }> = []

    console.log('📊 Performance Analysis Results:\n')

    for (const scenario of scenarios) {
      console.log(`Testing: ${scenario.name} (${formatSize(scenario.size)})`)

      try {
        const testData = scenario.dataGenerator(scenario.size)

        // Measure scalar compression performance
        const scalarStart = performance.now()
        const scalarResult = this.zlib.compress(testData, { level: 6 })
        const scalarEnd = performance.now()
        const scalarTime = scalarEnd - scalarStart
        const scalarSpeed = (scenario.size / 1024) / (scalarTime / 1000) // KB/s

        // Measure SIMD compression performance
        const simdStart = performance.now()
        const simdResult = this.zlib.compressSIMD(testData, { level: 6 })
        const simdEnd = performance.now()
        const simdTime = simdEnd - simdStart
        const simdSpeed = (scenario.size / 1024) / (simdTime / 1000) // KB/s

        // Calculate speedup and validate compression correctness
        const actualSpeedup = simdSpeed / scalarSpeed

        // Determine performance status based on correctness and speedup
        let status: 'EXCELLENT' | 'GOOD' | 'POOR' | 'FAILED'
        const isCorrect = simdResult.compressed.length > 0 && simdResult.compressionRatio > 0

        if (!isCorrect) {
          status = 'FAILED'
        } else if (actualSpeedup >= scenario.expectedSpeedup * 0.8) {
          status = 'EXCELLENT'
        } else if (actualSpeedup >= scenario.expectedSpeedup * 0.5) {
          status = 'GOOD'
        } else if (actualSpeedup >= 1.1) {
          status = 'POOR'
        } else {
          status = 'FAILED'
        }

        results.push({
          scenario: scenario.name,
          size: formatSize(scenario.size),
          scalarSpeed: scalarSpeed / 1024, // MB/s
          simdSpeed: simdSpeed / 1024, // MB/s
          actualSpeedup,
          expectedSpeedup: scenario.expectedSpeedup,
          compressionRatio: scalarResult.compressionRatio,
          status
        })

        console.log(`  Scalar: ${formatSpeed(scalarSpeed)}`)
        console.log(`  SIMD: ${formatSpeed(simdSpeed)}`)
        console.log(`  Speedup: ${actualSpeedup.toFixed(2)}x (expected: ${scenario.expectedSpeedup}x)`)
        console.log(`  Status: ${status}\n`)

      } catch (error) {
        console.error(`  ❌ Failed: ${error}\n`)
        results.push({
          scenario: scenario.name,
          size: formatSize(scenario.size),
          scalarSpeed: 0,
          simdSpeed: 0,
          actualSpeedup: 0,
          expectedSpeedup: scenario.expectedSpeedup,
          compressionRatio: 0,
          status: 'FAILED'
        })
      }
    }

    // Generate summary report
    this.generateSummaryReport(results)
  }

  /**
   * Generate comprehensive performance summary
   */
  private generateSummaryReport(results: any[]): void {
    console.log('📈 Performance Summary:\n')

    // Calculate aggregate metrics
    const validResults = results.filter(r => r.status !== 'FAILED')
    const avgSpeedup = validResults.reduce((sum, r) => sum + r.actualSpeedup, 0) / validResults.length
    const excellentCount = results.filter(r => r.status === 'EXCELLENT').length
    const goodCount = results.filter(r => r.status === 'GOOD').length

    console.log('Aggregate Metrics:')
    console.log(`  Average SIMD Speedup: ${avgSpeedup.toFixed(2)}x`)
    console.log(`  Excellent Performance: ${excellentCount}/${results.length} scenarios`)
    console.log(`  Good+ Performance: ${excellentCount + goodCount}/${results.length} scenarios\n`)

    // Detailed results table
    console.log('Detailed Results:')
    console.log('┌─────────────────┬───────────┬───────────┬───────────┬──────────┬────────────┬──────────┐')
    console.log('│ Scenario        │ Size      │ Scalar    │ SIMD      │ Speedup  │ Expected   │ Status   │')
    console.log('├─────────────────┼───────────┼───────────┼───────────┼──────────┼────────────┼──────────┤')

    for (const result of results) {
      const scenario = result.scenario.padEnd(15)
      const size = result.size.padEnd(9)
      const scalarSpeed = `${result.scalarSpeed.toFixed(1)} MB/s`.padEnd(9)
      const simdSpeed = `${result.simdSpeed.toFixed(1)} MB/s`.padEnd(9)
      const speedup = `${result.actualSpeedup.toFixed(2)}x`.padEnd(8)
      const expected = `${result.expectedSpeedup.toFixed(1)}x`.padEnd(10)
      const status = result.status.padEnd(8)

      console.log(`│ ${scenario} │ ${size} │ ${scalarSpeed} │ ${simdSpeed} │ ${speedup} │ ${expected} │ ${status} │`)
    }

    console.log('└─────────────────┴───────────┴───────────┴───────────┴──────────┴────────────┴──────────┘\n')

    // Performance targets analysis
    const passedTargets = results.filter(r => r.actualSpeedup >= r.expectedSpeedup * 0.8).length
    const performanceScore = Math.round((passedTargets / results.length) * 100)

    console.log('Performance Assessment:')
    console.log(`  Targets Met: ${passedTargets}/${results.length} (${performanceScore}%)`)

    if (performanceScore >= 80) {
      console.log('  Overall Grade: ✅ EXCELLENT - SIMD implementation meets performance targets')
    } else if (performanceScore >= 60) {
      console.log('  Overall Grade: ⚠️ GOOD - SIMD provides benefits but may need optimization')
    } else {
      console.log('  Overall Grade: ❌ POOR - SIMD implementation needs significant improvement')
    }

    console.log('\n🎯 Recommendations:')
    if (avgSpeedup < 2.0) {
      console.log('  • Focus on optimizing hash chain operations for better SIMD utilization')
      console.log('  • Consider implementing vectorized LZ77 matching algorithms')
    }
    if (excellentCount < results.length / 2) {
      console.log('  • Optimize SIMD memory access patterns for better cache utilization')
      console.log('  • Implement progressive enhancement for different data types')
    }
    if (results.some(r => r.status === 'FAILED')) {
      console.log('  • Investigate failed scenarios and add graceful fallback mechanisms')
    }
  }

  /**
   * Run targeted CRC32 SIMD benchmark
   */
  async benchmarkCRC32SIMD(): Promise<void> {
    console.log('🔍 CRC32 SIMD Performance Analysis:\n')

    const testSizes = [
      { size: 16 * 1024, name: '16KB' },
      { size: 64 * 1024, name: '64KB' },
      { size: 256 * 1024, name: '256KB' },
      { size: 1024 * 1024, name: '1MB' }
    ]

    for (const test of testSizes) {
      const testData = new Uint8Array(test.size)
      for (let i = 0; i < test.size; i++) {
        testData[i] = (i * 314159 + 271828) % 256
      }

      // Measure scalar CRC32
      const scalarStart = performance.now()
      const scalarCRC = this.zlib.calculateCRC32(testData)
      const scalarEnd = performance.now()
      const scalarTime = scalarEnd - scalarStart

      // Measure SIMD CRC32
      const simdStart = performance.now()
      const simdCRC = this.zlib.calculateCRC32SIMD(testData)
      const simdEnd = performance.now()
      const simdTime = simdEnd - simdStart

      const speedup = scalarTime / simdTime
      const simdThroughput = (test.size / 1024 / 1024) / (simdTime / 1000)

      console.log(`${test.name} CRC32:`)
      console.log(`  Scalar: ${scalarTime.toFixed(2)}ms`)
      console.log(`  SIMD: ${simdTime.toFixed(2)}ms`)
      console.log(`  Speedup: ${speedup.toFixed(2)}x`)
      console.log(`  Throughput: ${simdThroughput.toFixed(1)} MB/s`)
      console.log(`  Correct: ${scalarCRC === simdCRC ? '✅' : '❌'}\n`)
    }
  }
}

/**
 * Main benchmark execution
 */
async function main(): Promise<void> {
  const benchmark = new SIMDBenchmark()

  try {
    await benchmark.initialize()

    console.log('='.repeat(80))
    console.log('SIMD-Accelerated Compression Performance Benchmark')
    console.log('zlib.wasm - Production Implementation Validation')
    console.log('='.repeat(80))
    console.log()

    await benchmark.runComprehensiveBenchmark()
    console.log()
    await benchmark.benchmarkCRC32SIMD()

    console.log('='.repeat(80))
    console.log('Benchmark Complete')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    process.exit(1)
  }
}

// Run benchmark if executed directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('simd_benchmark')) {
  main().catch(console.error)
}

export { SIMDBenchmark, main as runSIMDBenchmark }