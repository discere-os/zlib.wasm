/**
 * Build NPM package from Deno source using dnt (Deno to Node Transform)
 * Run with: deno task build:npm
 */

import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

console.log("🦕 Building NPM package from Deno source using dnt...");

await emptyDir("./npm");

await build({
  entryPoints: ["./src/lib/index.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  compilerOptions: {
    lib: ["DOM", "DOM.Iterable", "ES2022"]
  },
  test: false, // We use Deno tests, not Node.js tests
  package: {
    name: "@discere-os/zlib.wasm",
    version: "1.4.2",
    description: "High-performance zlib compression library with SIMD optimizations for WebAssembly applications",
    license: "Zlib",
    repository: {
      type: "git",
      url: "git+https://github.com/discere-os/zlib.wasm.git",
    },
    homepage: "https://github.com/discere-os/zlib.wasm",
    keywords: [
      "zlib",
      "compression",
      "webassembly",
      "wasm",
      "simd",
      "deflate",
      "inflate",
      "crc32",
      "adler32",
      "browser",
      "nodejs",
      "typescript",
      "dynamic-linking",
      "side-module",
      "discere-os"
    ],
    author: "Superstruct Ltd, New Zealand",
    main: "./script/lib/index.js",
    module: "./esm/lib/index.js",
    types: "./types/lib/index.d.ts",
    exports: {
      ".": {
        import: "./esm/lib/index.js",
        require: "./script/lib/index.js",
        types: "./types/lib/index.d.ts"
      },
      "./side": {
        import: "./assets/zlib-side.wasm",
        types: "./types/lib/types.d.ts"
      },
      "./main": {
        import: "./assets/zlib-release.js",
        types: "./types/lib/types.d.ts"
      },
      "./fallback": {
        import: "./assets/zlib-fallback.js",
        types: "./types/lib/types.d.ts"
      },
      "./types": {
        import: "./types/lib/types.d.ts",
        require: "./types/lib/types.d.ts"
      }
    },
    engines: {
      node: ">=18.0.0"
    },
    files: [
      "script/",
      "esm/",
      "types/",
      "assets/",
      "README.md",
      "LICENSE"
    ]
  },
  postBuild() {
    console.log("📦 Copying WASM assets and additional files...");

    // Create assets directory
    try {
      Deno.mkdirSync("npm/assets", { recursive: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn("Could not create assets directory:", errorMessage);
    }

    // Copy WASM files (if they exist)
    const wasmFiles = [
      { src: "install/wasm/zlib-side.wasm", desc: "SIDE_MODULE for dynamic linking" },
      { src: "install/wasm/zlib-release.js", desc: "MAIN_MODULE JavaScript" },
      { src: "install/wasm/zlib-release.wasm", desc: "MAIN_MODULE WebAssembly" },
      { src: "install/wasm/zlib-fallback.js", desc: "Fallback module" },
      { src: "install/wasm/zlib-fallback.wasm", desc: "Fallback WebAssembly" }
    ];

    let copiedCount = 0;
    for (const file of wasmFiles) {
      try {
        const destPath = `npm/assets/${file.src.split('/').pop()}`;
        Deno.copyFileSync(file.src, destPath);
        console.log(`   ✅ ${file.desc}: ${file.src} → ${destPath}`);
        copiedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️  Could not copy ${file.src}: ${errorMessage}`);
      }
    }

    if (copiedCount === 0) {
      console.warn("   ⚠️  No WASM files copied - run 'deno task build:wasm' first");
    } else {
      console.log(`   ✅ Successfully copied ${copiedCount}/${wasmFiles.length} WASM assets`);
    }

    // Copy additional files
    const additionalFiles = [
      { src: "README.md", desc: "Documentation" },
      { src: "LICENSE", desc: "License file" }
    ];

    for (const file of additionalFiles) {
      try {
        Deno.copyFileSync(file.src, `npm/${file.src}`);
        console.log(`   ✅ ${file.desc}: ${file.src}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️  Could not copy ${file.src}: ${errorMessage}`);
      }
    }

    // Create package manifest
    try {
      const manifest = {
        name: "@discere-os/zlib.wasm",
        version: "1.4.2",
        buildTime: new Date().toISOString(),
        source: "deno-first",
        target: "nodejs-compatibility",
        assets: wasmFiles.map(f => f.src.split('/').pop()),
        dualArchitecture: {
          sideModule: "zlib-side.wasm",
          mainModule: "zlib-release.js",
          fallback: "zlib-fallback.js"
        },
        features: [
          "SIMD optimizations",
          "Dynamic linking",
          "TypeScript-first",
          "CDN fallbacks",
          "Memory efficient"
        ]
      };

      Deno.writeTextFileSync("npm/manifest.json", JSON.stringify(manifest, null, 2));
      console.log("   ✅ Package manifest: manifest.json");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn("   ⚠️  Could not create manifest:", errorMessage);
    }

    console.log("\n🎉 NPM package build completed!");
  },
});

console.log("\n📋 Build Summary:");
console.log("   📂 Output: npm/ directory");
console.log("   🔧 Formats: ESM + CommonJS + TypeScript definitions");
console.log("   📦 Assets: WASM files included (if available)");
console.log("   🚀 Ready: npm publish from npm/ directory");
console.log("\n💡 Next Steps:");
console.log("   1. cd npm && npm publish --dry-run  # Test package");
console.log("   2. cd npm && npm publish            # Publish to registry");
console.log("   3. Or use: deno task publish:npm   # Automated publish");

// Performance note
console.log("\n⚡ Performance Benefits:");
console.log("   • Deno-first development: Direct TypeScript execution");
console.log("   • Node.js compatibility: Generated via dnt transformation");
console.log("   • Universal deployment: Same code runs everywhere");
console.log("   • Zero configuration: No build pipeline required for Deno");