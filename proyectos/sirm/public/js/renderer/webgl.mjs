import { identity,lookAt,perspective,transform,multiply } from './math.mjs';
import { makeSphere,makeTerrainMesh,makeWaterMesh,makeBox,makePyramidRoof,makeRiver,bounds,point,makeOfficialOutline } from './geometry.mjs';
import { assessBuildings } from '../engine/risk.mjs';

const vertexSource = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in vec3 aColor;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
out vec3 vNormal;
out vec2 vUV;
out vec3 vColor;
out vec3 vWorld;
void main(){
 vec4 world=uModel*vec4(aPosition,1.);
 vWorld=world.xyz;
 vNormal=normalize(mat3(uModel)*aNormal);
 vUV=aUV;
 vColor=aColor;
 gl_Position=uProj*uView*world;
}`;
const fragmentSource = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUV;
in vec3 vColor;
in vec3 vWorld;
uniform sampler2D uTexture;
uniform float uTextureEnabled;
uniform vec3 uTint;
uniform float uOpacity;
uniform float uWater;
uniform float uTime;
out vec4 outColor;
void main(){
 vec3 col=(uTextureEnabled>.5?texture(uTexture,vUV).rgb:vColor)*uTint;
 vec3 light=normalize(vec3(-.55,.86,.6));
 float ndl=max(dot(normalize(vNormal),light),0.);
 float lighting=.40+.61*ndl;
 if(uWater>.5){
  float shimmer=.90+.1*sin(vWorld.x*18.3+vWorld.z*22.1+uTime*1.7);
  col*=shimmer;
  lighting=.63+.50*ndl;
 }
 col*=lighting;
 // Atmospheric rim approximation on sphere.
 if(uTextureEnabled>.5){col+=vec3(.025,.042,.074);}
 outColor=vec4(col,uOpacity);
}`;

function compile(gl,type,source){
 const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'Error compilando shader');return sh;
}
function program(gl){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vertexSource));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Error enlazando shaders');return p;}
function makeMesh(gl,data){
 const mesh={vao:gl.createVertexArray(),count:data.indices.length,buffers:[],index:gl.createBuffer()};gl.bindVertexArray(mesh.vao);
 for(const [index,size,array] of [[0,3,data.positions],[1,3,data.normals],[2,2,data.uvs],[3,3,data.colors]]){
  const buf=gl.createBuffer();mesh.buffers.push(buf);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,array,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,0,0);
 }
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,data.indices,gl.DYNAMIC_DRAW);
 gl.bindVertexArray(null);return mesh;
}
function updateMesh(gl,mesh,data){
 for(const [i,array] of [[0,data.positions],[1,data.normals],[2,data.uvs],[3,data.colors]]) {
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffers[i]);gl.bufferData(gl.ARRAY_BUFFER,array,gl.DYNAMIC_DRAW);
 }
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,data.indices,gl.DYNAMIC_DRAW);mesh.count=data.indices.length;
}
function disposeMesh(gl,mesh){if(!mesh)return;for(const b of mesh.buffers)gl.deleteBuffer(b);gl.deleteBuffer(mesh.index);gl.deleteVertexArray(mesh.vao);}
function loadTexture(gl,src){
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([20,52,90,255]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const img=new Image();img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);};img.src=src;
 return tex;
}
function makeTerrainTextureFromGrid(terrain){
  if(!terrain||!terrain.heights||!terrain.rows||!terrain.cols)return null;
  const {rows,cols,heights}=terrain;
  const canvas=document.createElement('canvas');
  canvas.width=cols;canvas.height=rows;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  const image=ctx.createImageData(cols,rows);
  let min=Infinity,max=-Infinity;
  for(const v of heights){if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v);}}
  if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min){return null;}
  const span=max-min||1;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const idx=(r*cols+c)*4;
      const v=heights[r*cols+c];
      const t=(v-min)/span;
      const r1=Math.round(30 + 160 * t);
      const g1=Math.round(55 + 130 * t);
      const b1=Math.round(38 + 120 * t);
      image.data[idx]=Math.min(255,r1);
      image.data[idx+1]=Math.min(255,g1);
      image.data[idx+2]=Math.min(255,b1);
      image.data[idx+3]=255;
    }
  }
  ctx.putImageData(image,0,0);
  return canvas;
}

export class Scene3D {
 constructor(canvas){
  this.canvas=canvas;
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:true,preserveDrawingBuffer:true});
  if(!gl)throw new Error('WebGL2 no está disponible. Activa aceleración por hardware en el navegador.');
  this.gl=gl;this.program=program(gl);this.uniforms={};gl.useProgram(this.program);
  for(const name of ['uModel','uView','uProj','uTextureEnabled','uTint','uOpacity','uWater','uTime'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
  gl.uniform1i(gl.getUniformLocation(this.program,'uTexture'),0);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  this.globe=makeMesh(gl,makeSphere());this.box=makeMesh(gl,makeBox());this.roof=makeMesh(gl,makePyramidRoof());
  this.texture=loadTexture(gl,'/assets/earth-geography.jpg');this.terrainTexture=null;
  this.mode='earth';this.rotation=-1.92;this.time=0;this.yaw=-.62;this.pitch=.58;this.distance=9.5;
  this.frame=null;this.terrain=null;this.buildings=[];this.water=null;this.land=null;this.river=null;this.officialOutline=null;
  this.onUserInteract=null;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
  this.bindControls();this.resize();
 }
 bindControls(){
  const cvs=this.canvas;
  let dragging=false,x0=0,y0=0;
  this.pointerDown=(e)=>{dragging=true;x0=e.clientX;y0=e.clientY;cvs.setPointerCapture(e.pointerId);this.onUserInteract?.();};
  this.pointerMove=(e)=>{if(!dragging)return;const dx=e.clientX-x0,dy=e.clientY-y0;x0=e.clientX;y0=e.clientY;
   if(this.mode==='earth')this.rotation+=dx*.006;
   else{this.yaw+=dx*.008;this.pitch=Math.max(.16,Math.min(1.36,this.pitch+dy*.006));}
  };
  this.pointerUp=()=>{dragging=false;};
  this.wheel=(e)=>{e.preventDefault();this.onUserInteract?.();if(this.mode==='earth')this.distance=Math.max(6.2,Math.min(15,this.distance+Math.sign(e.deltaY)*.6));else this.distance=Math.max(5.3,Math.min(17,this.distance+Math.sign(e.deltaY)*.5));};
  cvs.addEventListener('pointerdown',this.pointerDown);cvs.addEventListener('pointermove',this.pointerMove);cvs.addEventListener('pointerup',this.pointerUp);cvs.addEventListener('wheel',this.wheel,{passive:false});
 }
 resize(){const dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.max(1,Math.round(this.canvas.clientWidth*dpr)),h=Math.max(1,Math.round(this.canvas.clientHeight*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);}}
 setTerrainTexture(image){
  if(!this.terrain?.realTerrain)
   throw Error('Primero debe cargarse un terreno real.');

  const gl=this.gl;
  const width=image?.naturalWidth||image?.width;
  const height=image?.naturalHeight||image?.height;
  const max=gl.getParameter(gl.MAX_TEXTURE_SIZE);

  if(!Number.isInteger(width)||!Number.isInteger(height)||
     width<1||height<1||width>max||height>max)
   throw Error('Textura invalida o demasiado grande.');

  const tex=gl.createTexture();

  if(!tex)
   throw Error('No fue posible crear la textura.');

  try{
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D,tex);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(
    gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,
    gl.UNSIGNED_BYTE,image
   );
   gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
   );
   gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    gl.LINEAR
   );
   gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    gl.CLAMP_TO_EDGE
   );
   gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    gl.CLAMP_TO_EDGE
   );
   gl.generateMipmap(gl.TEXTURE_2D);

  }catch(e){
   gl.deleteTexture(tex);
   throw e;

  }finally{
   gl.bindTexture(gl.TEXTURE_2D,this.texture);
  }

  if(this.terrainTexture)
   gl.deleteTexture(this.terrainTexture);

  this.terrainTexture=tex;
 }

 setTerrain(terrain,buildings,official=null){
  const gl=this.gl;if(this.terrainTexture){gl.deleteTexture(this.terrainTexture);this.terrainTexture=null;}disposeMesh(gl,this.land);disposeMesh(gl,this.river);disposeMesh(gl,this.water);disposeMesh(gl,this.officialOutline);
  this.terrain=terrain;this.buildings=buildings;this.land=makeMesh(gl,makeTerrainMesh(terrain));this.river=terrain.realTerrain?null:makeMesh(gl,makeRiver(terrain));
  this.water=makeMesh(gl,makeWaterMesh(terrain,new Float32Array(terrain.rows*terrain.cols)));
  this.officialOutline=official?.geometry&&terrain.realTerrain?
    makeMesh(gl,makeOfficialOutline(terrain,official.geometry,official.bounds)):null;
  if (terrain.realTerrain) {
    const sourceTexture = makeTerrainTextureFromGrid(terrain);
    if (sourceTexture) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.terrainTexture = tex;
    }
  }
  this.mode='terrain';this.distance=13.2;this.yaw=-.65;this.pitch=.72;this.currentScenario='flood';this.waterStamp=-1;
 }
 setFrame(frame,scenario){if(!this.terrain)return;const stamp=`${scenario.id}-${frame?.time??0}`;if(this.waterStamp!==stamp){updateMesh(this.gl,this.water,makeWaterMesh(this.terrain,frame?.depth,scenario.id));this.waterStamp=stamp;}this.frame=frame;this.currentScenario=scenario.id;}
 drawMesh(mesh,model=identity(),{texture=false,tint=[1,1,1],alpha=1,water=false}={}){
  if(!mesh||!mesh.count)return;
  const gl=this.gl,u=this.uniforms;
  gl.uniformMatrix4fv(u.uModel,false,model);gl.uniform1f(u.uTextureEnabled,texture?1:0);
  gl.uniform3fv(u.uTint,tint);gl.uniform1f(u.uOpacity,alpha);gl.uniform1f(u.uWater,water?1:0);
  gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_INT,0);
 }
 render(delta=0){
  const gl=this.gl;this.resize();this.time+=Math.min(.08,Math.max(0,delta));
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);const u=this.uniforms;
  gl.uniform1f(u.uTime,this.time);
  const aspect=this.canvas.width/this.canvas.height;
  gl.uniformMatrix4fv(u.uProj,false,perspective(Math.PI/4.2,aspect,.1,100));
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  if(this.mode==='earth'){
   const view=lookAt([0,0,this.distance],[0,0,0]);gl.uniformMatrix4fv(u.uView,false,view);
   this.drawMesh(this.globe,transform({ry:this.rotation}),{texture:true});return;
  }
  const target=[0,.5,0],eye=[Math.sin(this.yaw)*Math.cos(this.pitch)*this.distance,Math.sin(this.pitch)*this.distance+target[1],Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance];
  gl.uniformMatrix4fv(u.uView,false,lookAt(eye,target));
  if(this.terrain?.realTerrain&&this.terrainTexture){
   gl.bindTexture(gl.TEXTURE_2D,this.terrainTexture);
   this.drawMesh(this.land,identity(),{texture:true});
   gl.bindTexture(gl.TEXTURE_2D,this.texture);
  }else this.drawMesh(this.land);

  this.drawMesh(this.river,identity(),{alpha:.87});
  if(this.officialOutline){
    gl.disable(gl.CULL_FACE);
    this.drawMesh(this.officialOutline,identity(),{tint:[1.12,1.12,1.12]});
    gl.enable(gl.CULL_FACE);
  }
  if(this.frame&&this.terrain){
   const risks=assessBuildings(this.buildings,this.terrain,this.frame);
   const b=bounds(this.terrain);
   for(const house of risks){
    const [x,y,z]=point(this.terrain,house.r,house.c,b);
    const h=house.state==='severe' ? .32 : house.state==='exposed' ? .25 : .24;
    // Choreographed deformation is an illustrative proxy, not structural analysis.
    const wobble=house.state==='severe' ? Math.sin(this.time*1.1+house.r)*.08 : 0;
    const drift=house.state==='severe' ? Math.min(.30,Math.max(0,(this.frame.time-250)*.00025)) : 0;
    const boxModel=transform({x:x+drift,y:y+h/2,z, sx:.185,sy:h,sz:.17,rz:wobble});
    this.drawMesh(this.box,boxModel,{tint:house.state==='severe'?[.9,.37,.31]:house.state==='exposed'?[.94,.73,.48]:[.83,.85,.80]});
    this.drawMesh(this.roof,transform({x:x+drift,y:y+h,z, sx:.21,sy:.18,sz:.19,rz:wobble}),{tint:[.37,.26,.26]});
   }
   gl.depthMask(false);
   gl.disable(gl.CULL_FACE);
   this.drawMesh(this.water,identity(),{alpha:.77,water:true});
   gl.enable(gl.CULL_FACE);gl.depthMask(true);
  }else{
   for(const house of this.buildings){const [x,y,z]=point(this.terrain,house.r,house.c,bounds(this.terrain));this.drawMesh(this.box,transform({x,y:y+.12,z,sx:.185,sy:.24,sz:.17}),{tint:[.83,.85,.80]});this.drawMesh(this.roof,transform({x,y:y+.24,z,sx:.21,sy:.18,sz:.19}),{tint:[.37,.26,.26]});}
  }
 }
 dispose(){
  const gl=this.gl;this.resizeObserver.disconnect();this.canvas.removeEventListener('pointerdown',this.pointerDown);this.canvas.removeEventListener('pointermove',this.pointerMove);this.canvas.removeEventListener('pointerup',this.pointerUp);this.canvas.removeEventListener('wheel',this.wheel);
  for(const m of [this.globe,this.box,this.roof,this.land,this.water,this.river,this.officialOutline])disposeMesh(gl,m);
  if(this.terrainTexture)gl.deleteTexture(this.terrainTexture);gl.deleteTexture(this.texture);gl.deleteProgram(this.program);
 }
}
