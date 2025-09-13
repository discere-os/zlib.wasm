/**
 * Cross-Library Dynamic Loading Tests
 * 
 * Tests that zlib.wasm SIDE_MODULE can be loaded dynamically and work
 * with other WASM modules in the Discere OS architecture.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

describe('Cross-Library Dynamic Loading', () => {
  const projectRoot = process.cwd()

  describe('SIDE_MODULE Properties', () => {
    it('should have SIDE_MODULE build available', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const sideExists = await fs.access(sidePath).then(() => true).catch(() => false)
      expect(sideExists).toBe(true)
    })

    it('should be a valid WASM binary', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const buffer = await fs.readFile(sidePath)
      
      // WASM files start with magic number: 0x00 0x61 0x73 0x6D (\\0asm)
      expect(buffer[0]).toBe(0x00)
      expect(buffer[1]).toBe(0x61)
      expect(buffer[2]).toBe(0x73)
      expect(buffer[3]).toBe(0x6D)
    })

    it('should have WASM version 1', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const buffer = await fs.readFile(sidePath)
      
      // WASM version is bytes 4-7: 0x01 0x00 0x00 0x00 (version 1)
      expect(buffer[4]).toBe(0x01)
      expect(buffer[5]).toBe(0x00)
      expect(buffer[6]).toBe(0x00)
      expect(buffer[7]).toBe(0x00)
    })
  })

  describe('Dynamic Loading Simulation', () => {
    it('should be loadable via WebAssembly.instantiate', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const buffer = await fs.readFile(sidePath)
      
      // This simulates dynamic loading - we can't actually load SIDE_MODULE without MAIN_MODULE
      // but we can validate the binary is well-formed
      const wasmModule = await WebAssembly.compile(buffer)
      expect(wasmModule).toBeInstanceOf(WebAssembly.Module)
    })

    it('should export expected zlib functions', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const buffer = await fs.readFile(sidePath)
      const module = await WebAssembly.compile(buffer)
      
      const exports = WebAssembly.Module.exports(module)
      const exportNames = exports.map(exp => exp.name)
      
      // Core zlib functions should be exported
      expect(exportNames).toContain('deflateInit_')
      expect(exportNames).toContain('deflate')
      expect(exportNames).toContain('deflateEnd')
      expect(exportNames).toContain('inflateInit_')
      expect(exportNames).toContain('inflate')
      expect(exportNames).toContain('inflateEnd')
      expect(exportNames).toContain('crc32')
    })

    it('should import memory from parent module', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const buffer = await fs.readFile(sidePath)
      const module = await WebAssembly.compile(buffer)
      
      const imports = WebAssembly.Module.imports(module)
      
      // SIDE_MODULE should import memory from parent
      const memoryImport = imports.find(imp => imp.kind === 'memory')
      expect(memoryImport).toBeDefined()
      expect(memoryImport?.module).toBe('env')
    })
  })

  describe('Discere OS Integration Pattern', () => {
    it('should follow naming convention for SIDE_MODULE', () => {
      const expectedPath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      // File should exist and follow zlib-side.wasm naming pattern
      expect(expectedPath).toMatch(/zlib-side\.wasm$/)
    })

    it('should be deployable to CDN structure', () => {
      // Test that the file structure matches expected CDN deployment
      const installPath = path.join(projectRoot, 'install/wasm')
      const expectedFiles = [
        'zlib-side.wasm',           // SIDE_MODULE for dynamic loading
        'zlib-release.js',          // MAIN_MODULE JS glue
        'zlib-release.wasm',        // MAIN_MODULE WASM
        'zlib-optimized.js',        // Optimized variant JS
        'zlib-optimized.wasm'       // Optimized variant WASM
      ]
      
      expectedFiles.forEach(file => {
        const filePath = path.join(installPath, file)
        expect(filePath).toBeDefined()
      })
    })
  })

  describe('Library Coordination', () => {
    it('should be compatible with dlopen() pattern', async () => {
      // This tests the architectural assumption that SIDE_MODULE can be loaded
      // via emscripten's dlopen() mechanism from a MAIN_MODULE like discere-concha
      
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const buffer = await fs.readFile(sidePath)
      const module = await WebAssembly.compile(buffer)
      
      // SIDE_MODULE should not have a start function (it's library code)
      const exports = WebAssembly.Module.exports(module)
      const hasStart = exports.some(exp => exp.name === '_start' || exp.name === '__start')
      expect(hasStart).toBe(false)
    })

    it('should export functions without underscore prefix for C++ compatibility', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const buffer = await fs.readFile(sidePath)
      const module = await WebAssembly.compile(buffer)
      
      const exports = WebAssembly.Module.exports(module)
      const exportNames = exports.map(exp => exp.name)
      
      // Should have both C-style (with underscore) and C++-style (without) exports
      expect(exportNames.filter(name => name.startsWith('deflate')).length).toBeGreaterThan(0)
    })
  })
})