// SPDX-License-Identifier: GPL-3.0-or-later
#ifndef WOC_PICTURE_GATE_H
#define WOC_PICTURE_GATE_H

#include <stdint.h>

namespace woc {

// Blank transition frames must not tear down a healthy map layer. Keep only
// its last real image for a bounded 250 ms; never submit a blank image, extend
// the deadline with more blank frames, or revive a previous connection's image.
class PictureGate {
public:
    static constexpr int64_t kBlankGraceMs = 250;

    bool update(bool live, bool frozen, bool frame, bool blank, int64_t now)
    {
        if (now < 0 || (last_ms_ >= 0 && now < last_ms_)) {
            clear();
            last_ms_ = now;
            return false;
        }
        last_ms_ = now;
        if (!live || frozen) {
            clear();
            return false;
        }
        if (frame && !blank) {
            if (ready_ && blank_ms_ >= 0 && now - blank_ms_ < kBlankGraceMs)
                bridged_++;
            ready_ = true;
            blank_ms_ = -1;
        } else if (frame && blank && ready_ && blank_ms_ < 0) {
            blank_ms_ = now;
        }
        if (ready_ && blank_ms_ >= 0 && now - blank_ms_ >= kBlankGraceMs) {
            expired_++;
            clear();
        }
        return ready_;
    }

    // Let the main poll wake exactly when the grace expires, even if video
    // stops immediately after the blank frame. Usual liveness/stall rules
    // continue to govern streams which have not supplied a blank frame.
    int poll_ms(int64_t now) const
    {
        if (blank_ms_ < 0) return 250;
        const int64_t left = kBlankGraceMs - (now - blank_ms_);
        return left <= 0 ? 0 : left > 250 ? 250 : static_cast<int>(left);
    }
    const char *state() const { return !ready_ ? "waiting" : blank_ms_ >= 0 ? "brief-blank" : "picture"; }
    uint64_t bridged() const { return bridged_; }
    uint64_t expired() const { return expired_; }

private:
    void clear() { ready_ = false; blank_ms_ = -1; }
    bool ready_ = false;
    int64_t blank_ms_ = -1, last_ms_ = -1;
    uint64_t bridged_ = 0, expired_ = 0;
};

} // namespace woc
#endif
