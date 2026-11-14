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
// One bounded lens per gauge. No texture copies or timed animation.
vec4 mapAt(vec2 panelUV) {
    float sourceAspect = u_size.x/u_size.y;
    float panelAspect = 1920.0/720.0;
    v_sample = (panelUV-0.5)*vec2(min(1.0,panelAspect/sourceAspect),min(1.0,sourceAspect/panelAspect))+0.5;
    mapMain();
    return gl_FragColor;
}
vec4 glassMap(vec2 p) {
    vec4 box = vec4(44.0,284.0,264.0,160.0);
    if (p.y > 465.0) box = p.x < 960.0 ? vec4(44.0,486.0,280.0,158.0) : vec4(1596.0,486.0,280.0,158.0);
    vec2 halfSize=box.zw*0.5, local=p-box.xy-halfSize;
    float radius=halfSize.y;
    vec2 q=abs(local)-(halfSize-vec2(radius));
    float distance=length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
    if (distance > 10.0) return mapAt(p/vec2(1920.0,720.0));
    vec4 original=mapAt(p/vec2(1920.0,720.0));
    if (distance > 0.0) {
        original.rgb *= 1.0-0.13*(1.0-smoothstep(0.0,10.0,distance));
        return original;
    }
    vec2 normal=normalize(sign(local)*max(q,vec2(0.001)));
    float depth=-distance;
    float shoulder=1.0-smoothstep(0.0,22.0,depth);
    // Convex edge bends the moving map, while the center stays optically quiet.
    vec2 bent=p-normal*(7.0*shoulder*shoulder);
    vec2 uv=bent/vec2(1920.0,720.0);
    vec4 base=mapAt(uv);
    // Three local samples softly scatter detail without a full-screen blur pass.
    vec3 soft=(base.rgb*2.0+mapAt(uv+vec2(2.0,1.5)/vec2(1920.0,720.0)).rgb+mapAt(uv-vec2(2.0,1.5)/vec2(1920.0,720.0)).rgb)*0.25;
    float light=dot(soft,vec3(0.2126,0.7152,0.0722));
    vec3 material=mix(soft,vec3(0.92,0.96,1.0),0.065);
    // Localized dimming behind readings, rather than an opaque card fill.
    vec2 center=local/halfSize;
    float reading=exp(-dot(center*vec2(1.5,1.1),center*vec2(1.5,1.1))*2.0);
    material*=1.0-(0.14+0.35*light)*reading;
    float rim=1.0-smoothstep(0.4,2.3,depth);
    float spec=pow(abs(dot(normal,normalize(vec2(-0.55,-0.84)))),5.0);
    material=mix(material,vec3(1.0),rim*(0.13+0.64*spec));
    material+=vec3(0.04,0.05,0.06)*shoulder*spec;
    base.rgb=mix(original.rgb,clamp(material,0.0,1.0),smoothstep(0.0,0.8,depth));
    return base;
}
void main() {
    vec2 p = v_uv * vec2(1920.0,720.0);
    // Map extends behind the physical sensor; retain the factory warning strip.
    if (p.y >= 660.0) discard;
    gl_FragColor=glassMap(p);
    if (p.y >= 612.0 && p.x >= 1352.0 && p.x < 1542.0) {
        float edge = max(1.0-smoothstep(1352.0,1390.0,p.x),smoothstep(1504.0,1542.0,p.x));
        gl_FragColor.a *= edge;
    }
})";
}
}
