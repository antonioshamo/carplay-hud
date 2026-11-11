// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// CI-only visual regression: replay this app's actual socket packets through
// mgu-render 0.6.15 with Mesa. This does not emulate BMW's foreground compositor.
const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
const {RenderClient}=require('../src/mgu_render_client.js'),{Canvas}=require('../src/kit_canvas.js');
const kit=require('../src/kit_record.js'),H=require('../src/hud_view.js'),M=require('../src/studio_model.js');
const {StudioScreen}=require('../src/studio_screen.js');
const renderer=process.argv[2],out=path.resolve(process.argv[3]||'/tmp/menu-renderer-replay');
assert(renderer,'Pass the native mgu-render executable and an output directory');
fs.mkdirSync(out,{recursive:true});
const model={target:'hud',state:'showing',width:60,offset:[0,0],step:10,background:false,corners:true,
 startup:false,startupResult:'Sample status',notice:'Offline render',captureText:'No capture running',captureButton:'Capture logs',logs:[],
 helperFresh:true,helper:{design:M.defaultDesign(),slots:[],data:{rpm:738,oil:90,fuel:32,range:310},climateSupported:true,
 climate:{controls:Object.keys(require('../../../native/cluster-studio/climate_controls.js').ACTIONS).map(id=>{const a=require('../../../native/cluster-studio/climate_controls.js').ACTIONS[id];return {id,label:a.label,value:1,available:true,choices:a.labels,choiceCount:a.options.length};})}}};
for(const key of ['canDisplay','canSize','canLarger','canSmaller','canMove','canStyle','canCorners','canStartup','canDisable','canCapture'])model[key]=true;
const cases=[['home-first','overview',{deferArtwork:true}],['home-artwork','overview',{}],['home-second','overview',{cockpit:{homePage:1}}],
 ['apps','apps',{}],['vehicle','vehicle',{}],['climate','climate',{}],['climate-seats','climate',{cockpit:{climateTab:1}}],['climate-rear','climate',{cockpit:{climateTab:2}}],['hud-layout','layout',{}],['startup','startup',{}]];
const results=[];
function verify(name,record){
 const file=path.join(out,name+'.bin'),gpu=new RenderClient('robertn_waze_cluster',console,{kit,file});
 gpu.connect();gpu.place({x:0,y:0,w:H.W,h:H.H,scale:1,ox:0,oy:0});gpu.frame(record);gpu.close();
 inspect(name,file,record);fs.unlinkSync(file);
}
function inspect(name,file,record){
 const pam=file+'.pam';
 cp.execFileSync(renderer,['--replay',file,'--out',pam],{env:Object.assign({},process.env,{LIBGL_ALWAYS_SOFTWARE:'1',EGL_PLATFORM:'surfaceless'}),stdio:['ignore','ignore','inherit'],timeout:30000});
 const bytes=fs.readFileSync(pam),end=bytes.indexOf(Buffer.from('ENDHDR\n'))+7;
 assert(end>=7);const header=bytes.slice(0,end).toString();assert(header.includes('WIDTH '+H.W+'\n')&&header.includes('HEIGHT '+H.H+'\n'));
 const px=bytes.slice(end);assert.equal(px.length,H.W*H.H*4);
 const actual=new Canvas(H.W,H.H),expected=new Canvas(H.W,H.H);actual.d.set(px);kit.play(record.words(),expected);
 fs.writeFileSync(path.join(out,name+'.png'),actual.png());
 let error=0,different=0;for(let i=0;i<px.length;i+=4){let d=0;for(let c=0;c<3;c++)d=Math.max(d,Math.abs(px[i+c]-expected.d[i+c]));error+=d;if(d>60)different++;}
 const mean=error/(H.W*H.H),fraction=different/(H.W*H.H);
 // Font edge antialiasing differs between CPU preview and OpenGL. Detect blank
 // frames, misplaced content or lost resources, not identical edge coverage.
 assert(mean<24&&fraction<.15,name+' diverged from menu preview: '+mean+', '+fraction);
 results.push({name,meanPixelError:mean,largeDifferenceFraction:fraction});
 fs.unlinkSync(pam);console.log('PASS native GPU replay '+name);
}
for(const [name,page,extra] of cases)verify(name,H.frame(Object.assign({},model,extra),page,0,0,1).record);
for(const n of [0,24,36,48,60,72,84]){const data=require('zlib').inflateSync(fs.readFileSync(path.resolve(__dirname,'../../../native/cluster-studio/assets/x4m/'+('00'+n).slice(-3)+'.rgba.z'))),image=kit.makeImage(900,450,data);verify('car-angle-'+n,H.frame(Object.assign({},model,{carImage:image}),'overview',0,0,1).record);kit.dropImage(image);}
// Keep the same connection while all angles stream through two GPU buffers.
// Replay a partially staged next angle too: the visible car must stay complete
// until the frame command switches to the other buffer.
const orbit=require('../src/car_views.js'),bytesPerView=orbit.width*orbit.height*4;
const orbitFile=path.join(out,'continuous-rotation.bin'),orbitGpu=new RenderClient('robertn_waze_cluster',console,{kit,file:orbitFile}),slots=[];
orbitGpu.connect();orbitGpu.place({x:0,y:0,w:H.W,h:H.H,scale:1,ox:0,oy:0});orbitGpu.info={pixmap:true,pixmapSide:1024};
function loadSlot(n,k){const bytes=require('zlib').inflateSync(fs.readFileSync(path.resolve(__dirname,'../../../native/cluster-studio/assets/x4m/'+orbit.views[n].file)));assert.equal(bytes.length,bytesPerView);let im=slots[k];if(!im)im=slots[k]=Object.assign(kit.makeImage(orbit.width,orbit.height,bytes),{stream:true,premultiplied:true,crop:orbit.crop,generation:0});im.data=im.prepared=bytes;im.generation++;return im;}
let lastOrbit;
try{
 for(let n=0;n<96;n++){const image=loadSlot(n,n%2);lastOrbit=H.frame(Object.assign({},model,{carImage:image}),'overview',0,0,1).record;orbitGpu.frame(lastOrbit);if([12,36,60,95].includes(n))inspect('car-stream-'+n,orbitFile,lastOrbit);}
 const staged=loadSlot(0,0);orbitGpu._ensureImage(staged.imageId,new Set([staged.imageId]));inspect('car-staged-next-view',orbitFile,lastOrbit);
}finally{orbitGpu.close();slots.forEach(kit.dropImage);fs.unlinkSync(orbitFile);}
process.env.CLUSTER_PREVIEW_DIR=path.resolve(__dirname,'../../../native/cluster-studio/assets/cluster-themes');
model.helper.generation='source-cluster-v2';model.helper.canSelectPanel=true;
const studio=new StudioScreen(()=>{});studio.client.status=model.helper;studio.client.statusAt=Date.now();
try{for(const page of ['gallery','edit','metric','style','intro','library','output']){studio.page=page;verify('studio-'+page,studio.frame(0,1).record);}}finally{studio.close();}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({renderer:'0.6.15',source:'54c656a79f08db3385393417a93b5608778fa571',vehicleVerified:false,results},null,2));
