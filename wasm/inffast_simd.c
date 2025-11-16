/**
 * SIMD-Optimized Inflate Fast Path for zlib
 *
 * Provides SIMD-accelerated memory copying for inflate_fast()
 * Target: 3x+ speedup for match copying operations
 */

#include "inffast_simd.h"
#include "zutil.h"
#include "inftrees.h"
#include "inflate.h"

#ifdef __wasm_simd128__
#include <wasm_simd128.h>
#define HAVE_INFLATE_SIMD 1
#else
#define HAVE_INFLATE_SIMD 0
#endif

/* Runtime SIMD detection */
int inflate_have_simd(void) {
    return HAVE_INFLATE_SIMD;
}

#ifdef HAVE_INFLATE_SIMD

/* SIMD-optimized memory copy for inflate match copying
 * Significantly faster than byte-by-byte copy for len >= 16 */
static inline void inflate_copy_simd(unsigned char *out, const unsigned char *from, unsigned len) {
    /* For very short lengths, use scalar copy */
    if (len < 16) {
        while (len--) {
            *out++ = *from++;
        }
        return;
    }

    /* SIMD copy for 16-byte chunks */
    while (len >= 16) {
        v128_t chunk = wasm_v128_load((const v128_t*)from);
        wasm_v128_store((v128_t*)out, chunk);
        from += 16;
        out += 16;
        len -= 16;
    }

    /* Handle remaining bytes */
    while (len--) {
        *out++ = *from++;
    }
}

/* SIMD-optimized inflate_fast implementation */
void ZLIB_INTERNAL inflate_fast_simd(z_streamp strm, unsigned start) {
    struct inflate_state FAR *state;
    z_const unsigned char FAR *in;
    z_const unsigned char FAR *last;
    unsigned char FAR *out;
    unsigned char FAR *beg;
    unsigned char FAR *end;
#ifdef INFLATE_STRICT
    unsigned dmax;
#endif
    unsigned wsize;
    unsigned whave;
    unsigned wnext;
    unsigned char FAR *window;
    unsigned long hold;
    unsigned bits;
    code const FAR *lcode;
    code const FAR *dcode;
    unsigned lmask;
    unsigned dmask;
    code const *here;
    unsigned op;
    unsigned len;
    unsigned dist;
    unsigned char FAR *from;

    /* Copy state to local variables */
    state = (struct inflate_state FAR *)strm->state;
    in = strm->next_in;
    last = in + (strm->avail_in - 5);
    out = strm->next_out;
    beg = out - (start - strm->avail_out);
    end = out + (strm->avail_out - 257);
#ifdef INFLATE_STRICT
    dmax = state->dmax;
#endif
    wsize = state->wsize;
    whave = state->whave;
    wnext = state->wnext;
    window = state->window;
    hold = state->hold;
    bits = state->bits;
    lcode = state->lencode;
    dcode = state->distcode;
    lmask = (1U << state->lenbits) - 1;
    dmask = (1U << state->distbits) - 1;

    /* Decode loop - same logic as original but with SIMD copy */
    do {
        if (bits < 15) {
            hold += (unsigned long)(*in++) << bits;
            bits += 8;
            hold += (unsigned long)(*in++) << bits;
            bits += 8;
        }
        here = lcode + (hold & lmask);
      dolen:
        op = (unsigned)(here->bits);
        hold >>= op;
        bits -= op;
        op = (unsigned)(here->op);
        if (op == 0) {
            /* Literal */
            *out++ = (unsigned char)(here->val);
        }
        else if (op & 16) {
            /* Length base */
            len = (unsigned)(here->val);
            op &= 15;
            if (op) {
                if (bits < op) {
                    hold += (unsigned long)(*in++) << bits;
                    bits += 8;
                }
                len += (unsigned)hold & ((1U << op) - 1);
                hold >>= op;
                bits -= op;
            }
            if (bits < 15) {
                hold += (unsigned long)(*in++) << bits;
                bits += 8;
                hold += (unsigned long)(*in++) << bits;
                bits += 8;
            }
            here = dcode + (hold & dmask);
          dodist:
            op = (unsigned)(here->bits);
            hold >>= op;
            bits -= op;
            op = (unsigned)(here->op);
            if (op & 16) {
                /* Distance base */
                dist = (unsigned)(here->val);
                op &= 15;
                if (bits < op) {
                    hold += (unsigned long)(*in++) << bits;
                    bits += 8;
                    if (bits < op) {
                        hold += (unsigned long)(*in++) << bits;
                        bits += 8;
                    }
                }
                dist += (unsigned)hold & ((1U << op) - 1);
#ifdef INFLATE_STRICT
                if (dist > dmax) {
                    strm->msg = (z_const char *)"invalid distance too far back";
                    state->mode = BAD;
                    break;
                }
#endif
                hold >>= op;
                bits -= op;
                op = (unsigned)(out - beg);
                if (dist > op) {
                    /* Copy from window */
                    op = dist - op;
                    if (op > whave) {
                        if (state->sane) {
                            strm->msg = (z_const char *)"invalid distance too far back";
                            state->mode = BAD;
                            break;
                        }
                    }
                    from = window;
                    if (wnext == 0) {
                        from += wsize - op;
                        if (op < len) {
                            len -= op;
                            /* SIMD-optimized copy */
                            inflate_copy_simd(out, from, op);
                            out += op;
                            from = out - dist;
                        }
                    }
                    else if (wnext < op) {
                        from += wsize + wnext - op;
                        op -= wnext;
                        if (op < len) {
                            len -= op;
                            inflate_copy_simd(out, from, op);
                            out += op;
                            from = window;
                            if (wnext < len) {
                                op = wnext;
                                len -= op;
                                inflate_copy_simd(out, from, op);
                                out += op;
                                from = out - dist;
                            }
                        }
                    }
                    else {
                        from += wnext - op;
                        if (op < len) {
                            len -= op;
                            inflate_copy_simd(out, from, op);
                            out += op;
                            from = out - dist;
                        }
                    }
                    /* SIMD-optimized final copy */
                    inflate_copy_simd(out, from, len);
                    out += len;
                }
                else {
                    /* Copy direct from output - SIMD optimized */
                    from = out - dist;
                    inflate_copy_simd(out, from, len);
                    out += len;
                }
            }
            else if ((op & 64) == 0) {
                here = dcode + here->val + (hold & ((1U << op) - 1));
                goto dodist;
            }
            else {
                strm->msg = (z_const char *)"invalid distance code";
                state->mode = BAD;
                break;
            }
        }
        else if ((op & 64) == 0) {
            here = lcode + here->val + (hold & ((1U << op) - 1));
            goto dolen;
        }
        else if (op & 32) {
            state->mode = TYPE;
            break;
        }
        else {
            strm->msg = (z_const char *)"invalid literal/length code";
            state->mode = BAD;
            break;
        }
    } while (in < last && out < end);

    /* Update state from local variables */
    len = bits >> 3;
    in -= len;
    bits -= len << 3;
    hold &= (1U << bits) - 1;
    strm->next_in = in;
    strm->next_out = out;
    strm->avail_in = (unsigned)(in < last ? 5 + (last - in) : 5 - (in - last));
    strm->avail_out = (unsigned)(out < end ? 257 + (end - out) : 257 - (out - end));
    state->hold = hold;
    state->bits = bits;
}

#else /* No SIMD available */

/* Fallback to standard inflate_fast */
void ZLIB_INTERNAL inflate_fast_simd(z_streamp strm, unsigned start) {
    /* This will use the standard inflate_fast from inffast.c */
    extern void ZLIB_INTERNAL inflate_fast(z_streamp strm, unsigned start);
    inflate_fast(strm, start);
}

#endif /* HAVE_INFLATE_SIMD */
