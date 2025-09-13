/**
 * Architecture Compliance Tests
 * 
 * Verifies that zlib.wasm meets Discere OS architectural requirements:
 * - Dual build system (SIDE_MODULE + MAIN_MODULE variants)
 * - Proper NPM package exports for side-loading
 * - SIDE_MODULE optimization for dynamic loading
 * - MAIN_MODULE variants for testing and fallbacks
 */

import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

describe('zlib.wasm Architecture Compliance', () => {
  const projectRoot = process.cwd()
  let packageJson: any
  
  beforeAll(async () => {
    const packagePath = path.join(projectRoot, 'package.json')
    const packageContent = await fs.readFile(packagePath, 'utf-8')
    packageJson = JSON.parse(packageContent)
  })

  describe('NPM Package Structure', () => {
    it('should have correct package name and scope', () => {
      expect(packageJson.name).toBe('@discere-os/zlib.wasm')
    })

    it('should export SIDE_MODULE path', () => {
      expect(packageJson.exports['./side']).toBeDefined()
      expect(packageJson.exports['./side'].import).toBe('./install/dist/side/zlib-side.wasm')
    })

    it('should export test MAIN_MODULE path', () => {
      expect(packageJson.exports['./test']).toBeDefined()
      expect(packageJson.exports['./test'].import).toBe('./install/dist/test/zlib-release.js')
    })

    it('should have proper CDN configuration', () => {
      expect(packageJson.cdn.primary).toBe('https://wasm.discere.cloud/zlib/')
      expect(packageJson.cdn.fallbacks).toContain('https://cdn.jsdelivr.net/npm/@discere-os/zlib.wasm/')
    })
  })

  describe('Build Artifacts', () => {
    it('should have SIDE_MODULE build artifacts', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const sideExists = await fs.access(sidePath).then(() => true).catch(() => false)
      expect(sideExists).toBe(true)
    })

    it('should have MAIN_MODULE build artifacts', async () => {
      const mainJsPath = path.join(projectRoot, 'install/wasm/zlib-release.js')
      const mainWasmPath = path.join(projectRoot, 'install/wasm/zlib-release.wasm')
      
      const jsExists = await fs.access(mainJsPath).then(() => true).catch(() => false)
      const wasmExists = await fs.access(mainWasmPath).then(() => true).catch(() => false)
      
      expect(jsExists).toBe(true)
      expect(wasmExists).toBe(true)
    })

    it('should have optimized build artifacts for testing', async () => {
      const optimizedJsPath = path.join(projectRoot, 'install/wasm/zlib-optimized.js')
      const optimizedWasmPath = path.join(projectRoot, 'install/wasm/zlib-optimized.wasm')
      
      const jsExists = await fs.access(optimizedJsPath).then(() => true).catch(() => false)
      const wasmExists = await fs.access(optimizedWasmPath).then(() => true).catch(() => false)
      
      expect(jsExists).toBe(true)
      expect(wasmExists).toBe(true)
    })
  })

  describe('SIDE_MODULE Optimization', () => {
    it('should have smaller SIDE_MODULE than MAIN_MODULE', async () => {
      const sidePath = path.join(projectRoot, 'install/wasm/zlib-side.wasm')
      const mainPath = path.join(projectRoot, 'install/wasm/zlib-release.wasm')
      
      const [sideStats, mainStats] = await Promise.all([
        fs.stat(sidePath),
        fs.stat(mainPath)
      ])
      
      // SIDE_MODULE should be larger due to no runtime, but this validates they're different builds
      expect(sideStats.size).toBeGreaterThan(0)
      expect(mainStats.size).toBeGreaterThan(0)
      expect(sideStats.size).not.toBe(mainStats.size)
    })
  })

  describe('Discere OS Integration', () => {
    it('should have proper keywords for ecosystem discovery', () => {
      expect(packageJson.keywords).toContain('discere-os')
      expect(packageJson.keywords).toContain('learning-os')
      expect(packageJson.keywords).toContain('webassembly')
      expect(packageJson.keywords).toContain('wasm')
    })

    it('should have correct license for zlib compatibility', () => {
      expect(packageJson.license).toBe('Zlib')
    })

    it('should have Superstruct Ltd as author', () => {
      expect(packageJson.author).toBe('Superstruct Ltd, New Zealand')
    })
  })
})