/** Catastro oficial en coordenadas reales WGS84. No constituye terreno 3D. */
const $=id=>document.getElementById(id);
const num=(v,d=0)=>v==null||v===''||!Number.isFinite(Number(v))?'No informado':Number(v).toLocaleString('es-CL',{maximumFractionDigits:d});
const word=v=>v==null||v===''?'No informado':String(v);
const coords=g=>{
 if(!g)return [];
 if(g.type==='Point')return [g.coordinates];
 if(g.type==='Polygon')return g.coordinates.flat();
 if(g.type==='MultiPolygon')return g.coordinates.flat(2);
 return [];
};
export function initCatalog({onOpen=()=>{},onClose=()=>{}}={}){
 const pane=$('catalogView'),canvas=$('catalogCanvas'),ctx=canvas.getContext('2d');
 const state={all:[],filtered:[],source:null,region:'',search:'',selected:null,camera:{lon:-70.5,lat:-31,scale:19},width:1,height:1,paths:[],drag:null};
 let initialized=false;
 function setInfo(key,value){const p=document.createElement('div'),label=document.createElement('dt'),v=document.createElement('dd');label.textContent=key;v.textContent=value;p.append(label,v);$('depositFacts').append(p);}
 function showDeposit(feature){
  state.selected=feature;
  if(feature)window.dispatchEvent(new CustomEvent('sirm:featureselected',{detail:feature}));
  const p=feature?.properties||{};
  $('depositFacts').replaceChildren();
  $('selectedLabel').textContent=feature?word(p.NOMBRE_INSTALACION):'Selecciona un depósito';
  if(!feature){$('depositIntro').textContent='Haz clic sobre un punto o polígono para consultar su información publicada.';return;}
  $('depositIntro').textContent=state.source?.kind==='puntos'?'Ubicación oficial, sin polígono disponible en esta vista.':'Polígono publicado; no contiene la estructura 3D del muro.';
  for(const [label,val] of [
    ['ID oficial',word(p.ID)],['Faena',word(p.NOMBRE_FAENA)],['Empresa',word(p.NOMBRE_EMPRESA_O_PRODUCTOR_MINE||p.NOMBRE_EMPRESA_O_PRODUCTOR_MINERO)],
    ['Región',word(p.REGION)],['Comuna',word(p.COMUNA)],['Estado',word(p.ESTADO_INSTALACION)],
    ['Tipo',word(p.TIPO_DEPOSITO)],['Método muro',word(p.METODO_CONSTRUCTIVO_MURO)],
    ['Volumen autorizado (unidad de fuente)',num(p.VOL_AUTORIZADO)],['Volumen actual (unidad de fuente)',num(p.VOL_ACTUAL)],
    ['Área cartográfica (ha)',num(p.areaha2??p.AREA_HA??null,4)]
  ])setInfo(label,val);
  if(feature.geometry.type==='Point')setInfo('Coordenadas WGS84',feature.geometry.coordinates.map(c=>num(c,6)).join(', '));
 }
 function forward(lon,lat){const cos=Math.cos(state.camera.lat*Math.PI/180);return [state.width/2+(lon-state.camera.lon)*state.camera.scale*cos,state.height/2-(lat-state.camera.lat)*state.camera.scale];}
 function inverse(x,y){const cos=Math.cos(state.camera.lat*Math.PI/180);return [state.camera.lon+(x-state.width/2)/state.camera.scale/cos,state.camera.lat-(y-state.height/2)/state.camera.scale];}
 function fit(list){
  const pts=list.flatMap(f=>coords(f.geometry)).filter(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1]));
  if(!pts.length)return;
  let lo=Infinity,hi=-Infinity,bot=Infinity,top=-Infinity;
  for(const [lon,lat] of pts){if(lon<lo)lo=lon;if(lon>hi)hi=lon;if(lat<bot)bot=lat;if(lat>top)top=lat;}
  state.camera.lon=(lo+hi)/2;state.camera.lat=(bot+top)/2;
  const cs=Math.cos(state.camera.lat*Math.PI/180);
  state.camera.scale=Math.max(2,Math.min(8000,Math.min((state.width-100)/Math.max((hi-lo)*cs,.05),(state.height-95)/Math.max(top-bot,.05))*.88));
  draw();
 }
 function applyFilters(zoom=true){
  const q=state.search.toLocaleLowerCase('es-CL');
  state.filtered=state.all.filter(f=>{
   const p=f.properties||{};
   return (!state.region||p.REGION===state.region)&&(!q||[p.ID,p.NOMBRE_INSTALACION,p.NOMBRE_FAENA,p.COMUNA,p.NOMBRE_EMPRESA_O_PRODUCTOR_MINERO,p.NOMBRE_EMPRESA_O_PRODUCTOR_MINE].some(v=>String(v||'').toLocaleLowerCase('es-CL').includes(q)));
  });
  $('visibleCount').textContent=`${num(state.filtered.length)} entidades visibles`;
  if(zoom)fit(state.filtered);else draw();
 }
 function resize(){
  const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
  const ratio=Math.min(devicePixelRatio||1,2);
  state.width=box.width;state.height=box.height;
  canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);draw();
 }
 function draw(){
  const w=state.width,h=state.height;ctx.clearRect(0,0,w,h);
  const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#11263a');gradient.addColorStop(1,'#061321');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#294359';ctx.lineWidth=.65;ctx.fillStyle='#668ca4';ctx.font='10px Segoe UI,Arial';
  const nw=inverse(0,0),se=inverse(w,h),minLon=Math.max(-180,Math.floor(nw[0]/5)*5),maxLon=Math.min(180,Math.ceil(se[0]/5)*5),minLat=Math.max(-90,Math.floor(se[1]/5)*5),maxLat=Math.min(90,Math.ceil(nw[1]/5)*5);
  if((maxLon-minLon)/5<100 && (maxLat-minLat)/5<100){
   for(let lo=minLon;lo<=maxLon;lo+=5){const [x]=forward(lo,0);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.fillText(`${Math.abs(lo)}°O`,x+4,h-12);}
   for(let lat=minLat;lat<=maxLat;lat+=5){const [,y]=forward(0,lat);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();ctx.fillText(`${Math.abs(lat)}°S`,8,y-5);}
  }
  state.paths=[];
  for(const feature of state.filtered){
   const geom=feature.geometry,selected=feature===state.selected;
   const status=feature.properties?.ESTADO_INSTALACION;
   const color=status==='ACTIVO'?'#60d9c4':status==='ABANDONADO'?'#e99b78':status==='INACTIVO'?'#89aadc':'#c6d0da';
   if(geom.type==='Point'){
    const [x,y]=forward(...geom.coordinates);if(x< -20||x>w+20||y< -20||y>h+20)continue;
    ctx.beginPath();ctx.arc(x,y,selected?6:2.7,0,Math.PI*2);ctx.fillStyle=selected?'#fff2a9':color;ctx.fill();
    state.paths.push({feature,x,y});
   }else{
    const polygons=geom.type==='Polygon'?[geom.coordinates]:geom.coordinates;
    const path=new Path2D();
    for(const poly of polygons)for(const ring of poly){ring.forEach((coord,i)=>{const [x,y]=forward(coord[0],coord[1]);if(i===0)path.moveTo(x,y);else path.lineTo(x,y);});path.closePath();}
    ctx.fillStyle=selected?'#ffda74a0':color+'68';ctx.strokeStyle=selected?'#fff4bf':color;ctx.lineWidth=selected?2:.8;
    ctx.fill(path,'evenodd');ctx.stroke(path);state.paths.push({feature,path});
   }
  }
  ctx.fillStyle='#b0cadb';ctx.font='11px Segoe UI,Arial';ctx.fillText('WGS84 · Visualización planimétrica · Sin elevaciones de muro',12,22);
  ctx.fillStyle='#7d9cb0';ctx.fillText(`${state.source?.kind==='poligonos'?'POLÍGONOS OFICIALES':'PUNTOS DEL CATASTRO'} · ${state.filtered.length.toLocaleString('es-CL')} entidades`,12,39);
 }
 async function refresh(){
  const [info,resp]=await Promise.all([fetch('/api/catalog/status'),fetch('/api/catalog/geojson')]);
  if(!info.ok||!resp.ok)throw new Error('No se pudo consultar la base local de SIRM');
  const meta=await info.json(),data=await resp.json();
  if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Datos GeoJSON inválidos');
  state.all=data.features;state.source=data.sirm;
  $('catalogMode').textContent=meta.ready?'POLÍGONOS DEL SERVICIO OFICIAL':'SOLO UBICACIONES PUNTUALES';
  $('catalogCount').textContent=num(state.all.length);
  $('catalogStatus').textContent=meta.ready?`Sincronización: ${new Date(meta.verifiedAt).toLocaleString('es-CL')}. Hash SHA-256 disponible. Contornos 2D, no estructuras de muro.`:'Sin polígonos descargados todavía. Se muestran 836 ubicaciones del Excel de octubre 2025, sin simular perímetros.';
  $('syncCatalog').disabled=meta.syncing;
  const previous=state.region;
  $('regionFilter').replaceChildren(new Option('Todas las regiones',''));
  [...new Set(state.all.map(f=>f.properties?.REGION).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es-CL')).forEach(r=>$('regionFilter').append(new Option(r,r)));
  $('regionFilter').value=[...$('regionFilter').options].some(o=>o.value===previous)?previous:'';
  state.region=$('regionFilter').value;state.selected=null;showDeposit(null);applyFilters(true);
 }
 async function synchronize(){
  $('syncCatalog').disabled=true;$('syncCatalog').textContent='Sincronizando…';
  $('catalogStatus').textContent='Consultando SERNAGEOMIN directamente. Se conservará la última versión válida si falla.';
  try{
   const res=await fetch('/api/catalog/sync',{method:'POST'}),result=await res.json();
   if(!res.ok||!result.ok)throw new Error(result.error||'Sincronización fallida');
   await refresh();
  }catch(e){$('catalogStatus').textContent=`No se actualizaron los datos: ${e.message}`;}
  finally{$('syncCatalog').disabled=false;$('syncCatalog').textContent='↻ Sincronizar polígonos';}
 }
 const obs=new ResizeObserver(()=>{if(!pane.classList.contains('hidden'))resize();});obs.observe(canvas);
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);state.drag={x:e.offsetX,y:e.offsetY,lon:state.camera.lon,lat:state.camera.lat,travel:0};});
 canvas.addEventListener('pointermove',e=>{if(!state.drag)return;let dx=e.offsetX-state.drag.x,dy=e.offsetY-state.drag.y;state.drag.travel=Math.max(state.drag.travel,Math.hypot(dx,dy));const cs=Math.cos(state.camera.lat*Math.PI/180);state.camera.lon=state.drag.lon-dx/state.camera.scale/cs;state.camera.lat=state.drag.lat+dy/state.camera.scale;draw();});
 canvas.addEventListener('pointerup',e=>{
  const drag=state.drag;state.drag=null;if(!drag||drag.travel>5)return;
  let match=null;
  for(let i=state.paths.length-1;i>=0;i--){const p=state.paths[i];if(p.path?ctx.isPointInPath(p.path,e.offsetX,e.offsetY,'evenodd'):Math.hypot(e.offsetX-p.x,e.offsetY-p.y)<9){match=p.feature;break;}}
  showDeposit(match);draw();
 });
 canvas.addEventListener('wheel',e=>{
  e.preventDefault();const before=inverse(e.offsetX,e.offsetY);state.camera.scale=Math.min(25000,Math.max(1.5,state.camera.scale*(e.deltaY<0?1.25:.8)));
  const after=inverse(e.offsetX,e.offsetY);state.camera.lon+=before[0]-after[0];state.camera.lat+=before[1]-after[1];draw();
 },{passive:false});
 $('regionFilter').addEventListener('change',e=>{state.region=e.target.value;applyFilters(true);});
 $('catalogSearch').addEventListener('input',e=>{state.search=e.target.value.trim();applyFilters(true);});
 $('fitCatalog').addEventListener('click',()=>fit(state.filtered));
 $('syncCatalog').addEventListener('click',synchronize);
 $('closeCatalog').addEventListener('click',()=>{pane.classList.add('hidden');onClose();});
 return {async open(){pane.classList.remove('hidden');onOpen();requestAnimationFrame(resize);if(!initialized){initialized=true;try{await refresh();}catch(e){$('catalogStatus').textContent=`Error: ${e.message}`;}}else{try{await refresh();}catch(e){$('catalogStatus').textContent=`Error: ${e.message}`;}}}};
}
