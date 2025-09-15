/**
 * zlib.wasm Deno Demo - Direct TypeScript execution
 * Run with: deno task demo
 */

import Zlib, { ZlibCompression, ZlibStrategy } from './src/lib/index.ts'

async function demonstrateZlibWASM() {
  console.log('zlib.wasm Deno Demo')
  console.log('===================')

  const zlib = new Zlib({
    simdOptimizations: true,
    maxMemoryMB: 256
  })

  try {
    // Initialize zlib with real WASM module
    console.log('Initializing zlib.wasm...')
    await zlib.initialize()
    console.log('zlib.wasm initialized successfully')

    // Show capabilities
    const capabilities = zlib.getCapabilities()
    console.log(`Version: ${capabilities.version}`)
    console.log(`SIMD Support: ${capabilities.simdSupported}`)
    console.log(`Max Memory: ${capabilities.maxMemoryMB}MB`)

    // Create test data
    const testText = 'Hello, zlib.wasm! This is a test string for compression. '.repeat(10)
    const testData = new TextEncoder().encode(testText)
    console.log(`Test data: ${testData.length} bytes`)

    // Test compression
    const compressed = await zlib.compress(testData, {
      level: ZlibCompression.DEFAULT_COMPRESSION,
      strategy: ZlibStrategy.DEFAULT_STRATEGY
    })

    console.log(`Original: ${compressed.originalSize} bytes`)
    console.log(`Compressed: ${compressed.compressedSize} bytes`)
    console.log(`Ratio: ${compressed.compressionRatio.toFixed(2)}x`)
    console.log(`Time: ${compressed.processingTime.toFixed(2)}ms`)
    console.log(`SIMD: ${compressed.simdAccelerated}`)

    // Test decompression
    const decompressed = await zlib.decompress(compressed.data)
    console.log(`Decompression: ${decompressed.processingTime.toFixed(2)}ms`)

    // Verify integrity
    const decompressedText = new TextDecoder().decode(decompressed.data)
    const integrity = testText === decompressedText
    console.log(`Integrity: ${integrity ? 'OK' : 'FAILED'}`)

    // Test checksums
    const crc32 = zlib.crc32(testData)
    const adler32 = zlib.adler32(testData)
    console.log(`CRC32: 0x${crc32.toString(16)}`)
    console.log(`Adler32: 0x${adler32.toString(16)}`)

    // Cleanup
    zlib.cleanup()
    console.log('Demo completed successfully')

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Demo failed:', errorMessage)
    console.error('This may occur if WASM modules need rebuilding')
    console.error('Run "deno task build:wasm" to rebuild WASM files')
    Deno.exit(1)
  }
}

// Run the demo
if (import.meta.main) {
  demonstrateZlibWASM()
}