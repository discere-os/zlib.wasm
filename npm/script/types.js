"use strict";
/**
 * zlib.wasm TypeScript definitions
 * High-performance compression with SIMD optimizations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZlibInitError = exports.ZlibCompressionError = exports.ZlibMemoryError = exports.ZlibError = exports.ZlibStrategy = exports.ZlibCompression = void 0;
// Compression levels
var ZlibCompression;
(function (ZlibCompression) {
    ZlibCompression[ZlibCompression["NO_COMPRESSION"] = 0] = "NO_COMPRESSION";
    ZlibCompression[ZlibCompression["BEST_SPEED"] = 1] = "BEST_SPEED";
    ZlibCompression[ZlibCompression["DEFAULT_COMPRESSION"] = 6] = "DEFAULT_COMPRESSION";
    ZlibCompression[ZlibCompression["BEST_COMPRESSION"] = 9] = "BEST_COMPRESSION";
})(ZlibCompression || (exports.ZlibCompression = ZlibCompression = {}));
// Compression strategies
var ZlibStrategy;
(function (ZlibStrategy) {
    ZlibStrategy[ZlibStrategy["DEFAULT_STRATEGY"] = 0] = "DEFAULT_STRATEGY";
    ZlibStrategy[ZlibStrategy["FILTERED"] = 1] = "FILTERED";
    ZlibStrategy[ZlibStrategy["HUFFMAN_ONLY"] = 2] = "HUFFMAN_ONLY";
    ZlibStrategy[ZlibStrategy["RLE"] = 3] = "RLE";
    ZlibStrategy[ZlibStrategy["FIXED"] = 4] = "FIXED";
})(ZlibStrategy || (exports.ZlibStrategy = ZlibStrategy = {}));
// Error classes
class ZlibError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ZlibError';
    }
}
exports.ZlibError = ZlibError;
class ZlibMemoryError extends ZlibError {
    constructor(message) {
        super(message);
        this.name = 'ZlibMemoryError';
    }
}
exports.ZlibMemoryError = ZlibMemoryError;
class ZlibCompressionError extends ZlibError {
    constructor(message) {
        super(message);
        this.name = 'ZlibCompressionError';
    }
}
exports.ZlibCompressionError = ZlibCompressionError;
class ZlibInitError extends ZlibError {
    constructor(message) {
        super(message);
        this.name = 'ZlibInitError';
    }
}
exports.ZlibInitError = ZlibInitError;
