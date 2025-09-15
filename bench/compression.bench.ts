/**
 * zlib.wasm Deno Benchmarks - Performance analysis with SIMD
 * Run with: deno task benchmark
 */

import Zlib, { ZlibCompression, ZlibStrategy } from "../src/lib/index.ts";

// Test data generators
function generateTextData(size: number): Uint8Array {
  const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(
    Math.ceil(size / 55)
  );
  return new TextEncoder().encode(text.slice(0, size));
}

function generateRandomData(size: number): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return data;
}

function generateRepeatingData(size: number): Uint8Array {
  const pattern = "ABCD".repeat(64); // 256 bytes repeating
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = pattern.charCodeAt(i % pattern.length);
  }
  return data;
}

async function runBenchmarks() {
  console.log("zlib.wasm Performance Benchmarks");
  console.log("================================");

  const zlib = new Zlib({
    simdOptimizations: true,
    maxMemoryMB: 512
  });

  try {
    // Initialize zlib
    await zlib.initialize();
    console.log("zlib.wasm initialized successfully");

    // System capabilities
    const capabilities = zlib.getCapabilities();
    console.log("\n=== SYSTEM INFORMATION ===");
    console.log("━".repeat(40));
    console.log(`zlib Version:      ${capabilities.version}`);
    console.log(`SIMD Support:      ${capabilities.simdSupported ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`SIMD Features:     ${capabilities.simdCapabilities}`);
    console.log(`Max Memory:        ${capabilities.maxMemoryMB} MB`);

    // Data sizes to benchmark
    const dataSizes = [
      { size: 1024, name: "1KB" },
      { size: 10240, name: "10KB" },
      { size: 51200, name: "50KB" }  // Reduced from 100KB to avoid buffer issues
    ];

    // Compression levels to test
    const compressionLevels = [
      { level: ZlibCompression.BEST_SPEED, name: "Speed" },
      { level: ZlibCompression.DEFAULT_COMPRESSION, name: "Default" },
      { level: ZlibCompression.BEST_COMPRESSION, name: "Size" }
    ];

    console.log("\n=== COMPRESSION BENCHMARK ===");

    for (const dataSize of dataSizes) {
      console.log(`\n📊 ${dataSize.name} Test Data (${dataSize.size.toLocaleString()} bytes):`);
      console.log("━".repeat(50));

      for (const compressionLevel of compressionLevels) {
        // Generate test data
        const testData = generateTextData(dataSize.size);

        // Run compression benchmark
        const iterations = Math.max(1, Math.floor(1000000 / dataSize.size));
        const results = await zlib.benchmark(testData, iterations);

        const compressionResult = results.find(r => r.operation === "compression");
        const decompressionResult = results.find(r => r.operation === "decompression");

        if (compressionResult && decompressionResult) {
          // Get actual compression ratio
          const compressed = await zlib.compress(testData, { level: compressionLevel.level });

          console.log(`\n${compressionLevel.name} Compression:`);
          console.log(`  Original size:     ${testData.length.toLocaleString()} bytes`);
          console.log(`  Compressed size:   ${compressed.compressedSize.toLocaleString()} bytes`);
          console.log(`  Compression ratio: ${compressed.compressionRatio.toFixed(1)}x smaller`);
          console.log(`  Space saved:       ${(((testData.length - compressed.compressedSize) / testData.length) * 100).toFixed(1)}%`);
          console.log(`  Compression speed: ${compressionResult.throughput.toFixed(1)} MB/s`);
          console.log(`  Decompression:     ${decompressionResult.throughput.toFixed(1)} MB/s`);
          console.log(`  Iterations tested: ${iterations.toLocaleString()}`);
        }
      }
    }

    console.log("\n=== LARGE DATA EFFICIENCY ===");

    const memoryTestSizes = [1024 * 1024, 10 * 1024 * 1024]; // 1MB, 10MB

    for (const size of memoryTestSizes) {
      const sizeName = (size / 1024 / 1024).toFixed(0) + "MB";
      console.log(`\n📈 ${sizeName} Large Data Test:`);
      console.log("━".repeat(30));

      const testData = generateTextData(size);
      const startTime = performance.now();
      const compressed = await zlib.compress(testData);
      const endTime = performance.now();

      const processingTime = (endTime - startTime) / 1000;
      const compressionPct = ((compressed.compressedSize / size) * 100);
      const spaceSaved = (((size - compressed.compressedSize) / size) * 100);
      const processingRate = (size / 1024 / 1024) / processingTime;

      console.log(`  Original size:      ${size.toLocaleString()} bytes`);
      console.log(`  Compressed size:    ${compressed.compressedSize.toLocaleString()} bytes`);
      console.log(`  Compression ratio:  ${compressed.compressionRatio.toFixed(1)}x smaller`);
      console.log(`  Space saved:        ${spaceSaved.toFixed(1)}%`);
      console.log(`  Processing time:    ${(processingTime * 1000).toFixed(1)}ms`);
      console.log(`  Processing speed:   ${processingRate.toFixed(1)} MB/s`);
    }

    console.log("\n=== CHECKSUM PERFORMANCE ===");

    const checksumData = generateTextData(1024 * 1024); // 1MB
    const checksumIterations = 100;

    console.log(`\n🔐 Checksum Speed Test (${checksumIterations} iterations on 1MB data):`);
    console.log("━".repeat(45));

    // CRC32 benchmark
    const crc32Start = performance.now();
    for (let i = 0; i < checksumIterations; i++) {
      zlib.crc32(checksumData);
    }
    const crc32End = performance.now();
    const crc32Time = (crc32End - crc32Start) / 1000;
    const crc32Throughput = (checksumData.length * checksumIterations / 1024 / 1024) / crc32Time;

    console.log(`\nCRC32 Checksum:`);
    console.log(`  Data processed:   ${(checksumData.length * checksumIterations / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Total time:       ${(crc32Time * 1000).toFixed(1)}ms`);
    console.log(`  Throughput:       ${crc32Throughput.toFixed(1)} MB/s`);

    // Adler32 benchmark
    const adler32Start = performance.now();
    for (let i = 0; i < checksumIterations; i++) {
      zlib.adler32(checksumData);
    }
    const adler32End = performance.now();
    const adler32Time = (adler32End - adler32Start) / 1000;
    const adler32Throughput = (checksumData.length * checksumIterations / 1024 / 1024) / adler32Time;

    console.log(`\nAdler32 Checksum:`);
    console.log(`  Data processed:   ${(checksumData.length * checksumIterations / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Total time:       ${(adler32Time * 1000).toFixed(1)}ms`);
    console.log(`  Throughput:       ${adler32Throughput.toFixed(1)} MB/s`);

    zlib.cleanup();
    console.log("\nBenchmark completed successfully");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Benchmark failed:", errorMessage);
    console.error("This may occur if WASM modules need rebuilding");
    console.error("Run 'deno task build:wasm' to rebuild WASM files");
    Deno.exit(1);
  }
}

// Deno benchmark integration
Deno.bench("zlib compression - 1KB text", async () => {
  const zlib = new Zlib();
  await zlib.initialize();
  const data = generateTextData(1024);
  await zlib.compress(data);
  zlib.cleanup();
});

Deno.bench("zlib compression - 10KB text", {
  group: "compression",
  baseline: true
}, async () => {
  const zlib = new Zlib();
  await zlib.initialize();
  const data = generateTextData(10240);
  await zlib.compress(data);
  zlib.cleanup();
});

Deno.bench("zlib compression - 100KB text", {
  group: "compression"
}, async () => {
  const zlib = new Zlib();
  await zlib.initialize();
  const data = generateTextData(102400);
  await zlib.compress(data);
  zlib.cleanup();
});

// Run comprehensive benchmarks if called directly
if (import.meta.main) {
  runBenchmarks();
}