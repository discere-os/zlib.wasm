#include <emscripten.h>
#include "zlib.h"

EMSCRIPTEN_KEEPALIVE
const char* zlib_wasm_version(void) {
  return ZLIB_VERSION;
}

