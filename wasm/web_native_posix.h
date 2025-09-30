/*
 * Web-Native POSIX Function Declarations
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 *
 * Declares web-native implementations of POSIX functions for zlib.wasm
 */

#ifndef WEB_NATIVE_POSIX_H
#define WEB_NATIVE_POSIX_H

#ifdef USE_WEB_NATIVE_POSIX

// Include standard headers first
#include <sys/types.h>
#include <fcntl.h>

// Include unistd.h to get the standard declarations, then override
#ifdef __EMSCRIPTEN__
#include <unistd.h>
#endif

#ifdef __cplusplus
extern "C" {
#endif

// Override POSIX functions with web-native implementations
#ifdef __EMSCRIPTEN__
#undef read
#undef write
#undef lseek
#undef close
#undef open
#endif

// Web-native POSIX function declarations
ssize_t read(int fd, void* buf, size_t count);
ssize_t write(int fd, const void* buf, size_t count);
off_t lseek(int fd, off_t offset, int whence);
int close(int fd);
int open(const char* pathname, int flags, ...);

// Initialize web-native POSIX replacement system
void web_native_posix_init(void);

#ifdef __cplusplus
}
#endif

#endif // USE_WEB_NATIVE_POSIX

#endif // WEB_NATIVE_POSIX_H
