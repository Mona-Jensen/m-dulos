export const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
export const normalize = (v) => { const n = Math.hypot(...v) || 1; return v.map(x => x/n); };
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
export const sub = (a,b) => a.map((v,i)=>v-b[i]);
export function perspective(fov,aspect,near,far) {
  const f = 1 / Math.tan(fov/2), range = 1 / (near-far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*range,-1, 0,0,2*far*near*range,0]);
}
export function lookAt(eye,target,up=[0,1,0]) {
  const z=normalize(sub(eye,target)), x=normalize(cross(up,z)), y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
export function multiply(a,b) {
  const out=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];
  return out;
}
export function transform({x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0,rz=0}={}) {
  const c=Math.cos(ry),s=Math.sin(ry),a=Math.cos(rz),b=Math.sin(rz);
  return new Float32Array([
    a*c*sx,b*c*sx,-s*sx,0,
    -b*sy,a*sy,0,0,
    a*s*sz,b*s*sz,c*sz,0,
    x,y,z,1,
  ]);
}
