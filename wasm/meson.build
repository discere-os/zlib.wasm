zlib_wasm_cargs = ['-msimd128', '-DUSE_WEB_NATIVE_POSIX=1']

sources_core = files(
  '../adler32.c','../compress.c','../crc32.c','../deflate.c','../infback.c','../inffast.c','../inflate.c','../inftrees.c','../trees.c','../uncompr.c','../zutil.c',
  '../gzlib.c','../gzread.c','../gzwrite.c','../gzclose.c',
  'web_native_posix.c',
  'web_native_simd_checksums.c',
  'inffast_simd.c'
)

inc = include_directories('..')

main_link_args = [
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sEXPORT_NAME=ZlibModule',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString","getValue","setValue","HEAPU8","HEAP32","HEAPU32"]',
  '-sEXPORTED_FUNCTIONS=["_malloc","_free"]',
  '-O3','-flto',
]

executable('zlib-main',
  ['zlib_wasm_module.c'] + sources_core,
  include_directories: inc,
  c_args: zlib_wasm_cargs,
  link_args: main_link_args,
  install: true,
  install_dir: get_option('bindir')
)

side_link_args = [
  '-sSIDE_MODULE=2',
  '-fPIC','-O3','-flto',
]

shared_module('zlib-side',
  ['zlib_wasm_side.c'] + sources_core,
  include_directories: inc,
  name_prefix: '',
  name_suffix: 'wasm',
  c_args: zlib_wasm_cargs,
  link_args: side_link_args,
  install: true,
  install_dir: get_option('libdir')
)

# Static library for linking by dependent libraries
zlib_lib = static_library('z',
  sources_core,
  include_directories: inc,
  c_args: zlib_wasm_cargs,
  install: true,
  install_dir: get_option('libdir')
)

# Install headers for dependency chain
install_headers(
  '../zlib.h',
  '../zconf.h',
  subdir: '.'
)

