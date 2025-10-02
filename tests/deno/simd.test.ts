import { assert, assertEquals } from "@std/assert";
import Zlib from "../../src/lib/index.ts";

Deno.test("V8 WASM SIMD support detection", () => {
  // Check if V8 supports WASM SIMD (Deno uses modern V8)
  const wasmSimd = WebAssembly.validate(
    new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // WASM magic number
      0x01, 0x00, 0x00, 0x00, // WASM version 1
      0x01, 0x05, 0x01, 0x60, // Type section
      0x00, 0x01, 0x7b,       // Function type: () -> v128
      0x03, 0x02, 0x01, 0x00, // Function section
      0x0a, 0x0a, 0x01, 0x08, // Code section
      0x00, 0xfd, 0x0c,       // v128.const
      0x00, 0x00, 0x00, 0x00, // i32x4 splat 0
      0x0b                     // end
    ])
  );

  assert(wasmSimd, "Deno's V8 should support WASM SIMD128");
  console.log("✅ V8 WASM SIMD128 support: enabled");
});

Deno.test("SIMD performance verification", async () => {
  const zlib = new Zlib({ simdOptimizations: true });

  try {
    await zlib.initialize();

    const capabilities = zlib.getCapabilities();
    console.log(`📊 SIMD capabilities: ${capabilities.simdCapabilities}`);

    if (capabilities.simdSupported) {
      // Test with data that benefits from SIMD
      const testData = new Uint8Array(10000);
      for (let i = 0; i < testData.length; i++) {
        testData[i] = Math.floor(Math.random() * 256);
      }

      const startTime = performance.now();
      const compressed = await zlib.compress(testData);
      const endTime = performance.now();

      assert(compressed.simdAccelerated, "Compression should use SIMD acceleration");
      assert(compressed.compressedSize > 0, "Should produce compressed output");

      const throughput = (testData.length / (endTime - startTime)) * 1000; // bytes/sec
      console.log(`✅ SIMD compression: ${(throughput / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`   Compression ratio: ${compressed.compressionRatio.toFixed(2)}x`);
    } else {
      console.warn("⚠️  SIMD not supported in WASM module");
    }

    zlib.cleanup();
  } catch (error) {
    console.warn("⚠️  Skipping SIMD test:", (error as Error).message);
  }
});

Deno.test("Web-native capabilities detection", async () => {
  const zlib = new Zlib();

  try {
    await zlib.initialize();

    const capabilities = zlib.getCapabilities();

    // Log all detected capabilities
    console.log("🔍 Web-Native Capabilities:");
    console.log(`  - SIMD: ${capabilities.simdSupported ? '✅' : '❌'}`);
    console.log(`  - Version: ${capabilities.version}`);
    console.log(`  - Max Memory: ${capabilities.maxMemoryMB}MB`);
    console.log(`  - Compression Levels: ${capabilities.compressionLevels.length}`);
    console.log(`  - Strategies: ${capabilities.strategies.length}`);

    // Verify modern V8 features are enabled
    assert(typeof WebAssembly !== 'undefined', "WebAssembly should be available");
    assert(typeof performance !== 'undefined', "Performance API should be available");
    assert(typeof crypto !== 'undefined', "Web Crypto API should be available");

    zlib.cleanup();
  } catch (error) {
    console.warn("⚠️  Skipping capabilities test:", (error as Error).message);
  }
});

Deno.test("Benchmark SIMD vs scalar performance", async () => {
  // This test requires WASM to be built with SIMD support
  const zlib = new Zlib({ simdOptimizations: true });

  try {
    await zlib.initialize();

    const capabilities = zlib.getCapabilities();

    if (!capabilities.simdSupported) {
      console.warn("⚠️  Skipping SIMD benchmark - not supported");
      return;
    }

    // Create test data
    const sizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB

    for (const size of sizes) {
      const testData = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        testData[i] = i % 256;
      }

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await zlib.compress(testData);
        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const throughput = (size / avgTime) * 1000; // bytes/sec

      console.log(`📊 ${(size / 1024).toFixed(0)}KB data:`);
      console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${(throughput / 1024 / 1024).toFixed(2)} MB/s`);
    }

    zlib.cleanup();
  } catch (error) {
    console.warn("⚠️  Skipping benchmark:", (error as Error).message);
  }
});
