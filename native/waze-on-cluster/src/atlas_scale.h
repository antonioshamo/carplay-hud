// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Robert Nisipeanu
/* AtlasScaler: a decoded 4:2:0 atlas (crk/yuv_atlas.h: Y w x h, then U and V
 * side by side at w/2 x h/2) made smaller, for a target that shows the map
 * smaller than the decoded frame (the HUD: 453x200 of a 1088x480 frame).
 * Sending the frame at the size it is shown cuts the upload to the KOMBI by
 * the ratio of the areas (5.7x at the HUD's standard size), so frames go
 * exact instead of packed and the shared budget is free for the rest.
 *
 * Area averaging (a box filter over the exact source span of each output
 * pixel), separable, in integer arithmetic: each plane is scaled on its
 * own, so U, V and Y never mix. Weights are computed once per size. Values
 * are rounded to the given level bits afterwards (yuv_atlas.h
 * round_levels), as the decoder thread rounds the full frame. Only
 * downscaling: an output larger than the source in either direction is
 * refused. */
#ifndef WOC_ATLAS_SCALE_H
#define WOC_ATLAS_SCALE_H

#include <stddef.h>
#include <stdint.h>

#include <vector>

namespace woc {

class AtlasScaler {
public:
    /* Source w x h and destination dw x dh frames (all even, dw <= w,
     * dh <= h); false if not. */
    bool configure(uint32_t w, uint32_t h, uint32_t dw, uint32_t dh, unsigned level_bits);
    bool configured() const { return dw_ != 0; }
    uint32_t dst_w() const { return dw_; }
    uint32_t dst_h() const { return dh_; }
    size_t dst_bytes() const { return (size_t)dw_ * (dh_ + dh_ / 2); }

    /* src: a w x atlas_height(h) atlas; *dst is resized to dst_bytes(). */
    void scale(const uint8_t *src, std::vector<uint8_t> *dst);

private:
    /* One axis: for each output index, its first source index and weights
     * (sum kOne) over the source pixels its span covers. */
    struct Axis {
        std::vector<uint32_t> first;
        std::vector<uint32_t> count;
        std::vector<uint16_t> weight;   /* concatenated, count[i] per output */
        std::vector<uint32_t> offset;   /* into weight */
        void build(uint32_t src, uint32_t dst);
    };
    void plane(const uint8_t *src, uint32_t sp, uint32_t sh, uint8_t *dst, uint32_t dp, const Axis &x, const Axis &y);

    uint32_t w_ = 0, h_ = 0, dw_ = 0, dh_ = 0;
    unsigned bits_ = 0;
    Axis yx_, yy_, cx_, cy_;
    std::vector<uint16_t> rows_;   /* the horizontal pass, scaled 256 */
    std::vector<uint32_t> acc_;    /* one output row's vertical sums */
};

}  // namespace woc

#endif
