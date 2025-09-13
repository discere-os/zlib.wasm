/**
 * Comprehensive benchmarking suite for zlib.wasm
 * Performance validation and algorithm testing
 */

import Zlib, { formatSpeed, formatSize } from './lib/index.js'

interface BenchmarkConfiguration {
  name: string
  dataSize: number
  dataType: 'text' | 'json' | 'binary' | 'random'
  compressionLevels: Array<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>
  iterations: number
}

export async function runComprehensiveBenchmark(): Promise<void> {
  console.log('🏁 zlib.wasm Comprehensive Benchmark Suite\n')

  const zlib = new Zlib()
  await zlib.initialize({ enableMetrics: true })
  
  console.log(`📊 Module: ${zlib.getVersion()}`)
  const capabilities = zlib.getSystemCapabilities()
  console.log(`⚡ SIMD: ${capabilities.simdSupported ? 'Enabled' : 'Disabled'}`)
  console.log(`💾 Memory: ${capabilities.estimatedMemory ? capabilities.estimatedMemory + ' GB' : 'Unknown'}`)
  console.log(`🖥️ Cores: ${capabilities.coreCount || 'Unknown'}\n`)

  const configurations: BenchmarkConfiguration[] = [
    {
      name: 'Small Text Data',
      dataSize: 8192, // 8KB
      dataType: 'text',
      compressionLevels: [1, 6, 9],
      iterations: 10
    },
    {
      name: 'Medium JSON Data',
      dataSize: 65536, // 64KB
      dataType: 'json', 
      compressionLevels: [1, 6, 9],
      iterations: 5
    },
    {
      name: 'Large Text Document',
      dataSize: 524288, // 512KB
      dataType: 'text',
      compressionLevels: [6, 9],
      iterations: 3
    },
    {
      name: 'Binary Pattern Data',
      dataSize: 131072, // 128KB
      dataType: 'binary',
      compressionLevels: [1, 6, 9],
      iterations: 5
    },
    {
      name: 'Random Data (Worst Case)',
      dataSize: 32768, // 32KB
      dataType: 'random',
      compressionLevels: [1, 6, 9],
      iterations: 5
    }
  ]

  const allResults: Array<{
    config: BenchmarkConfiguration
    results: any
    averageSpeed: number
    bestRatio: number
  }> = []

  for (const config of configurations) {
    console.log(`🧪 Testing: ${config.name}`)
    console.log(`   Size: ${formatSize(config.dataSize)}, Type: ${config.dataType}`)
    console.log(`   Compression levels: [${config.compressionLevels.join(', ')}], Iterations: ${config.iterations}`)

    const testData = generateTestData(config.dataSize, config.dataType)
    const results: Record<number, {
      compressionSpeed: number
      decompressionSpeed: number
      compressionRatio: number
      spaceSaved: number
      avgTime: number
      validated: boolean
    }> = {}

    for (const level of config.compressionLevels) {
      const runs: Array<{
        compressionSpeed: number
        decompressionSpeed: number
        compressionRatio: number
        compressionTime: number
        decompressionTime: number
        validated: boolean
        crc32Valid: boolean
      }> = []

      console.log(`\n   Level ${level}:`)

      // Warm up run
      const warmup = zlib.compress(testData, { level })
      zlib.decompress(warmup.compressed)

      // Benchmark runs
      for (let i = 0; i < config.iterations; i++) {
        const compResult = zlib.compress(testData, { level })
        const decompResult = zlib.decompress(compResult.compressed)
        
        // Validate byte-for-byte accuracy
        let isValid = decompResult.decompressed.length === testData.length
        if (isValid && testData.length < 100000) { // Full validation for smaller data
          for (let j = 0; j < testData.length; j++) {
            if (testData[j] !== decompResult.decompressed[j]) {
              isValid = false
              break
            }
          }
        }

        // CRC32 validation
        const originalCrc32 = zlib.calculateCRC32(testData)
        const decompressedCrc32 = zlib.calculateCRC32(decompResult.decompressed)
        const crc32Valid = originalCrc32 === decompressedCrc32

        runs.push({
          compressionSpeed: compResult.compressionSpeed,
          decompressionSpeed: decompResult.decompressionSpeed,
          compressionRatio: compResult.compressionRatio,
          compressionTime: compResult.compressionTime,
          decompressionTime: decompResult.decompressionTime,
          validated: isValid,
          crc32Valid
        })

        if (!isValid) {
          console.log(`     ❌ Run ${i + 1}: Validation FAILED`)
        }
        if (!crc32Valid) {
          console.log(`     ❌ Run ${i + 1}: CRC32 mismatch`)
        }
      }

      // Calculate averages
      const avgCompSpeed = runs.reduce((sum, r) => sum + r.compressionSpeed, 0) / runs.length
      const avgDecompSpeed = runs.reduce((sum, r) => sum + r.decompressionSpeed, 0) / runs.length
      const avgCompRatio = runs.reduce((sum, r) => sum + r.compressionRatio, 0) / runs.length
      const avgSpaceSaved = runs.reduce((sum, r) => sum + (1 - 1/r.compressionRatio) * 100, 0) / runs.length
      const avgTotalTime = runs.reduce((sum, r) => sum + r.compressionTime + r.decompressionTime, 0) / runs.length
      const allValidated = runs.every(r => r.validated && r.crc32Valid)

      results[level] = {
        compressionSpeed: avgCompSpeed,
        decompressionSpeed: avgDecompSpeed, 
        compressionRatio: avgCompRatio,
        spaceSaved: avgSpaceSaved,
        avgTime: avgTotalTime,
        validated: allValidated
      }

      console.log(`     Avg: ${formatSpeed(avgCompSpeed)} comp, ${formatSpeed(avgDecompSpeed)} decomp`)
      console.log(`     Ratio: ${avgCompRatio.toFixed(2)}:1 (${avgSpaceSaved.toFixed(1)}% saved)`)
      console.log(`     Validation: ${allValidated ? 'ALL PASSED ✅' : 'SOME FAILED ❌'}`)
    }

    const bestSpeedLevel = Object.entries(results).reduce((a, b) => 
      results[parseInt(a[0])]!.compressionSpeed > results[parseInt(b[0])]!.compressionSpeed ? a : b
    )
    const bestRatioLevel = Object.entries(results).reduce((a, b) => 
      results[parseInt(a[0])]!.compressionRatio > results[parseInt(b[0])]!.compressionRatio ? a : b  
    )

    console.log(`\n   🏆 Results Summary:`)
    console.log(`   • Fastest: Level ${bestSpeedLevel[0]} (${formatSpeed(bestSpeedLevel[1]!.compressionSpeed)})`)
    console.log(`   • Best ratio: Level ${bestRatioLevel[0]} (${bestRatioLevel[1]!.compressionRatio.toFixed(2)}:1)`)
    
    allResults.push({
      config,
      results,
      averageSpeed: Object.values(results).reduce((sum, r) => sum + r.compressionSpeed, 0) / Object.keys(results).length,
      bestRatio: Math.max(...Object.values(results).map(r => r.compressionRatio))
    })

    console.log('') // Spacing
  }

  // Overall Summary
  console.log('🏆 OVERALL BENCHMARK SUMMARY')
  console.log('=' .repeat(50))

  const overallAvgSpeed = allResults.reduce((sum, r) => sum + r.averageSpeed, 0) / allResults.length
  const overallBestRatio = Math.max(...allResults.map(r => r.bestRatio))
  
  console.log(`📈 Average compression speed: ${formatSpeed(overallAvgSpeed)}`)
  console.log(`🎯 Best compression ratio: ${overallBestRatio.toFixed(2)}:1`)
  
  // Performance by data type
  console.log('\n📊 Performance by Data Type:')
  allResults.forEach(result => {
    console.log(`   ${result.config.name}: ${formatSpeed(result.averageSpeed)} avg, ${result.bestRatio.toFixed(2)}:1 best ratio`)
  })

  // Performance Target Analysis
  console.log('\n🎖️ Performance Analysis:')
  const compTargetKBps = 50 * 1024 // 50 MB/s target for zlib (faster than bzip2)
  const decompTargetKBps = 200 * 1024 // 200 MB/s target for zlib
  
  console.log(`   Compression performance: ${formatSpeed(overallAvgSpeed)} ${overallAvgSpeed >= compTargetKBps ? '✅ Excellent' : '⚠️ Good'}`)
  
  const finalMetrics = zlib.getPerformanceMetrics()
  console.log(`   Decompression performance: ${formatSpeed(finalMetrics.averageDecompressionSpeed)} ${finalMetrics.averageDecompressionSpeed >= decompTargetKBps ? '✅ Excellent' : '⚠️ Good'}`)

  console.log('\n✨ Comprehensive benchmark completed successfully!')
  
  zlib.cleanup()
}

function generateTestData(size: number, type: 'text' | 'json' | 'binary' | 'random'): Uint8Array {
  const data = new Uint8Array(size)
  
  switch (type) {
    case 'text': {
      const pattern = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '
      const patternBytes = new TextEncoder().encode(pattern)
      for (let i = 0; i < size; i++) {
        data[i] = patternBytes[i % patternBytes.length]!
      }
      break
    }
    case 'json': {
      const jsonObj = {
        metadata: { version: '1.0', timestamp: Date.now() },
        users: Array.from({ length: Math.floor(size / 200) }, (_, i) => ({
          id: i,
          name: `user_${i.toString().padStart(4, '0')}`,
          email: `user${i}@example.com`,
          active: i % 2 === 0,
          permissions: ['read', 'write', 'execute'].slice(0, (i % 3) + 1),
          profile: { age: 20 + (i % 50), department: 'Engineering' }
        }))
      }
      const jsonStr = JSON.stringify(jsonObj).slice(0, size)
      const jsonBytes = new TextEncoder().encode(jsonStr)
      jsonBytes.forEach((byte, i) => { if (i < size) data[i] = byte })
      break
    }
    case 'binary':
      for (let i = 0; i < size; i++) {
        // Create patterns that zlib can exploit
        if (i % 1000 < 200) {
          data[i] = 0x55 // Repeating pattern
        } else {
          data[i] = (i * 3) % 256 // Mathematical pattern
        }
      }
      break
    case 'random':
      for (let i = 0; i < size; i++) {
        data[i] = Math.floor(Math.random() * 256)
      }
      break
  }
  
  return data
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveBenchmark().catch(console.error)
}