// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Robert Nisipeanu
#include "atlas_scale.h"

#include "yuv_atlas.h"

namespace woc {

namespace {
const uint32_t kOne = 1u << 12;   /* the weights of one output pixel sum to this */
}

/* Output pixel i covers source [i*src/dst, (i+1)*src/dst); each source pixel
 * it touches weighs the length of the overlap, in units of 1/dst of a pixel,
 * normalised so the weights sum to exactly kOne. */
void AtlasScaler::Axis::build(uint32_t src, uint32_t dst)
{
    first.assign(dst, 0);
    count.assign(dst, 0);
    offset.assign(dst, 0);
    weight.clear();
    for (uint32_t i = 0; i < dst; i++) {
        const uint64_t a = (uint64_t)i * src, b = (uint64_t)(i + 1) * src;   /* in 1/dst units */
        const uint32_t s0 = (uint32_t)(a / dst), s1 = (uint32_t)((b + dst - 1) / dst);
        first[i] = s0;
        count[i] = s1 - s0;
        offset[i] = (uint32_t)weight.size();
        uint32_t sum = 0;
        for (uint32_t s = s0; s < s1; s++) {
            const uint64_t lo = (uint64_t)s * dst > a ? (uint64_t)s * dst : a;
            const uint64_t hi = (uint64_t)(s + 1) * dst < b ? (uint64_t)(s + 1) * dst : b;
            const uint32_t wgt = (uint32_t)(((hi - lo) * kOne + src / 2) / src);
            weight.push_back((uint16_t)wgt);
            sum += wgt;
        }
        /* the rounding error goes to the largest weight, so the sum is exact */
        uint32_t big = offset[i];
        for (uint32_t k = offset[i]; k < offset[i] + count[i]; k++)
            if (weight[k] > weight[big])
                big = k;
        weight[big] = (uint16_t)(weight[big] + (int32_t)kOne - (int32_t)sum);
    }
}

bool AtlasScaler::configure(uint32_t w, uint32_t h, uint32_t dw, uint32_t dh, unsigned level_bits)
{
    if (!w || !h || !dw || !dh || w % 2 || h % 2 || dw % 2 || dh % 2 || dw > w || dh > h || level_bits > 3) {
        dw_ = dh_ = 0;
        return false;
    }
    if (w == w_ && h == h_ && dw == dw_ && dh == dh_ && level_bits == bits_)
        return true;
    w_ = w;
    h_ = h;
    dw_ = dw;
    dh_ = dh;
    bits_ = level_bits;
    yx_.build(w, dw);
    yy_.build(h, dh);
    cx_.build(w / 2, dw / 2);
    cy_.build(h / 2, dh / 2);
    return true;
}

/* Horizontal into 16-bit rows (scaled 256: the kOne-weighted sum over 16),
 * then vertical row by row into 32-bit sums (scaled 2^20), so both passes
 * run along memory and the compiler can vectorise the vertical one. */
void AtlasScaler::plane(const uint8_t *src, uint32_t sp, uint32_t sh, uint8_t *dst, uint32_t dp, const Axis &x,
                        const Axis &y)
{
    const uint32_t dw = (uint32_t)x.first.size(), dh = (uint32_t)y.first.size();
    rows_.resize((size_t)sh * dw);
    acc_.resize(dw);
    for (uint32_t r = 0; r < sh; r++) {
        const uint8_t *s = src + (size_t)r * sp;
        uint16_t *o = &rows_[(size_t)r * dw];
        for (uint32_t i = 0; i < dw; i++) {
            const uint8_t *p = s + x.first[i];
            const uint16_t *wt = &x.weight[x.offset[i]];
            uint32_t a = 0;
            for (uint32_t k = 0; k < x.count[i]; k++)
                a += (uint32_t)p[k] * wt[k];
            o[i] = (uint16_t)((a + 8) >> 4);
        }
    }
    for (uint32_t j = 0; j < dh; j++) {
        uint32_t *a = acc_.data();
        for (uint32_t i = 0; i < dw; i++)
            a[i] = 1u << 19;   /* rounds the shift below */
        const uint16_t *wt = &y.weight[y.offset[j]];
        for (uint32_t k = 0; k < y.count[j]; k++) {
            const uint16_t *row = &rows_[(size_t)(y.first[j] + k) * dw];
            const uint32_t w = wt[k];
            for (uint32_t i = 0; i < dw; i++)
                a[i] += (uint32_t)row[i] * w;
        }
        uint8_t *o = dst + (size_t)j * dp;
        for (uint32_t i = 0; i < dw; i++) {
            const uint32_t v = a[i] >> 20;
            o[i] = (uint8_t)(v > 255 ? 255 : v);
        }
    }
}

void AtlasScaler::scale(const uint8_t *src, std::vector<uint8_t> *dst)
{
    dst->resize(dst_bytes());
    uint8_t *d = dst->data();
    /* Y */
    plane(src, w_, h_, d, dw_, yx_, yy_);
    /* U and V, side by side under Y */
    const uint8_t *su = src + (size_t)w_ * h_, *sv = su + w_ / 2;
    uint8_t *du = d + (size_t)dw_ * dh_, *dv = du + dw_ / 2;
    plane(su, w_, h_ / 2, du, dw_, cx_, cy_);
    plane(sv, w_, h_ / 2, dv, dw_, cx_, cy_);
    if (bits_)
        crk::round_levels(d, d, dst->size(), bits_);
}

}  // namespace woc
