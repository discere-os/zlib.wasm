/*
 * Web-Native POSIX Function Replacements
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 *
 * Provides web-native implementations of POSIX functions for zlib.wasm
 */

#include <emscripten.h>
#include <stdio.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/types.h>
#include <unistd.h>
#include "web_native_posix.h"

#ifdef __cplusplus
extern "C" {
#endif

// Web-native file operations using browser APIs
// These replace the missing POSIX functions read(), write(), lseek(), close()

// File handle structure for web-native file operations
typedef struct {
    FILE* file;
    int fd;
    int flags;
    long position;
} web_file_handle_t;

static web_file_handle_t g_file_handles[256];
static int g_next_fd = 3; // Start after stdin, stdout, stderr

// Web-native read() replacement
ssize_t read(int fd, void* buf, size_t count) {
    if (fd < 0 || fd >= 256 || !g_file_handles[fd].file) {
        errno = EBADF;
        return -1;
    }

    web_file_handle_t* handle = &g_file_handles[fd];
    size_t bytes_read = fread(buf, 1, count, handle->file);

    if (bytes_read == 0 && ferror(handle->file)) {
        errno = EIO;
        return -1;
    }

    handle->position += bytes_read;
    return (ssize_t)bytes_read;
}

// Web-native write() replacement
ssize_t write(int fd, const void* buf, size_t count) {
    if (fd < 0 || fd >= 256 || !g_file_handles[fd].file) {
        errno = EBADF;
        return -1;
    }

    web_file_handle_t* handle = &g_file_handles[fd];
    size_t bytes_written = fwrite(buf, 1, count, handle->file);

    if (bytes_written == 0 && ferror(handle->file)) {
        errno = EIO;
        return -1;
    }

    handle->position += bytes_written;
    return (ssize_t)bytes_written;
}

// Web-native lseek() replacement
off_t lseek(int fd, off_t offset, int whence) {
    if (fd < 0 || fd >= 256 || !g_file_handles[fd].file) {
        errno = EBADF;
        return -1;
    }

    web_file_handle_t* handle = &g_file_handles[fd];

    if (fseek(handle->file, offset, whence) != 0) {
        errno = EINVAL;
        return -1;
    }

    long position = ftell(handle->file);
    if (position == -1) {
        errno = EIO;
        return -1;
    }

    handle->position = position;
    return (off_t)position;
}

// Web-native close() replacement
int close(int fd) {
    if (fd < 0 || fd >= 256 || !g_file_handles[fd].file) {
        errno = EBADF;
        return -1;
    }

    web_file_handle_t* handle = &g_file_handles[fd];
    int result = fclose(handle->file);

    // Clear the handle
    handle->file = NULL;
    handle->fd = -1;
    handle->flags = 0;
    handle->position = 0;

    return result;
}

// Web-native open() replacement for completeness
int open(const char* pathname, int flags, ...) {
    if (g_next_fd >= 256) {
        errno = EMFILE;
        return -1;
    }

    const char* mode;
    if (flags & O_WRONLY) {
        mode = (flags & O_APPEND) ? "ab" : "wb";
    } else if (flags & O_RDWR) {
        mode = (flags & O_APPEND) ? "a+b" : "r+b";
    } else {
        mode = "rb";
    }

    FILE* file = fopen(pathname, mode);
    if (!file) {
        return -1;
    }

    int fd = g_next_fd++;
    g_file_handles[fd].file = file;
    g_file_handles[fd].fd = fd;
    g_file_handles[fd].flags = flags;
    g_file_handles[fd].position = 0;

    return fd;
}

// Initialize web-native POSIX replacement system
EMSCRIPTEN_KEEPALIVE
void web_native_posix_init(void) {
    // Initialize file handle table
    for (int i = 0; i < 256; i++) {
        g_file_handles[i].file = NULL;
        g_file_handles[i].fd = -1;
        g_file_handles[i].flags = 0;
        g_file_handles[i].position = 0;
    }

    // Set up standard streams
    g_file_handles[0].file = stdin;
    g_file_handles[0].fd = 0;
    g_file_handles[1].file = stdout;
    g_file_handles[1].fd = 1;
    g_file_handles[2].file = stderr;
    g_file_handles[2].fd = 2;
}

#ifdef __cplusplus
}
#endif
