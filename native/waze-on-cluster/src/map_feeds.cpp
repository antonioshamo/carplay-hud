// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Robert Nisipeanu
#include "map_feeds.h"

#include <algorithm>
#include <chrono>
#include <fstream>
#include <sstream>
#include <sys/stat.h>

#include "log.h"

namespace woc {

bool parse_targets(const std::string &spec, std::vector<std::string> *out, std::string *err)
{
    std::vector<std::string> t;
    std::string word;
    const std::string s = spec + "+";
    for (char c : s) {
        if (c == '+' || c == ',') {
            if (word.empty()) {
                *err = "an empty target in \"" + spec + "\"";
                return false;
            }
            if (word == "both") {
                t.push_back("map");
                t.push_back("hud");
            } else if (word == "map" || word == "sail" || word == "cluster") {
                t.push_back("map");
            } else if (word == "panel" || word == "hud") {
                t.push_back(word);
            } else {
                *err = "unknown target \"" + word + "\" (map, panel, hud, map+hud)";
                return false;
            }
            word.clear();
        } else if (c != ' ') {
            word += c;
        }
    }
    for (size_t i = 0; i < t.size(); i++)
        for (size_t j = i + 1; j < t.size(); j++)
            if (t[i] == t[j]) {
                *err = "\"" + t[i] + "\" named twice";
                return false;
            }
    if (t.size() > 2) {
        *err = "at most two targets";
        return false;
    }
    const auto has = [&t](const char *n) { return std::find(t.begin(), t.end(), n) != t.end(); };
    if (has("map") && has("panel")) {
        *err = "map and panel are both the cluster";
        return false;
    }
    if (has("panel") && has("hud")) {
        *err = "panel and hud share a scene id and are never up at once";
        return false;
    }
    /* the cluster first: it is the one the status follows */
    std::stable_sort(t.begin(), t.end(), [](const std::string &a, const std::string &b) { return a != "hud" && b == "hud"; });
    *out = t;
    return true;
}

std::string join_targets(const std::vector<std::string> &targets)
{
    std::string s;
    for (const std::string &t : targets)
        s += (s.empty() ? "" : "+") + t;
    return s;
}

MapFeeds::MapFeeds(const FeedConfig &base) : base_(base)
{
    if (base_.hud_width_pct > kHudMaxPct)
        base_.hud_width_pct = kHudMaxPct;
    std::string err;
    if (!parse_targets(base.target, &targets_, &err)) {
        log_error("target: %s; using map", err.c_str());
        targets_ = {"map"};
    }
    for (const std::string &t : targets_)
        feeds_.push_back(make(t));
}

std::unique_ptr<MapFeed> MapFeeds::make(const std::string &target)
{
    FeedConfig fc = base_;
    fc.target = target;
    fc.panel_focus = focus_active_ && target == "panel";
    std::unique_ptr<MapFeed> f(new MapFeed(fc));
    f->set_picture(picture_ready_);
    f->set_stream(live_, frozen_);
    return f;
}

bool MapFeeds::set_targets(const std::string &spec)
{
    std::vector<std::string> want;
    std::string err;
    if (!parse_targets(spec, &want, &err)) {
        log_warn("start: %s", err.c_str());
        return false;
    }
    for (const std::string &t : want)
        if (!feeds_.empty() && !feeds_[0]->knows(t)) {
            log_warn("start: the cluster renderer has no target %s", t.c_str());
            return false;
        }
    if (want == targets_)
        return true;
    log_info("targets: %s -> %s", join_targets(targets_).c_str(), join_targets(want).c_str());
    targets_ = want;
    reconcile();
    return true;
}

// Same atomic-file heartbeat approach as Cluster Layouts map_window.js.
// A separate filename prevents an unrelated app from opting into this mode.
bool MapFeeds::focus_requested() const
{
    struct stat st;
    if (base_.focus_file.empty() || lstat(base_.focus_file.c_str(), &st) || !S_ISREG(st.st_mode) || st.st_size > 80) return false;
#ifdef __APPLE__
    const double mtime = st.st_mtimespec.tv_sec * 1000.0 + st.st_mtimespec.tv_nsec / 1000000.0;
#else
    const double mtime = st.st_mtim.tv_sec * 1000.0 + st.st_mtim.tv_nsec / 1000000.0;
#endif
    const double now = std::chrono::duration<double, std::milli>(std::chrono::system_clock::now().time_since_epoch()).count();
    if (mtime > now || now - mtime > 500) return false;
    std::ifstream f(base_.focus_file);
    std::string target, extra; int x, y, w, h;
    if (!(f >> target >> x >> y >> w >> h) || (f >> extra)) return false;
    return target == "panel" && x == 0 && y == 0 && w == 1920 && h == 720;
}

void MapFeeds::reconcile()
{
    std::vector<std::string> want = targets_;
    if (focus_active_) {
        for (auto &t : want) if (t == "map") t = "panel";
        if (std::find(want.begin(), want.end(), "panel") == want.end()) want.push_back("panel");
    }
    std::vector<std::unique_ptr<MapFeed>> next;
    for (const auto &t : want) {
        std::unique_ptr<MapFeed> keep;
        for (auto &old : feeds_)
            if (old && old->target() == t && old->is_focus() == (focus_active_ && t == "panel")) keep = std::move(old);
        next.push_back(keep ? std::move(keep) : make(t));
    }
    // The same HUD object, socket, layer and settings survive both transitions.
    feeds_ = std::move(next);
}

bool MapFeeds::set_hud_style(const std::string &setting, bool on)
{
    if (setting == "hud_black_background") base_.hud_black_background = on;
    else if (setting == "hud_round_corners") base_.hud_round_corners = on;
    else return false;
    for (auto &f : feeds_) f->set_hud_style(setting, on);
    return true;
}

void MapFeeds::set_hud_width(unsigned pct)
{
    if (pct > kHudMaxPct)
        pct = kHudMaxPct;
    base_.hud_width_pct = pct;
    for (auto &f : feeds_)
        f->set_hud_width(pct);
}

void MapFeeds::set_hud_offset(int dx, int dy)
{
    base_.hud_offset_x = dx;
    base_.hud_offset_y = dy;
    for (auto &f : feeds_)
        f->set_hud_offset(dx, dy);
}

size_t MapFeeds::poll_fds(std::vector<pollfd> *fds) const
{
    const size_t first = fds->size();
    for (const auto &f : feeds_)
        fds->push_back({f->fd(), (short)(POLLIN | (f->wants_write() ? POLLOUT : 0)), 0});
    return first;
}

void MapFeeds::poll(int64_t now_ms)
{
    if (focus_checked_ < 0 || now_ms - focus_checked_ >= 50) {
        focus_checked_ = now_ms;
        const bool want = focus_requested();
        if (want != focus_active_) { focus_active_ = want; reconcile(); }
    }
    for (auto &f : feeds_)
        f->poll(now_ms);
}

void MapFeeds::offer(std::vector<uint8_t> *atlas, uint64_t id, int64_t now_ms)
{
    /* the copies first: the first feed takes the frame's buffer */
    for (size_t i = 1; i < feeds_.size(); i++) {
        copy_.assign(atlas->begin(), atlas->end());
        feeds_[i]->offer(&copy_, id, now_ms);
    }
    if (!feeds_.empty())
        feeds_[0]->offer(atlas, id, now_ms);
}

void MapFeeds::set_stream(bool live, bool frozen)
{
    live_ = live;
    frozen_ = frozen;
    for (auto &f : feeds_)
        f->set_stream(live, frozen);
}

void MapFeeds::set_picture(bool ready)
{
    picture_ready_ = ready;
    for (auto &f : feeds_)
        f->set_picture(ready);
}

FeedStatus MapFeeds::status(const std::string &decode, const std::string &stream) const
{
    if (feeds_.empty())
        return FeedStatus();
    FeedStatus s = feeds_[0]->status(decode, stream);
    for (size_t i = 1; i < feeds_.size(); i++) {
        const FeedStatus o = feeds_[i]->status(decode, stream);
        const std::string &name = feeds_[i]->target();
        if (o.state == "error" && s.state != "error") {
            s.state = "error";
            s.reason = name + ": " + o.reason;
        } else if (s.state != "showing" && s.state != "error" && o.state == "showing") {
            s.state = "showing";
            s.page = o.page;
        }
        if (o.state != feeds_[0]->status(decode, stream).state)
            s.page += " · " + name + " " + o.state + (o.reason.empty() ? "" : ": " + o.reason);
    }
    s.target = join_targets(targets_);
    s.hud_width_pct = base_.hud_width_pct;
    s.hud_offset_x = base_.hud_offset_x;
    s.hud_offset_y = base_.hud_offset_y;
    s.hud_black_background = base_.hud_black_background;
    s.hud_round_corners = base_.hud_round_corners;
    s.hud_style_available = base_.scale_down;
    return s;
}

void MapFeeds::request_report()
{
    for (auto &f : feeds_)
        f->request_report();
}

std::string MapFeeds::report() const
{
    std::string r;
    for (size_t i = 0; i < feeds_.size(); i++)
        r += (feeds_.size() > 1 ? "--- " + feeds_[i]->target() + "\n" : std::string()) + feeds_[i]->report();
    return r;
}

}  // namespace woc
