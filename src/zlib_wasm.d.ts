/**
 * TypeScript definitions for zlib.wasm
 * Foundation Tier 1 WASM ecosystem library
 */

export interface PerformanceMetrics {
    compressionTime: number;
    decompressionTime: number;
    compressionRatio: number;
    throughput: number;
}

export interface InitializationOptions {
    simd?: boolean;
    memory?: {
        initial?: number;
        maximum?: number;
    };
}

export interface StreamProcessResult {
    output: Uint8Array;
    bytesRead: number;
    bytesWritten: number;
    finished: boolean;
}

export class ZlibWASM {
    /**
     * Initialize zlib WASM module
     */
    static initialize(wasmPath: string | ArrayBuffer, options?: InitializationOptions): Promise<ZlibWASM>;

    /**
     * Compress data using zlib
     */
    compress(data: Uint8Array, level?: number): Uint8Array;

    /**
     * Decompress zlib compressed data
     */
    decompress(data: Uint8Array, expectedSize?: number | null): Uint8Array;

    /**
     * Calculate CRC32 checksum
     */
    crc32(data: Uint8Array, crc?: number): number;

    /**
     * Calculate Adler32 checksum
     */
    adler32(data: Uint8Array, adler?: number): number;

    /**
     * Get zlib version string
     */
    version(): string;

    /**
     * Get performance metrics from last operation
     */
    getPerformanceMetrics(): PerformanceMetrics;

    /**
     * Check if SIMD optimization is available
     */
    hasSIMDSupport(): boolean;

    /**
     * Get maximum size after compression for given input size
     */
    compressBound(inputSize: number): number;

    /**
     * Create streaming compression interface
     */
    createCompressionStream(level?: number, windowBits?: number, memLevel?: number, strategy?: number): ZlibCompressionStream;

    /**
     * Create streaming decompression interface
     */
    createDecompressionStream(windowBits?: number): ZlibDecompressionStream;
}

export class ZlibCompressionStream {
    /**
     * Process input data through compression stream
     */
    process(input: Uint8Array, flush?: number): StreamProcessResult;

    /**
     * Finish compression and clean up resources
     */
    finish(): void;
}

export class ZlibDecompressionStream {
    /**
     * Process input data through decompression stream
     */
    process(input: Uint8Array): StreamProcessResult;

    /**
     * Finish decompression and clean up resources
     */
    finish(): void;
}

// Constants
export const enum CompressionLevel {
    NO_COMPRESSION = 0,
    BEST_SPEED = 1,
    BEST_COMPRESSION = 9,
    DEFAULT_COMPRESSION = 6
}

export const enum CompressionStrategy {
    DEFAULT_STRATEGY = 0,
    FILTERED = 1,
    HUFFMAN_ONLY = 2,
    RLE = 3,
    FIXED = 4
}

export const enum FlushMode {
    NO_FLUSH = 0,
    PARTIAL_FLUSH = 1,
    SYNC_FLUSH = 2,
    FULL_FLUSH = 3,
    FINISH = 4
}

export const enum ReturnCode {
    OK = 0,
    STREAM_END = 1,
    NEED_DICT = 2,
    ERRNO = -1,
    STREAM_ERROR = -2,
    DATA_ERROR = -3,
    MEM_ERROR = -4,
    BUF_ERROR = -5,
    VERSION_ERROR = -6
}

// Default export
export default ZlibWASM;