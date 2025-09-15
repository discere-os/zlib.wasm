/**
 * zlib.wasm TypeScript definitions
 * High-performance compression with SIMD optimizations
 */
// Compression levels
export var ZlibCompression;
(function (ZlibCompression) {
    ZlibCompression[ZlibCompression["NO_COMPRESSION"] = 0] = "NO_COMPRESSION";
    ZlibCompression[ZlibCompression["BEST_SPEED"] = 1] = "BEST_SPEED";
    ZlibCompression[ZlibCompression["DEFAULT_COMPRESSION"] = 6] = "DEFAULT_COMPRESSION";
    ZlibCompression[ZlibCompression["BEST_COMPRESSION"] = 9] = "BEST_COMPRESSION";
})(ZlibCompression || (ZlibCompression = {}));
// Compression strategies
export var ZlibStrategy;
(function (ZlibStrategy) {
    ZlibStrategy[ZlibStrategy["DEFAULT_STRATEGY"] = 0] = "DEFAULT_STRATEGY";
    ZlibStrategy[ZlibStrategy["FILTERED"] = 1] = "FILTERED";
    ZlibStrategy[ZlibStrategy["HUFFMAN_ONLY"] = 2] = "HUFFMAN_ONLY";
    ZlibStrategy[ZlibStrategy["RLE"] = 3] = "RLE";
    ZlibStrategy[ZlibStrategy["FIXED"] = 4] = "FIXED";
})(ZlibStrategy || (ZlibStrategy = {}));
// Error classes
export class ZlibError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ZlibError';
    }
}
export class ZlibMemoryError extends ZlibError {
    constructor(message) {
        super(message);
        this.name = 'ZlibMemoryError';
    }
}
export class ZlibCompressionError extends ZlibError {
    constructor(message) {
        super(message);
        this.name = 'ZlibCompressionError';
    }
}
export class ZlibInitError extends ZlibError {
    constructor(message) {
        super(message);
        this.name = 'ZlibInitError';
    }
}
