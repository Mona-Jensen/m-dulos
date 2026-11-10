import { valleyCenter } from '../engine/terrain.mjs';
const rgb = (hex) => [parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];
export const palette = { flood: rgb('#45c8ee'), slide: rgb('#a87d57'), tailings: rgb('#ac9187') };
function normals(pos, indices) {
  const n=new Float32Array(pos.length);
  for(let k=0;k<indices.length;k+=3) {
    const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
    const ax=pos[b]-pos[a],ay=pos[b+1]-pos[a+1],az=pos[b+2]-pos[a+2];
    const bx=pos[c]-pos[a],by=pos[c+1]-pos[a+1],bz=pos[c+2]-pos[a+2];
    const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
    for(const i of [a,b,c]) {n[i]+=nx;n[i+1]+=ny;n[i+2]+=nz;}
  }
  for(let i=0;i<pos.length;i+=3){const l=Math.hypot(n[i],n[i+1],n[i+2])||1;n[i]/=l;n[i+1]/=l;n[i+2]/=l;}
  return n;
}
export function bounds(terrain) {
  let min=Infinity,max=-Infinity;
  for(const v of terrain.heights){min=Math.min(min,v);max=Math.max(max,v);}
  return {min,max};
}
export function point(terrain, r,c, b=bounds(terrain)) {
  const {rows,cols}=terrain;
  const scale=8/(terrain.dx*(cols-1));
  const realY=(terrain.heights[r*cols+c]-b.min)*scale-.35;
  const demoY=(terrain.heights[r*cols+c]-b.min)*.0069-.9;
  return [(c/(cols-1)-.5)*8,terrain.realTerrain?realY:demoY,(r/(rows-1)-.5)*8];
}
export function makeTerrainMesh(terrain) {
  const b=bounds(terrain);const {rows,cols}=terrain;
  const p=[],u=[],co=[],idx=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c;
    const [x,y,z]=point(terrain,r,c,b); p.push(x,y,z); u.push(c/(cols-1),r/(rows-1));
    const lo=Math.min(1,Math.max(0,(terrain.heights[i]-b.min)/(b.max-b.min||1)));
    const jag=.05*Math.sin(c*1.18+r*2.11);
    const nearRiver=!terrain.realTerrain&&Math.abs(c-(cols-1)/2-valleyCenter(r,rows))<3;
    const color=terrain.realTerrain?
    (lo>.72?[.58,.56,.51]:lo>.38?[.62,.51,.39]:[.53,.43,.33])
    :nearRiver?[.24,.30,.22]:lo>.73?[.45,.42,.39]:lo>.37?[.29+jag,.37+jag*.6,.29]:[.22,.36,.24];
    co.push(...color);
  }
  for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){
    const a=r*cols+c,d=a+cols;
    idx.push(a,d,a+1,d,d+1,a+1);
  }
  return {positions:new Float32Array(p),normals:normals(p,idx),uvs:new Float32Array(u),colors:new Float32Array(co),indices:new Uint32Array(idx)};
}
export function makeWaterMesh(terrain, depth, material='flood') {
  const {rows,cols}=terrain,b=bounds(terrain);
  const p=[],u=[],colors=[],idx=[];const tint=palette[material]||palette.flood;
  const realScale=terrain.realTerrain?8/(terrain.dx*(cols-1)):0;
  const surfaceOffset=terrain.realTerrain?Math.max(realScale*.05,.00005):.018;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const i=r*cols+c;
    const [x,y,z]=point(terrain,r,c,b);
    const h=depth?.[i]||0;
    p.push(x,y+surfaceOffset+h*(terrain.realTerrain?realScale:.076),z);
    u.push(c/(cols-1),r/(rows-1));
    colors.push(...tint);
  }
  // Each wet cell is a square between grid points; omit dry squares entirely.
  for(let r=0;r<rows-1;r++)for(let c=0;c<cols-1;c++){
    const a=r*cols+c,d=a+cols;
    const wet=Math.max(depth?.[a]||0,depth?.[a+1]||0,depth?.[d]||0,depth?.[d+1]||0);
    if(wet>.07) idx.push(a,d,a+1,d,d+1,a+1);
  }
  // Separate material uniforms handle transparency and specular appearance.
  return {positions:new Float32Array(p),normals:new Float32Array(p.length).fill(0).map((_,i)=>i%3===1?1:0),
    uvs:new Float32Array(u),colors:new Float32Array(colors),indices:new Uint32Array(idx)};
}
export function makeSphere(radius=2.65, lon=128, lat=64) {
  const p=[],n=[],uv=[],col=[],ind=[];
  for(let y=0;y<=lat;y++){
    const theta=y/lat*Math.PI,sy=Math.cos(theta),sr=Math.sin(theta);
    for(let x=0;x<=lon;x++){
      const phi=x/lon*Math.PI*2;
      const xx=sr*Math.sin(phi),zz=sr*Math.cos(phi);
      p.push(radius*xx,radius*sy,radius*zz);n.push(xx,sy,zz);uv.push(x/lon,1-y/lat);col.push(1,1,1);
    }
  }
  for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
    const a=y*(lon+1)+x,b=a+lon+1;ind.push(a,b,a+1,b,b+1,a+1);
  }
  return {positions:new Float32Array(p),normals:new Float32Array(n),uvs:new Float32Array(uv),
    colors:new Float32Array(col),indices:new Uint32Array(ind)};
}
export function makeBox() {
  const faces=[
    // normal, four corners in face order
    [[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[-.5,.5,.5],[.5,.5,.5]],
    [[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5]],
    [[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,.5],[.5,.5,-.5]],
    [[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,-.5],[-.5,.5,.5]],
    [[0,1,0],[-.5,.5,.5],[.5,.5,.5],[-.5,.5,-.5],[.5,.5,-.5]],
    [[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[-.5,-.5,.5],[.5,-.5,.5]],
  ];
  const pos=[],norm=[],uv=[],co=[],ind=[];
  for(const f of faces){const i=pos.length/3;for(let k=1;k<5;k++){pos.push(...f[k]);norm.push(...f[0]);uv.push(k%2,(k>>1)%2);co.push(1,1,1);}ind.push(i,i+1,i+2,i+2,i+1,i+3);}
  return {positions:new Float32Array(pos),normals:new Float32Array(norm),uvs:new Float32Array(uv),colors:new Float32Array(co),indices:new Uint32Array(ind)};
}
export function makePyramidRoof(){
 const p=[-.55,0,-.55,.55,0,-.55, .55,0,.55,-.55,0,.55,0,.55,0];
 const ind=[0,1,4,1,2,4,2,3,4,3,0,4];
 return {positions:new Float32Array(p),normals:normals(p,ind),uvs:new Float32Array(10),colors:new Float32Array(15).fill(1),indices:new Uint32Array(ind)};
}
export function makeRiver(terrain) {
 const {rows,cols}=terrain,b=bounds(terrain);const pos=[],norm=[],uv=[],co=[],idx=[];
 for(let r=0;r<rows;r++){
   const center=(cols-1)/2+valleyCenter(r,rows);
   for(const off of [-.58,.58]){
     const c=Math.max(0,Math.min(cols-1,Math.round(center+off)));
     const [x,y,z]=point(terrain,r,c,b);
     pos.push(x,y+.026,z);norm.push(0,1,0);uv.push(0,0);co.push(.07,.30,.36);
   }
 }
 for(let r=0;r<rows-1;r++){const a=r*2;idx.push(a,a+2,a+1,a+2,a+3,a+1);}
 return {positions:new Float32Array(pos),normals:new Float32Array(norm),uvs:new Float32Array(uv),colors:new Float32Array(co),indices:new Uint32Array(idx)};
}


export function makeOfficialOutline(terrain, geometry, box) {
  if (!terrain.realTerrain) {
    throw Error('El contorno requiere terreno real');
  }

  const rings = geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat(1)
      : [];

  const b = bounds(terrain);
  const {rows, cols} = terrain;
  const scale = 8 / (terrain.dx * (cols - 1));

  const p = [], uv = [], colors = [], idx = [];

  function coord(lon, lat) {
    const gx = (lon - box.west) / (box.east - box.west) * (cols - 1);
    const gy = (box.north - lat) / (box.north - box.south) * (rows - 1);

    if (gx < 0 || gy < 0 || gx > cols-1 || gy > rows-1) {
      return null;
    }

    const c = Math.min(cols-2, Math.floor(gx));
    const r = Math.min(rows-2, Math.floor(gy));

    const tx = gx-c, ty = gy-r;
    const a = terrain.heights[r*cols+c];
    const v = terrain.heights[r*cols+c+1];
    const d = terrain.heights[(r+1)*cols+c];
    const e = terrain.heights[(r+1)*cols+c+1];

    const h = (a*(1-tx)+v*tx)*(1-ty)
            + (d*(1-tx)+e*tx)*ty;

    return [
      (gx/(cols-1)-.5)*8,
      (h-b.min)*scale-.35+.012,
      (gy/(rows-1)-.5)*8
    ];
  }

  for (const ring of rings) {
    if (ring.length < 3) continue;

    const pts = [];

    for (let i=0; i<ring.length; i++) {
      const a = ring[i];
      const z = ring[(i+1)%ring.length];

      if (!Number.isFinite(a[0]) || !Number.isFinite(a[1])) continue;

      const x1 = (a[0]-box.west)/(box.east-box.west)*8;
      const z1 = (box.north-a[1])/(box.north-box.south)*8;
      const x2 = (z[0]-box.west)/(box.east-box.west)*8;
      const z2 = (box.north-z[1])/(box.north-box.south)*8;

      const steps = Math.max(
        1, Math.ceil(Math.hypot(x2-x1,z2-z1)/.024)
      );

      for (let k=0; k<steps; k++) {
        const t = k/steps;
        const pt = coord(
          a[0]*(1-t)+z[0]*t,
          a[1]*(1-t)+z[1]*t
        );
        if (pt) pts.push(pt);
      }
    }

    if (pts.length < 3) continue;

    pts.push(pts[0]);
    const first = p.length/3;

    for (let i=0; i<pts.length; i++) {
      const prev = pts[(i-1+pts.length-1)%(pts.length-1)];
      const next = pts[(i+1)%(pts.length-1)];
      const here = pts[i];

      const dx = next[0]-prev[0];
      const dz = next[2]-prev[2];
      const length = Math.hypot(dx,dz)||1;

      const ox = dz/length*.007;
      const oz = -dx/length*.007;

      p.push(
        here[0]+ox, here[1], here[2]+oz,
        here[0]-ox, here[1], here[2]-oz
      );

      uv.push(0,0,1,0);
      colors.push(1,.57,.16,1,.57,.16);

      if (i>0) {
        const a=first+(i-1)*2;
        const c=first+i*2;
        idx.push(a,a+1,c,a+1,c+1,c);
      }
    }
  }

  const ns = new Float32Array(p.length);
  for (let i=1; i<ns.length; i+=3) ns[i]=1;

  return {
    positions:new Float32Array(p),
    normals:ns,
    uvs:new Float32Array(uv),
    colors:new Float32Array(colors),
    indices:new Uint32Array(idx)
  };
}
