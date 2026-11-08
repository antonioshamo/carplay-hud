// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Upload artwork once. The cluster renderer interpolates motion on its own
// frame clock; there is no per-frame bitmap traffic or JavaScript timer.
const I=require('./shared/studio_intro.js'),M=require('./shared/studio_model.js'),{Canvas}=require('./shared/kit_canvas.js');
const Panel=require('./panel_composition.js');
const FS=`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_art;
uniform sampler2D u_title;
uniform vec4 u_motion;
uniform float u_reveal;
uniform float u_mode;
uniform float u_aspect;
uniform float u_artRatio;
uniform float u_shine;
uniform vec3 u_light;
uniform vec4 u_native;
uniform float u_panel;
vec4 art(vec2 uv) {
 if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0)return vec4(0.0);
 return texture2D(u_art,uv);
}
void main(){
 if(u_reveal>=1.0)discard;
 vec2 px=v_uv*vec2(1920.0,720.0);
 if(u_panel>0.5&&px.x>=u_native.x&&px.x<u_native.z&&px.y>=u_native.y&&px.y<u_native.w)discard;
 vec4 c=vec4(0.0);
 if(u_mode<1.5){
  float k=u_mode>0.5?0.65+0.35*u_motion.x:1.0;
  vec2 size=vec2(0.85,0.85*u_artRatio*u_aspect)*k;
  vec2 origin=(vec2(1.0)-size)*0.5;
  if(u_mode<0.5)origin.x+=(1.0-u_motion.x)*1.02;
  vec2 uv=(v_uv-origin)/size;c=art(uv);
  float sweep=u_motion.z*1.4-0.2;
  float light=max(0.0,1.0-abs(uv.x-uv.y*0.12-sweep)/0.11)*0.85*u_shine*step(0.00001,u_motion.z)*(1.0-step(0.99999,u_motion.z));
  c.rgb=mix(c.rgb,u_light,light);
 }else if(u_mode<2.5){
  vec2 size=vec2(0.42*0.875/u_aspect,0.42);
  vec2 origin=vec2(0.5-size.x*0.5-u_motion.y*0.22,0.28);
  c=art((v_uv-origin)/size);
  vec4 title=texture2D(u_title,v_uv);title.a*=u_motion.y;
  c.rgb=mix(c.rgb*c.a,title.rgb,title.a);c.a=1.0;
 }else{
  vec2 uv=v_uv-vec2((1.0-u_motion.x)*0.12,0.0);c=art(uv);
 }
 // Black is an intentional part of the intro, then becomes transparent to
 // reveal the already prepared chosen gauges without replacing their layer.
 gl_FragColor=vec4(c.rgb*c.a*(1.0-u_motion.w),1.0-u_reveal);
}`;
function keyframes(d,elapsed,total){
 const motion=[],reveal=[],remaining=Math.max(1,total-elapsed);
 // 121 shared samples plus exact breakpoints, below the protocol's 256 cap.
 const times=new Set([0,remaining]);
 for(let n=0;n<=120;n++)times.add(Math.round(remaining*n/120));
 for(const p of [.1,.24,.28,.4,.66,.72,.80,.92,.94,1]){const t=Math.round(total*p-elapsed);if(t>0&&t<remaining)times.add(t);}
 Array.from(times).sort((a,b)=>a-b).forEach(t=>{const a=I.timeline(d,t+elapsed);motion.push(t+':'+[a.entrance,a.slide,a.shine,a.fade].map(n=>n.toFixed(6)).join(','));reveal.push(t+':'+a.reveal.toFixed(6));});
 return {motion:motion.join(' '),reveal:reveal.join(' ')};
}
function create(cr,target,w,h,d,elapsed){
 const assets=[],total=I.duration(d),remaining=Math.max(1,total-elapsed),artwork=I.artwork(),mode=['slide','reveal','apple','welcome'].indexOf(d.intro);
 if(mode<0||elapsed>=total)return null;
 const color=d.introLight==='blue'?'#75cfff':d.introLight==='red'?'#ff697e':d.introLight==='theme'?M.THEMES[d.theme][1]:'#ffffff';
 const tw=1024,th=Math.round(tw*h/w),title=new Canvas(tw,th);title.clear([0,0,0,0]);
 if(mode===2)title.text('CarPlay Ultra',tw*.41,th*.57,th*.125,'#ffffff',{font:'label'});
 if(mode===3){title.text('Welcome',tw*.5,th*.38,th*.10,color,{font:'label',align:'center'});title.text(d.welcomeName||'Antonio Shamo',tw*.5,th*.62,Math.min(th*.15,tw*.8/((d.welcomeName||'Antonio Shamo').length*.65)),'#ffffff',{font:'bold',align:'center'});title.fillRect(tw*.35,th*.72,tw*.30,th*.006,color);}
 const picture=mode<2?artwork.badge:mode===2?artwork.apple:{w:tw,h:th,data:title.d};
 function upload(img){const ref=cr.asset({target,format:'rgba8',w:img.w,h:img.h,sampling:'bilinear'});assets.push(ref);cr.pixels(ref,null,Buffer.from(img.data||img.d));return ref;}
 const art=upload(picture),label=mode===2?upload({w:tw,h:th,data:title.d}):art;
 const ref=cr.effect({target,klass:'overlay',z:6,x:0,y:0,w,h,visible:false,contend:target==='map',fs:FS});
 cr.uniform(ref,'u_panel',[target==='panel'?1:0]);cr.uniform(ref,'u_native',Panel.NATIVE);
 cr.bind(ref,'u_art',art);cr.bind(ref,'u_title',label);
 cr.uniform(ref,'u_mode',[mode]);cr.uniform(ref,'u_aspect',[w/h]);cr.uniform(ref,'u_artRatio',[picture.h/picture.w]);
 cr.uniform(ref,'u_shine',[d.introShine?1:0]);cr.uniform(ref,'u_light',[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255));
 const a=I.timeline(d,elapsed),keys=keyframes(d,elapsed,total);
 cr.uniform(ref,'u_motion',[a.entrance,a.slide,a.shine,a.fade]);cr.uniform(ref,'u_reveal',[a.reveal]);
 cr.animate(ref,{property:'uniform',name:'u_motion',keys:keys.motion,interp:'linear',loop:false});
 cr.animate(ref,{property:'uniform',name:'u_reveal',keys:keys.reveal,interp:'linear',loop:false});
 const expiry=cr.animate(ref,{property:'translate',keys:'0:0,0,0 '+remaining+':0,0,0 '+(remaining+1)+':0,1200,0',interp:'step',loop:false});
 cr.set(ref,{visible:true});
 return {ref,assets,expiry};
}
function drop(cr,layer){if(!layer)return;cr.drop(layer.ref);layer.assets.forEach(a=>cr.drop(a));}
module.exports={create,drop,keyframes,FS};
