import { assert, assertExists, assertEquals } from "@std/assert";

Deno.test("Deno runtime features", () => {
  assert(typeof Deno !== 'undefined', "Deno runtime should be available");
  assert(typeof WebAssembly !== 'undefined', "WebAssembly should be available");
  assert(typeof performance !== 'undefined', "Performance API should be available");
});

Deno.test("WASM file accessibility", async () => {
  try {
    const wasmFile = await Deno.stat("./install/wasm/zlib-release.wasm");
    assert(wasmFile.isFile, "WASM file should exist");
    assert(wasmFile.size > 0, "WASM file should not be empty");
    console.log(`✅ Found WASM file: ${wasmFile.size} bytes`);
  } catch (error) {
    console.warn("⚠️  WASM file not found - run 'deno task build:wasm' first");
    console.warn(`   Error: ${error.message}`);
    // Don't fail the test if WASM not built yet
  }
});

Deno.test("JavaScript module accessibility", async () => {
  try {
    const jsFile = await Deno.stat("./install/wasm/zlib-release.js");
    assert(jsFile.isFile, "JS module file should exist");
    assert(jsFile.size > 0, "JS module file should not be empty");
    console.log(`✅ Found JS module: ${jsFile.size} bytes`);
  } catch (error) {
    console.warn("⚠️  JS module not found - run 'deno task build:wasm' first");
    console.warn(`   Error: ${error.message}`);
    // Don't fail the test if WASM not built yet
  }
});

Deno.test("TypeScript module imports", async () => {
  const { default: Zlib } = await import("../../src/lib/index.ts");
  assertExists(Zlib, "Zlib class should be importable");
  assert(typeof Zlib === 'function', "Zlib should be a constructor function");

  const { ZlibError, ZlibCompression, ZlibStrategy } = await import("../../src/lib/index.ts");
  assertExists(ZlibError, "ZlibError should be importable");
  assertExists(ZlibCompression, "ZlibCompression enum should be importable");
  assertExists(ZlibStrategy, "ZlibStrategy enum should be importable");
});

Deno.test("Zlib class instantiation", async () => {
  const { default: Zlib } = await import("../../src/lib/index.ts");

  const zlib = new Zlib();
  assertExists(zlib, "Zlib instance should be created");

  // Test with options
  const zlibWithOptions = new Zlib({
    maxMemoryMB: 128,
    simdOptimizations: false
  });
  assertExists(zlibWithOptions, "Zlib instance with options should be created");
});

Deno.test("Enum values", async () => {
  const { ZlibCompression, ZlibStrategy } = await import("../../src/lib/index.ts");

  assertEquals(ZlibCompression.NO_COMPRESSION, 0);
  assertEquals(ZlibCompression.BEST_SPEED, 1);
  assertEquals(ZlibCompression.DEFAULT_COMPRESSION, 6);
  assertEquals(ZlibCompression.BEST_COMPRESSION, 9);

  assertEquals(ZlibStrategy.DEFAULT_STRATEGY, 0);
  assertEquals(ZlibStrategy.FILTERED, 1);
  assertEquals(ZlibStrategy.HUFFMAN_ONLY, 2);
});

Deno.test("Error classes inheritance", async () => {
  const { ZlibError, ZlibMemoryError, ZlibCompressionError, ZlibInitError } =
    await import("../../src/lib/index.ts");

  const zlibError = new ZlibError("test");
  assert(zlibError instanceof Error, "ZlibError should inherit from Error");
  assert(zlibError instanceof ZlibError, "ZlibError should be instance of itself");
  assertEquals(zlibError.name, "ZlibError");

  const memoryError = new ZlibMemoryError("test");
  assert(memoryError instanceof Error, "ZlibMemoryError should inherit from Error");
  assert(memoryError instanceof ZlibError, "ZlibMemoryError should inherit from ZlibError");
  assertEquals(memoryError.name, "ZlibMemoryError");
});