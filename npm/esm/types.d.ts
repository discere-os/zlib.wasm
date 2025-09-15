/**
 * zlib.wasm TypeScript definitions
 * High-performance compression with SIMD optimizations
 */
export declare enum ZlibCompression {
    NO_COMPRESSION = 0,
    BEST_SPEED = 1,
    DEFAULT_COMPRESSION = 6,
    BEST_COMPRESSION = 9
}
export declare enum ZlibStrategy {
    DEFAULT_STRATEGY = 0,
    FILTERED = 1,
    HUFFMAN_ONLY = 2,
    RLE = 3,
    FIXED = 4
}
export interface ZlibModule {
    _zlib_compress_buffer: (dataPtr: number, size: number, level: number, strategy: number) => ZlibWASMResult;
    _zlib_decompress_buffer: (dataPtr: number, size: number) => ZlibWASMResult;
    _zlib_crc32: (dataPtr: number, size: number) => number;
    _zlib_adler32: (dataPtr: number, size: number) => number;
    _zlib_get_version: () => string;
    _zlib_simd_supported: () => boolean;
    _zlib_simd_capabilities: () => string;
    _zlib_compress_bound: (sourceLen: number) => number;
    _zlib_cleanup?: () => void;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    HEAPU8: Uint8Array;
    HEAP32: Int32Array;
    cwrap: (name: string, returnType: string, argTypes: string[]) => Function;
    ccall: (name: string, returnType: string, argTypes: string[], args: any[]) => any;
    FS?: {
        readFile: (path: string) => Uint8Array;
        writeFile: (path: string, data: Uint8Array) => void;
    };
    [key: string]: any;
}
export interface ZlibWASMResult {
    dataPtr: number;
    size: number;
    simdUsed: boolean;
}
export interface ZlibOptions {
    level?: ZlibCompression | number;
    strategy?: ZlibStrategy;
    windowBits?: number;
    memLevel?: number;
}
export interface ZlibResult {
    data: Uint8Array;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
    simdAccelerated: boolean;
}
export interface ZlibCapabilities {
    simdSupported: boolean;
    simdCapabilities: string;
    version: string;
    maxMemoryMB: number;
    compressionLevels: number[];
    strategies: ZlibStrategy[];
}
export interface ZlibLoadingOptions {
    cdnUrl?: string;
    fallbackUrls?: string[];
    cachingEnabled?: boolean;
    simdOptimizations?: boolean;
    maxMemoryMB?: number;
}
export interface CompressionPerformance {
    compressionSpeed: number;
    decompressionSpeed: number;
    memoryUsage: number;
    simdGain: number;
}
export interface BenchmarkResult {
    operation: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    throughput: number;
    simdAccelerated: boolean;
}
export declare class ZlibError extends Error {
    constructor(message: string);
}
export declare class ZlibMemoryError extends ZlibError {
    constructor(message: string);
}
export declare class ZlibCompressionError extends ZlibError {
    constructor(message: string);
}
export declare class ZlibInitError extends ZlibError {
    constructor(message: string);
}
