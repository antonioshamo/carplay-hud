// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const EventEmitter=require('events');
// Preserve the upstream small shaders. Batch their quads as mesh parts rather
// than combining GLSL: 16 parts per mesh, at most 4 meshes. No renderer/HUD
// limits or scene mappings are changed. The native renderer supports this API.
const WIDTH=1920,HEIGHT=720,PARTS=16,MAX_MESHES=4;
const VS='attribute vec3 a_position; attribute vec2 a_texcoord; varying vec2 v_uv; varying vec2 v_panel; void main(){v_uv=a_texcoord;v_panel=vec2((a_position.x+1.0)*960.0,(1.0-a_position.y)*360.0);gl_Position=vec4(a_position,1.0);}';
function fragment(fs,window,fullMap){
 if(!/void\s+main\s*\(/.test(fs))throw Error('Cluster shader has no main');
 // OEM bottom strip, warning area and stock centre are never paintable by a
 // theme. This applies to every part, including imported backgrounds.
 const declarations='\nvarying vec2 v_panel; uniform float u_sourceVisible; uniform float u_sourceLease;\n';
 const body=fs.replace(/void\s+main\s*\(/,'void sourceMain(');
 const start=body.indexOf('precision '),end=start<0?-1:body.indexOf(';',start);
 if(end<0)throw Error('Cluster shader requires an explicit precision');
 const w=fullMap?[0,0,0,0]:(window||[416,120,1504,660]);
 if(!fullMap&&(w.length!==4||w.some(v=>!Number.isInteger(v))||w[0]>711||w[1]>128||w[2]<1209||w[3]<660))throw Error('Native BMW center clearance cannot be reduced');
 const f=v=>Number(v).toFixed(1);
 return body.slice(0,end+1)+declarations+body.slice(end+1)+'\nvoid main(){if(u_sourceVisible<0.5||u_sourceLease<0.5||v_panel.y>=660.0||(v_panel.x>='+f(w[0])+'&&v_panel.x<'+f(w[2])+'&&v_panel.y>='+f(w[1])+'&&v_panel.y<'+f(w[3])+')||(v_panel.x>=730.0&&v_panel.x<1190.0&&v_panel.y<128.0)){discard;}sourceMain();}\n';
}
function geometry(o){const x=o.x/WIDTH*2-1,r=(o.x+o.w)/WIDTH*2-1,y=1-o.y/HEIGHT*2,b=1-(o.y+o.h)/HEIGHT*2;return {positions:[x,y,0,r,y,0,x,b,0,r,b,0],texcoords:[0,0,1,0,0,1,1,1],indices:[0,1,2,2,1,3]};}
class SourceMesh extends EventEmitter {
 constructor(cr,o){super();this.cr=cr;this.o=o||{};this.nodes=new Map();this.assets=new Set();this.pendingAssets=new Set();this.meshes=[];this.next=-1;this.animNext=1;this.animations=new Map();this.dirty=false;this.scheduled=false;this.closed=false;this.leases=new Map();this.backend='source-mesh';this.stats={builds:0,parts:0};}
 connect(){}
 status(){if(this.cr.status)this.cr.status();}
 effect(opts){if(opts.target!=='panel')throw Error('Source cluster cannot claim HUD or map');const ref=this.next--;this.nodes.set(ref,{ref,opts:Object.assign({},opts),uniforms:{},binds:{},animations:new Map(),native:null});this.dirty=true;this.schedule();return ref;}
 asset(opts){if(opts.target!=='panel')throw Error('Source assets must belong to the cluster');const ref=this.cr.asset(opts);this.assets.add(ref);return ref;}
 pixels(ref,rects,px){if(!this.assets.has(ref))throw Error('Unknown cluster asset');this.cr.pixels(ref,rects,px);}
 uniform(ref,name,values,opts){const n=this.nodes.get(ref);if(!n)return;n.uniforms[name]={values:values.slice(),opts:Object.assign({},opts)};if(n.native)this.cr.uniform(n.native.mesh,name,values,Object.assign({},opts,{part:n.native.part}));}
 bind(ref,name,asset){const n=this.nodes.get(ref);if(!n||!this.assets.has(asset))return;n.binds[name]=asset;if(n.native)this.cr.bind(n.native.mesh,name,asset,n.native.part);}
 set(ref,opts){const n=this.nodes.get(ref);if(!n)return;Object.assign(n.opts,opts);if(n.native&&opts.visible!==undefined)this.cr.uniform(n.native.mesh,'u_sourceVisible',[opts.visible?1:0],{part:n.native.part});}
 animate(ref,opts){const n=this.nodes.get(ref);if(!n)return 0;const id=this.animNext++;n.animations.set(id,Object.assign({},opts));this.dirty=true;this.schedule();return id;}
 stop(ref,id){const n=this.nodes.get(ref),opts=n&&n.animations.get(id);if(n)n.animations.delete(id);const a=this.animations.get(id);if(a)this.cr.stop(a.mesh,a.id);this.animations.delete(id);if(n&&n.native&&opts&&opts.property==='uniform'&&n.uniforms[opts.name]){const u=n.uniforms[opts.name];this.cr.uniform(n.native.mesh,opts.name,u.values,Object.assign({},u.opts,{part:n.native.part}));}}
 drop(ref){if(this.assets.has(ref)){this.pendingAssets.add(ref);this.dirty=true;this.schedule();return;}const n=this.nodes.get(ref);if(!n)return;for(const id of n.animations.keys())this.stop(ref,id);this.nodes.delete(ref);this.dirty=true;this.schedule();}
 schedule(){if(this.scheduled||this.closed)return;this.scheduled=true;setImmediate(()=>{this.scheduled=false;if(this.closed)return;try{this.flush();}catch(e){this.abort(e.message);}});}
 abort(reason){this.clearNative();this.closed=true;this.o.failed&&this.o.failed(reason);}
 clearNative(){this.meshes.forEach(ref=>this.cr.drop(ref));this.meshes=[];this.leases.clear();this.animations.clear();this.nodes.forEach(n=>n.native=null);}
 flush(){
  if(!this.dirty||this.closed)return;this.dirty=false;
  const list=Array.from(this.nodes.values()).sort((a,b)=>(a.opts.z||0)-(b.opts.z||0)||b.ref-a.ref);
  if(list.length>PARTS*MAX_MESHES)throw Error('Source theme exceeds the tested mesh budget');
  // Each part also needs its native expiry animation. Reserve room for the
  // source startup sweeps: the renderer permits only 16 animations per layer.
  const groups=[];let group=[],cost=0;
  list.forEach(n=>{const weight=1+n.animations.size;if(weight>16)throw Error('Too many source animations');if(cost+weight>16){groups.push(group);group=[];cost=0;}group.push(n);cost+=weight;});
  if(group.length)groups.push(group);
  if(groups.length>MAX_MESHES)throw Error('Source theme exceeds the tested animation budget');
  const old=this.meshes.slice();this.meshes=[];this.leases.clear();this.animations.clear();
  // At most 4 old plus 4 new layers, fitting the existing eight-layer limit.
  // No old bitmap engine is loaded or used as a fallback.
  try{
   for(let i=0;i<groups.length;i++){
    const mesh=this.cr.mesh({target:'panel',klass:'content',z:10+i,x:0,y:0,w:WIDTH,h:HEIGHT,projection:'ortho',ortho_h:2,visible:false,exclusive:false,contend:true});
    if(!mesh)throw Error('Cluster mesh refused');this.meshes.push(mesh);
    groups[i].forEach((n,j)=>{
     const part=j+1;n.native={mesh,part};
     if(this.cr.part(mesh,part,{vs:VS,fs:fragment(n.opts.fs,this.o.window&&this.o.window(),this.o.fullMap&&this.o.fullMap()),depth:false,cull:'none',blend:'alpha'})===false)throw Error('Cluster part refused');
     if(this.cr.geometry(mesh,part,geometry(n.opts))===false)throw Error('Cluster geometry refused');
     Object.keys(n.uniforms).forEach(k=>{const u=n.uniforms[k];this.cr.uniform(mesh,k,u.values,Object.assign({},u.opts,{part}));});
     Object.keys(n.binds).forEach(k=>this.cr.bind(mesh,k,n.binds[k],part));
     this.cr.uniform(mesh,'u_sourceVisible',[n.opts.visible===false?0:1],{part});
     this.cr.uniform(mesh,'u_sourceLease',[1],{part});
     n.animations.forEach((opts,id)=>this.animations.set(id,{mesh,id:this.cr.animate(mesh,Object.assign({},opts,{part}))}));
    });
   }
   this.renew();this.meshes.forEach(ref=>this.cr.set(ref,{visible:true}));old.forEach(ref=>this.cr.drop(ref));
   // Fonts outlive the old native meshes until those meshes have been removed.
   this.pendingAssets.forEach(ref=>{if(list.some(n=>Object.keys(n.binds).some(k=>n.binds[k]===ref)))throw Error('Active source still uses a retired font');this.cr.drop(ref);this.assets.delete(ref);});this.pendingAssets.clear();
   this.stats={builds:this.stats.builds+1,parts:list.length};
  }catch(e){old.forEach(ref=>this.cr.drop(ref));this.clearNative();throw e;}
 }
 renew(){this.nodes.forEach(n=>{if(!n.native)return;const {mesh,part}=n.native,key=mesh+':'+part,old=this.leases.get(key);if(old)this.cr.stop(mesh,old);this.leases.set(key,this.cr.animate(mesh,{part,property:'uniform',name:'u_sourceLease',keys:'0:1 1200:1 1201:0',interp:'step',loop:false}));});}
 cancelAnimations(){this.nodes.forEach(n=>{for(const id of Array.from(n.animations.keys()))this.stop(n.ref,id);});}
 reconnect(){this.clearNative();this.dirty=true;this.schedule();}
 close(){this.closed=true;this.clearNative();this.assets.forEach(ref=>this.cr.drop(ref));this.assets.clear();this.pendingAssets.clear();this.nodes.clear();}
}
module.exports={SourceMesh,fragment,geometry,VS,WIDTH,HEIGHT,PARTS,MAX_MESHES};
