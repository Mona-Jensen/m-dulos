/** Reduced 2.5D Canvas renderer for environments where WebGL2 is disabled.
 * Explicitly marked as compatibility view, not the 3D WebGL renderer.
 */
import { bounds,point } from './geometry.mjs';
import { assessBuildings } from '../engine/risk.mjs';
export class CanvasFallback {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    if(!this.ctx)throw new Error('Tampoco se pudo iniciar Canvas 2D');
    this.mode='earth';this.rotation=-1.92;this.distance=10;this.time=0;this.yaw=-.55;this.pitch=.6;
    this.img=new Image();this.img.src='/assets/earth-geography.jpg';this.frame=null;this.terrain=null;this.buildings=[];
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
    this.bindControls();this.resize();
  }
  resize(){const dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.max(1,Math.round(this.canvas.clientWidth*dpr)),h=Math.max(1,Math.round(this.canvas.clientHeight*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}}
  bindControls(){let down=false,lastX=0;this.down=e=>{down=true;lastX=e.clientX;this.canvas.setPointerCapture(e.pointerId);this.onUserInteract?.();};this.move=e=>{if(down){this.rotation+=(e.clientX-lastX)*.006;this.yaw+=(e.clientX-lastX)*.003;lastX=e.clientX;}};this.up=()=>{down=false;};this.wheel=e=>{e.preventDefault();this.distance=Math.max(5,Math.min(16,this.distance+Math.sign(e.deltaY)*.5));};this.canvas.addEventListener('pointerdown',this.down);this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerup',this.up);this.canvas.addEventListener('wheel',this.wheel,{passive:false});}
  setTerrain(terrain,buildings){this.terrain=terrain;this.buildings=buildings;this.mode='terrain';this.frame=null;}
  setFrame(frame,scenario){this.frame=frame;this.scenario=scenario;}
  render(dt){this.resize();this.time+=dt;const c=this.ctx,{width:w,height:h}=this.canvas;c.clearRect(0,0,w,h);this.mode==='earth'?this.drawEarth(c,w,h):this.drawTerrain(c,w,h);}
  drawEarth(c,w,h){const r=Math.min(w,h)*.34,xc=w*.61,yc=h*.53;
    c.save();c.beginPath();c.arc(xc,yc,r,0,Math.PI*2);c.clip();
    c.fillStyle='#1b5381';c.fillRect(xc-r,yc-r,2*r,2*r);
    if(this.img.complete&&this.img.naturalWidth){
      const sw=this.img.naturalWidth*.5,sh=this.img.naturalHeight;
      let start=(((.3056+(this.rotation+1.92)/(2*Math.PI)-.25)%1)+1)%1*this.img.naturalWidth;
      let remaining=sw,destX=xc-r;
      while(remaining>0){
        const available=Math.min(remaining,this.img.naturalWidth-start);
        const drawWidth=2*r*(available/sw);
        c.drawImage(this.img,start,0,available,sh,destX,yc-r,drawWidth,2*r);
        remaining-=available;destX+=drawWidth;start=0;
      }
      c.globalAlpha=.12;c.fillStyle='#569ec5';c.fillRect(xc-r,yc-r,r*2,r*2);c.globalAlpha=1;
    }
    const shadow=c.createLinearGradient(xc-r,yc-r,xc+r,yc+r);shadow.addColorStop(0,'#c6ecff66');shadow.addColorStop(.55,'#081d3100');shadow.addColorStop(1,'#010712ef');c.fillStyle=shadow;c.fillRect(xc-r,yc-r,2*r,2*r);
    c.restore();c.strokeStyle='#7bdcf355';c.lineWidth=3;c.beginPath();c.arc(xc,yc,r,0,Math.PI*2);c.stroke();
    this.watermark(c,w,h);
  }
  projection(x,y,z,w,h){
    const angle=this.yaw,co=Math.cos(angle),si=Math.sin(angle);
    const rx=x*co-z*si,rz=x*si+z*co;
    const scale=Math.min(w,h)*.105*(10/this.distance);
    return [w*.53+rx*scale,h*.58+(rz*.50-y*.85)*scale];
  }
  drawTerrain(c,w,h){if(!this.terrain)return;const t=this.terrain,{rows,cols}=t,b=bounds(t);
    const stride=Math.max(1,Math.floor(rows/45));
    for(let r=0;r<rows-stride;r+=stride){for(let cc=0;cc<cols-stride;cc+=stride){
      const vertices=[[r,cc],[r,cc+stride],[r+stride,cc+stride],[r+stride,cc]];
      const pp=vertices.map(([rr,col])=>this.projection(...point(t,rr,col,b),w,h));
      const v=t.heights[r*cols+cc],vmax=Math.max(1,b.max-b.min),hi=(v-b.min)/vmax;
      c.fillStyle=hi>.7?'#77766c':hi>.35?'#546a51':'#49674f';c.beginPath();c.moveTo(...pp[0]);for(const p of pp.slice(1))c.lineTo(...p);c.closePath();c.fill();
    }}
    if(this.frame){const depth=this.frame.depth;for(let r=0;r<rows-1;r+=stride)for(let col=0;col<cols-1;col+=stride){
      const i=r*cols+col;if(depth[i]<=.08)continue;
      const pp=[[r,col],[r,col+stride],[r+stride,col+stride],[r+stride,col]].map(([rr,cc])=>{const p=point(t,rr,cc,b);p[1]+=Math.max(.025,depth[i]*.076);return this.projection(...p,w,h);});
      c.fillStyle=this.scenario?.id==='flood'?'#43afccaf':'#ad8965bb';c.beginPath();c.moveTo(...pp[0]);for(const p of pp.slice(1))c.lineTo(...p);c.closePath();c.fill();
    }}
    const hazards=this.frame?assessBuildings(this.buildings,t,this.frame):this.buildings.map(b=>({...b,state:'normal'}));
    for(const bld of hazards){const xyz=point(t,bld.r,bld.c,b),p=this.projection(...xyz,w,h);c.fillStyle=bld.state==='severe'?'#e35b59':bld.state==='exposed'?'#e4af69':'#dfe9df';c.fillRect(p[0]-3,p[1]-7,6,7);c.fillStyle='#583a38';c.beginPath();c.moveTo(p[0]-4,p[1]-7);c.lineTo(p[0],p[1]-11);c.lineTo(p[0]+4,p[1]-7);c.fill();}
    this.watermark(c,w,h);
  }
  watermark(c,w,h){c.save();c.fillStyle='#e6af77';c.font='bold 12px Segoe UI, Arial';c.textAlign='right';c.fillText('MODO COMPATIBILIDAD 2.5D · WebGL2 no disponible',w-20,h-20);c.restore();}
  dispose(){this.resizeObserver.disconnect();this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('wheel',this.wheel);}
}
