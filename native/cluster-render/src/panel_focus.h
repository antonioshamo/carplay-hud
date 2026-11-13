// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <string>
namespace crs {
inline std::string panel_focus_shader(const char *source) {
    std::string s(source);
    size_t at = 0;
    while ((at = s.find("v_uv", at)) != std::string::npos) { s.replace(at, 4, "v_sample"); at += 8; }
    s.replace(s.find("varying vec2 v_sample;"), std::string("varying vec2 v_sample;").size(), "varying vec2 v_uv; vec2 v_sample;");
    s.replace(s.find("void main()"), 11, "void mapMain()");
    return s + R"(
void main() {
    vec2 p = v_uv * vec2(1920.0,720.0);
    if (p.y >= 660.0 || (p.x >= 730.0 && p.x < 1190.0 && p.y < 128.0)) discard;
    float sourceAspect = u_size.x/u_size.y;
    float panelAspect = 1920.0/720.0;
    v_sample = (v_uv-0.5)*vec2(min(1.0,panelAspect/sourceAspect),min(1.0,sourceAspect/panelAspect))+0.5;
    mapMain();
    if (p.y >= 612.0 && p.x >= 1320.0 && p.x < 1510.0) {
        float edge = max(1.0-smoothstep(1320.0,1358.0,p.x),smoothstep(1472.0,1510.0,p.x));
        gl_FragColor.a *= edge;
    }
})";
}
}
