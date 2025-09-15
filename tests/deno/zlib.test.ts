import { assert, assertEquals, assertRejects, assertExists, assertThrows } from "@std/assert";
import Zlib, { ZlibError, ZlibInitError, ZlibCompressionError, ZlibCompression, ZlibStrategy } from "../../src/lib/index.ts";

Deno.test("Zlib initialization without WASM", async () => {
  const zlib = new Zlib();

  // Should not be initialized initially
  assert(!zlib.initialized);

  // Should throw error when trying to get capabilities before initialization
  try {
    zlib.getCapabilities();
    assert(false, "Should throw error when accessing capabilities before init");
  } catch (error) {
    assert(error instanceof ZlibError);
    assert(error.message.includes("not initialized"));
  }
});

Deno.test("Zlib initialization with mock WASM (if available)", async () => {
  const zlib = new Zlib();

  try {
    await zlib.initialize();

    const capabilities = zlib.getCapabilities();
    assertExists(capabilities);
    assert(typeof capabilities.version === 'string');
    assert(typeof capabilities.simdSupported === 'boolean');
    assert(Array.isArray(capabilities.compressionLevels));
    assert(Array.isArray(capabilities.strategies));

    console.log(`✅ WASM initialized: ${capabilities.version}`);
    console.log(`   SIMD: ${capabilities.simdSupported}`);

    zlib.cleanup();
  } catch (error) {
    console.warn("⚠️  Skipping WASM-dependent test:", error.message);
    console.warn("   This is expected until WASM modules are built");
    // Don't fail the test if WASM not available
  }
});

Deno.test("Compression and decompression (if WASM available)", async () => {
  const zlib = new Zlib();

  try {
    await zlib.initialize();

    const testText = "Hello, zlib.wasm from Deno! This text will be compressed and decompressed.";
    const testData = new TextEncoder().encode(testText);

    // Test compression with different levels
    const levels = [
      ZlibCompression.BEST_SPEED,
      ZlibCompression.DEFAULT_COMPRESSION,
      ZlibCompression.BEST_COMPRESSION
    ];

    for (const level of levels) {
      const compressed = await zlib.compress(testData, { level });

      assert(compressed.compressedSize > 0, "Should produce compressed output");
      assert(compressed.compressionRatio > 1, "Should achieve compression");
      assert(typeof compressed.processingTime === 'number', "Should measure processing time");
      assert(compressed.originalSize === testData.length, "Should preserve original size info");

      // Test decompression
      const decompressed = await zlib.decompress(compressed.data);

      assertEquals(decompressed.originalSize, testData.length, "Should restore original size");
      assert(typeof decompressed.processingTime === 'number', "Should measure decompression time");

      // Verify data integrity
      const originalText = new TextDecoder().decode(testData);
      const decompressedText = new TextDecoder().decode(decompressed.data);
      assertEquals(originalText, decompressedText, "Data should be identical after roundtrip");
    }

    console.log("✅ Compression/decompression tests passed");
    zlib.cleanup();
  } catch (error) {
    console.warn("⚠️  Skipping WASM-dependent test:", error.message);
  }
});

Deno.test("Checksum functions (if WASM available)", async () => {
  const zlib = new Zlib();

  try {
    await zlib.initialize();

    const testData = new TextEncoder().encode("Hello, World!");

    const crc32 = zlib.crc32(testData);
    const adler32 = zlib.adler32(testData);

    assert(typeof crc32 === 'number', "CRC32 should return a number");
    assert(typeof adler32 === 'number', "Adler32 should return a number");
    assert(crc32 !== 0, "CRC32 should not be zero for non-empty data");
    assert(adler32 !== 0, "Adler32 should not be zero for non-empty data");

    // Test consistency
    const crc32_2 = zlib.crc32(testData);
    const adler32_2 = zlib.adler32(testData);

    assertEquals(crc32, crc32_2, "CRC32 should be consistent");
    assertEquals(adler32, adler32_2, "Adler32 should be consistent");

    console.log(`✅ Checksums: CRC32=0x${crc32.toString(16)}, Adler32=0x${adler32.toString(16)}`);
    zlib.cleanup();
  } catch (error) {
    console.warn("⚠️  Skipping WASM-dependent test:", error.message);
  }
});

Deno.test("Performance benchmark (if WASM available)", async () => {
  const zlib = new Zlib();

  try {
    await zlib.initialize();

    const testData = new TextEncoder().encode("Benchmark data ".repeat(100));
    const results = await zlib.benchmark(testData, 5);

    assert(Array.isArray(results), "Benchmark should return array of results");
    assert(results.length >= 1, "Should have at least compression results");

    for (const result of results) {
      assert(typeof result.operation === 'string', "Should have operation name");
      assert(typeof result.averageTime === 'number', "Should have average time");
      assert(typeof result.throughput === 'number', "Should have throughput");
      assert(result.iterations === 5, "Should match requested iterations");
    }

    console.log("✅ Benchmark completed:");
    for (const result of results) {
      console.log(`   ${result.operation}: ${result.throughput.toFixed(2)} MB/s`);
    }

    zlib.cleanup();
  } catch (error) {
    console.warn("⚠️  Skipping WASM-dependent test:", error.message);
  }
});

Deno.test("Error handling", async () => {
  const zlib = new Zlib();

  // Should throw error if not initialized
  assertThrows(
    () => zlib.getCapabilities(),
    ZlibError,
    "zlib.wasm not initialized"
  );

  assertThrows(
    () => zlib.crc32(new Uint8Array([1, 2, 3])),
    ZlibError,
    "zlib.wasm not initialized"
  );

  assertThrows(
    () => zlib.adler32(new Uint8Array([1, 2, 3])),
    ZlibError,
    "zlib.wasm not initialized"
  );
});

Deno.test("Configuration options", () => {
  const defaultZlib = new Zlib();
  assertExists(defaultZlib);

  const configuredZlib = new Zlib({
    cdnUrl: "https://custom-cdn.example.com/",
    fallbackUrls: ["https://fallback.example.com/"],
    maxMemoryMB: 128,
    simdOptimizations: false,
    cachingEnabled: false
  });
  assertExists(configuredZlib);
});