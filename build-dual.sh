#!/bin/bash
# build-dual.sh - Dual build system for zlib.wasm (SIDE_MODULE + MAIN_MODULE)
#
# Copyright (C) 1995-2024 Jean-loup Gailly and Mark Adler  
# Copyright 2025 Superstruct Ltd, New Zealand
#
# This source code is licensed under the Zlib license found in the
# LICENSE file in the root directory of this source tree.

set -euo pipefail

# Configuration
BUILD_TYPE="${BUILD_TYPE:-Release}"
INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"
BUILD_DIR="${BUILD_DIR:-./build-dual}"
VARIANT="${1:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build zlib.wasm as SIDE_MODULE for dynamic loading
build_zlib_side_module() {
    log_info "Building zlib.wasm as SIDE_MODULE for production dynamic loading..."

    mkdir -p "${BUILD_DIR}-side"
    cd "${BUILD_DIR}-side"

    # Core zlib sources
    ZLIB_SOURCES="../adler32.c ../compress.c ../crc32.c ../deflate.c ../infback.c ../inffast.c ../inflate.c ../inftrees.c ../trees.c ../uncompr.c ../zutil.c"

    # SIDE_MODULE optimized build
    emcc ${ZLIB_SOURCES} ../src/wasm_module_side.c \
        -I.. \
        -DHAVE_UNISTD_H=0 \
        -O3 \
        -flto \
        -msimd128 \
        -sSIDE_MODULE=1 \
        -sSTANDALONE_WASM=1 \
        -o zlib-side.wasm

    log_success "SIDE_MODULE build completed: $(pwd)/zlib-side.wasm"
    cd ..
}

# Build zlib.wasm as MAIN_MODULE for testing
build_zlib_main_module() {
    log_info "Building zlib.wasm as MAIN_MODULE for testing..."

    mkdir -p "${BUILD_DIR}-main-release"
    cd "${BUILD_DIR}-main-release"

    # Core zlib sources
    ZLIB_SOURCES="../adler32.c ../compress.c ../crc32.c ../deflate.c ../infback.c ../inffast.c ../inflate.c ../inftrees.c ../trees.c ../uncompr.c ../zutil.c"

    # MAIN_MODULE build with JS glue  
    emcc ${ZLIB_SOURCES} ../src/wasm_module.c \
        -I.. \
        -DHAVE_UNISTD_H=0 \
        -O3 \
        -flto \
        -msimd128 \
        -sWASM=1 \
        -sMODULARIZE=1 \
        -sEXPORT_NAME="ZlibModule" \
        -sEXPORTED_FUNCTIONS='["_zlib_compress_buffer","_zlib_decompress_buffer","_zlib_crc32","_zlib_adler32","_zlib_compress_bound","_zlib_get_version","_malloc","_free"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","getValue","setValue","HEAPU8","HEAP8","HEAP32"]' \
        -o zlib-release.js

    # Also build optimized version for tests
    emcc ${ZLIB_SOURCES} ../src/wasm_module.c \
        -I.. \
        -DHAVE_UNISTD_H=0 \
        -O3 \
        -flto \
        -msimd128 \
        -sWASM=1 \
        -sMODULARIZE=1 \
        -sEXPORT_NAME="ZlibModule" \
        -sEXPORTED_FUNCTIONS='["_zlib_compress_buffer","_zlib_decompress_buffer","_zlib_crc32","_zlib_adler32","_zlib_compress_bound","_zlib_get_version","_malloc","_free"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","getValue","setValue","HEAPU8","HEAP8","HEAP32"]' \
        -o zlib-optimized.js

    log_success "MAIN_MODULE build completed: $(pwd)/zlib-release.js"
    cd ..
}

# Install artifacts
install_artifacts() {
    log_info "Installing build artifacts..."
    
    mkdir -p "${INSTALL_PREFIX}/wasm"
    mkdir -p "${INSTALL_PREFIX}/include"
    
    # Copy WASM artifacts
    if [ -f "${BUILD_DIR}-side/zlib-side.wasm" ]; then
        cp "${BUILD_DIR}-side/zlib-side.wasm" "${INSTALL_PREFIX}/wasm/"
        log_success "Installed SIDE_MODULE: ${INSTALL_PREFIX}/wasm/zlib-side.wasm"
    fi
    
    if [ -f "${BUILD_DIR}-main-release/zlib-release.js" ]; then
        cp "${BUILD_DIR}-main-release/zlib-release.js" "${INSTALL_PREFIX}/wasm/"
        cp "${BUILD_DIR}-main-release/zlib-release.wasm" "${INSTALL_PREFIX}/wasm/"
        log_success "Installed MAIN_MODULE: ${INSTALL_PREFIX}/wasm/zlib-release.js"
    fi
    
    if [ -f "${BUILD_DIR}-main-release/zlib-optimized.js" ]; then
        cp "${BUILD_DIR}-main-release/zlib-optimized.js" "${INSTALL_PREFIX}/wasm/"
        cp "${BUILD_DIR}-main-release/zlib-optimized.wasm" "${INSTALL_PREFIX}/wasm/"
        log_success "Installed OPTIMIZED_MODULE: ${INSTALL_PREFIX}/wasm/zlib-optimized.js"
    fi
    
    # Copy headers
    cp zlib.h "${INSTALL_PREFIX}/include/"
    cp zconf.h "${INSTALL_PREFIX}/include/"
    
    log_success "Installation complete in ${INSTALL_PREFIX}/"
}

# Clean build artifacts
clean_build() {
    log_info "Cleaning build artifacts..."
    
    rm -rf "${BUILD_DIR}-side" "${BUILD_DIR}-main-release" "${BUILD_DIR}-main-fallback" "${BUILD_DIR}-main-simd"
    rm -rf "${INSTALL_PREFIX}"
    rm -rf build/
    rm -rf dist/
    
    log_success "Build artifacts cleaned"
}

# Main build logic
main() {
    case "${VARIANT}" in
        "clean")
            clean_build
            ;;
        "side")
            build_zlib_side_module
            install_artifacts
            ;;
        "main")
            build_zlib_main_module
            install_artifacts
            ;;
        "all")
            build_zlib_side_module
            build_zlib_main_module
            install_artifacts
            ;;
        *)
            log_error "Unknown variant: ${VARIANT}. Use 'clean', 'side', 'main', or 'all'"
            exit 1
            ;;
    esac
    
    if [ "${VARIANT}" != "clean" ]; then
        log_success "Build completed for variant: ${VARIANT}"
    fi
}

# Check for emcc
if ! command -v emcc &> /dev/null; then
    log_error "emcc not found. Please install Emscripten SDK"
    exit 1
fi

main "$@"