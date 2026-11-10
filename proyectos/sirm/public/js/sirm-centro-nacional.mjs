const root=document.getElementById('sidebar');
if(root&&!document.getElementById('sirm-centro-nacional')){
 const panel=document.createElement('section');
 panel.id='sirm-centro-nacional';
 panel.style.cssText='padding:14px;margin:14px 0;border:1px solid #48788b;border-radius:12px;background:#0c283ae8;color:#e8f4fa;display:grid;gap:9px;font:13px Segoe UI,Arial';
 panel.innerHTML='<strong style="font-size:16px">SIRM · Centro nacional integrado</strong><small>Fuentes oficiales, consultas, simulación y video en esta pantalla.</small><div style="padding:7px 8px;border:1px solid rgba(169,228,255,.5);background:rgba(18,46,58,.8);border-radius:8px;color:#dff3ff;line-height:1.45">⚠ Fuentes nacionales: contexto geográfico y documental. No alimentan el modelo físico ni sustituyen la predicción geotécnica ni la validación de campo.</div><label>Latitud <input id="sn-lat" type="number" step="any" value="-27.4025" style="width:110px"></label><label>Longitud <input id="sn-lon" type="number" step="any" value="-70.2534" style="width:110px"></label><label>Radio <select id="sn-km"><option>25</option><option selected>50</option><option>120</option><option>250</option></select> km</label><button id="sn-check">Consultar fuentes nacionales</button><div id="sn-status" style="white-space:pre-wrap;line-height:1.5">Esperando consulta. Las fuentes oficiales se usan como contexto documental, no como predicción operativa.</div><details><summary>Resultados y procedencia</summary><div id="sn-results" style="max-height:360px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px"></div></details><hr style="width:100%"><strong>Consulta documental / SIRM IA</strong><textarea id="sn-question" rows="3" placeholder="Consulta cualquier instalación, empresa, comuna, volumen o antecedente del catastro" style="width:100%;box-sizing:border-box;background:#173b4b;color:white;border-radius:6px;padding:8px"></textarea><button id="sn-ask">Consultar registros e IA</button><div id="sn-answer" style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;max-height:340px;overflow:auto"></div><hr style="width:100%"><strong>Recreación audiovisual</strong><button id="sn-play">Ejecutar escenario actual</button><button id="sn-video">Grabar simulación 3D de 30 segundos</button><div id="sn-video-status" style="white-space:pre-wrap">Se grabará un escenario demostrativo. El video no representa una predicción ni un modelo geotécnico validado.</div><small>Copernicus GLO-30 se detecta como GeoTIFF; aún no se carga como malla. La IA generativa requiere API configurada. Los videos son demostrativos hasta validar el modelo.</small>';
 root.append(panel);
 window.addEventListener('sirm:featureselected',event=>{
  const feature=event.detail,geometry=feature?.geometry;if(!geometry)return;
  const c=geometry.type==='Point'?[geometry.coordinates]:geometry.type==='Polygon'?geometry.coordinates.flat():geometry.type==='MultiPolygon'?geometry.coordinates.flat(2):[];
  const finite=c.filter(v=>Array.isArray(v)&&Number.isFinite(v[0])&&Number.isFinite(v[1]));
  if(!finite.length)return;
  const west=Math.min(...finite.map(v=>v[0])),east=Math.max(...finite.map(v=>v[0]));
  const south=Math.min(...finite.map(v=>v[1])),north=Math.max(...finite.map(v=>v[1]));
  panel.querySelector('#sn-lat').value=((north+south)/2).toFixed(6);
  panel.querySelector('#sn-lon').value=((west+east)/2).toFixed(6);
  panel.querySelector('#sn-status').textContent='Área seleccionada: '+(feature.properties?.NOMBRE_INSTALACION||feature.properties?.ID||'Depósito')+'. Contexto geográfico y documental; no es una predicción operativa.';
 });
 const $=id=>panel.querySelector('#'+id);const say=(id,t)=>$(id).textContent=t;
 const params=()=>{const p=new URLSearchParams({lat:$('sn-lat').value,lon:$('sn-lon').value,km:$('sn-km').value});return '?'+p;};
 async function api(url,options){const r=await fetch(url,options),d=await r.json();if(!r.ok)throw Error(d.error||'HTTP '+r.status);return d;}
 $('sn-check').onclick=async()=>{
  $('sn-check').disabled=true;say('sn-status','Consultando DGA, Copernicus y MeteoChile…');$('sn-results').replaceChildren();
  try{
   const names=['estado','dem','sentinel','dga','meteochile'];
   const results=await Promise.allSettled(names.map(n=>api('/api/sirm-nacional/'+n+(n==='estado'?'':params()))));
   const lines=[];
   results.forEach((r,i)=>{
    if(r.status==='fulfilled'){
     const d=r.value;const note=(d.usoRecomendado||d.aviso||d.observacion||'Información disponible');
     lines.push(names[i]+': '+note);
     const details=document.createElement('details'),heading=document.createElement('summary');heading.textContent=names[i].toUpperCase();details.append(heading);
     const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';pre.textContent=JSON.stringify(d,null,2).slice(0,24000);details.append(pre);$('sn-results').append(details);
     if(d.descarga&&/^https:\/\/copernicus-dem-30m\.s3\.amazonaws\.com\//.test(d.descarga)){
      const a=document.createElement('a');a.href=d.descarga;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Abrir archivo Copernicus DEM (GeoTIFF)';a.style.color='#a9e4ff';$('sn-results').append(a);
     }
    }else lines.push(names[i]+': no disponible ('+r.reason.message+')');
   });
   say('sn-status',lines.join('\n')+'\n\nAviso: DEM, Sentinel-2 y observaciones oficiales son contexto geográfico y documental. No alimentan la simulación ni reemplazan la validación geotécnica ni la de campo.');
  }catch(e){say('sn-status','No se pudo consultar: '+e.message+'\n\nLas fuentes oficiales no se interpretan como predicción ni como modelo operativo.')}finally{$('sn-check').disabled=false;}
 };
 $('sn-ask').onclick=async()=>{
  const question=$('sn-question').value.trim();if(question.length<3)return say('sn-answer','Escribe una consulta.');
  $('sn-ask').disabled=true;say('sn-answer','Buscando información…');
  try{
   const d=await api('/api/sirm-nacional/preguntar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
   const part=['Registros en catálogo: '+d.total,'Coincidencias: '+d.coincidencias,'Fuente: '+d.fuente];
   if(d.respuestaIA)part.push('\nRESPUESTA IA:\n'+d.respuestaIA);
   else part.push('\nIA generativa no configurada. Se muestran coincidencias documentales.');
   if(d.iaError)part.push('Error IA: '+d.iaError);
   for(const r of d.registros.slice(0,6))part.push('\nID '+r.id+'\n'+JSON.stringify(r.campos,null,2));
   for(const doc of d.documentos)part.push('\nDOCUMENTO '+doc.document+'\n'+doc.excerpt);
   part.push('\n'+d.aviso);say('sn-answer',part.join('\n')+'\n\nNota: la información documental no sustituye análisis geotécnico ni validación de campo.');
  }catch(e){say('sn-answer','Error: '+e.message);}finally{$('sn-ask').disabled=false;}
 };
 $('sn-play').onclick=()=>{
  if(!window.SIRM_CORE)return say('sn-video-status','El simulador principal todavía no inicializa.');
  window.SIRM_CORE.executeSimulation();say('sn-video-status','Se ejecuta el escenario demostrativo del visor principal. La simulación sigue siendo no operacional y no sustituye un estudio geotécnico.');
 };
 $('sn-video').onclick=async()=>{
  const core=window.SIRM_CORE;
  if(!core?.app.timeline)return say('sn-video-status','Ejecuta primero una simulación en el visor principal.');
  if(core.app.recording||core.app.sirm30)return;
  const canvas=document.getElementById('scene');if(!canvas.captureStream||!window.MediaRecorder)return say('sn-video-status','Este navegador no admite grabación de canvas.');
  const type=['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
  if(!type)return say('sn-video-status','No hay codificador de video compatible.');
  const display=document.createElement('canvas');display.width=1280;display.height=720;
  const ctx=display.getContext('2d');const stream=display.captureStream(24),chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:3500000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const state=core.app,old={playing:state.playing,time:state.playbackSeconds,yaw:state.scene.yaw};
  state.playing=false;state.sirm30=true;$('sn-video').disabled=true;
  try{
   const done=new Promise(resolve=>{recorder.onstop=resolve;});recorder.start(1000);
   const start=performance.now();
   await new Promise(resolve=>{
    function frame(now){
     const p=Math.min(1,(now-start)/30000);
     state.playbackSeconds=p*180;state.scene.yaw=old.yaw+p*Math.PI*2;
     core.renderFrame();
     ctx.drawImage(canvas,0,0,1280,720);
     ctx.fillStyle='#061928df';ctx.fillRect(0,648,1280,72);
     ctx.fillStyle='#ffffff';ctx.font='20px Arial';
     const origin=state.terrain.provenance?.type||'no verificada';
     ctx.fillText('SIRM · Escenario demostrativo · Terreno: '+origin+' · '+Math.round(p*180)+' s modelados',20,682);
     if(p<1){say('sn-video-status','Grabando '+Math.round(p*100)+'%. Mantén la pestaña visible. El video es ilustrativo, no predictivo.');requestAnimationFrame(frame);}else resolve();
    }requestAnimationFrame(frame);
   });
   recorder.stop();await done;
   const blob=new Blob(chunks,{type});if(!blob.size)throw Error('Grabación vacía');
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SIRM-escenario-30s.'+(type.includes('mp4')?'mp4':'webm');a.click();
   setTimeout(()=>URL.revokeObjectURL(url),60000);say('sn-video-status','Video finalizado: verifica el archivo descargado. Es un material demostrativo, no un pronóstico operativo.');
  }catch(e){say('sn-video-status','Error de grabación: '+e.message);if(recorder.state==='recording')recorder.stop();}
  finally{stream.getTracks().forEach(t=>t.stop());state.playbackSeconds=old.time;state.scene.yaw=old.yaw;state.playing=old.playing;state.sirm30=false;$('sn-video').disabled=false;}
 };
}


// SIRM_IMPORTADOR_COPERNICUS_6
{
 const panel=document.getElementById('sirm-centro-nacional');
 const anchor=panel?.querySelector('#sn-check');

 if(!anchor)
  throw Error('No se encontró el Centro Nacional.');

 if(!panel.querySelector('#sn-cop-file')){
  const section=document.createElement('section');

  section.style.cssText=
   'display:grid;gap:7px;padding:9px;'+
   'border:1px solid #507a91;border-radius:7px';

  const heading=document.createElement('strong');
  heading.textContent='Copernicus · Importar GeoTIFF';

  const description=document.createElement('small');
  description.textContent=
   'Importa un DEM y recorta un área de aproximadamente 10 × 10 km.';

  const button=document.createElement('button');
  button.type='button';
  button.textContent='Cargar terreno real (.tif)';

  const select=document.createElement('select');
  select.innerHTML=
   '<option value="file">Centro del GeoTIFF</option>'+
   '<option value="panel">Coordenadas del panel SIRM</option>';

  const input=document.createElement('input');
  input.type='file';
  input.id='sn-cop-file';
  input.accept='.tif,.tiff';
  input.hidden=true;

  const message=document.createElement('output');
  message.style.cssText=
   'font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere';
  message.textContent='Esperando archivo Copernicus. Contexto documental, no predicción.';

  section.append(
   heading,description,select,button,input,message
  );

  anchor.before(section);

  button.onclick=()=>input.click();

  let loading;

  async function getGeoTIFF(){
   if(window.GeoTIFF?.fromBlob)
    return window.GeoTIFF;

   if(!loading){
    loading=new Promise((resolve,reject)=>{
     const script=document.createElement('script');

     script.src=
      'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js';

     script.onload=()=>window.GeoTIFF?.fromBlob
      ?resolve(window.GeoTIFF)
      :reject(Error('Lector GeoTIFF no disponible.'));

     script.onerror=()=>reject(
      Error('No se pudo cargar GeoTIFF.js. Revisa Internet.')
     );

     document.head.append(script);
    }).catch(error=>{
     loading=null;
     throw error;
    });
   }

   return loading;
  }

  function validateProjectedGeoTIFF(image){
   const geoKeys=image?.getGeoKeys?.() ?? {};
   const geographicType=Number(geoKeys.GeographicTypeGeoKey ?? NaN);
   const projectedType=Number(geoKeys.ProjectedCSTypeGeoKey ?? NaN);
   const modelType=Number(geoKeys.GTModelTypeGeoKey ?? NaN);

   if (!Number.isFinite(projectedType) && Number.isFinite(geographicType)) {
     throw Error('Este DEM no está en un CRS proyectado. Reprojéctalo a UTM o un sistema métrico antes de importarlo.');
   }

   if (Number.isFinite(geographicType) && geographicType === 4326) {
     throw Error('GeoTIFF en EPSG:4326: reproyecta a UTM antes de importarlo.');
   }

   if (!Number.isFinite(projectedType) && Number.isFinite(modelType) && modelType !== 2) {
     throw Error('El GeoTIFF no presenta una proyección útil para la cuenca.');
   }

   return true;
  }

  input.onchange=async()=>{
   const file=input.files?.[0];
   if(!file)return;

   button.disabled=true;

   try{
    if(!/\.tiff?$/i.test(file.name)||
       !file.size||
       file.size>512*1024*1024)
     throw Error('Selecciona un GeoTIFF válido de hasta 512 MB.');

    const core=window.SIRM_CORE;

    if(!core?.app?.scene||
       typeof core.enterTerrain!=='function')
     throw Error('El visor principal todavía no está inicializado.');

    if(!core.app.scene.gl)
     throw Error('Se necesita WebGL2 para mostrar el terreno real.');

    if(core.app.recording||core.app.sirm30)
     throw Error('Finaliza primero la grabación.');

    message.textContent='Abriendo GeoTIFF...';

    const library=await getGeoTIFF();
    const tiff=await library.fromBlob(file);
    const image=await tiff.getImage();
    validateProjectedGeoTIFF(image);

    const limits=image.getBoundingBox();
    const [ox,oy]=image.getOrigin();
    const [rx,ry]=image.getResolution();

    if(!Array.isArray(limits)||limits.length!==4||
       ![ox,oy,rx,ry].every(Number.isFinite) ||
       rx<=0 || ry<=0)
     throw Error('Orientación del GeoTIFF no compatible.');

    const projectedWidth = Math.abs(limits[2]-limits[0]);
    const projectedHeight = Math.abs(limits[3]-limits[1]);

    if (projectedWidth <= 0 || projectedHeight <= 0) {
      throw Error('El GeoTIFF no expone un rectángulo de elevación válido.');
    }

    const latCenter=(limits[1]+limits[3])/2;
    const lonCenter=(limits[0]+limits[2])/2;

    if (select.value==='panel') {
      const la=panel.querySelector('#sn-lat')?.value;
      const lo=panel.querySelector('#sn-lon')?.value;
      if(!la||!lo) throw Error('Introduce latitud y longitud en el panel.');
      if (Math.abs(Number(la)-latCenter) > 0.5 || Math.abs(Number(lo)-lonCenter) > 0.5) {
        message.textContent='El GeoTIFF no está centrado en el área del panel.';
      }
    }

    const N=128;

    message.textContent='Convirtiendo elevaciones a terreno 3D...';

    const raster=await image.readRasters({
     window:[0,0,image.getWidth(),image.getHeight()],
     width:N,
     height:N,
     samples:[0],
     resampleMethod:'bilinear'
    });

    const heights=Array.from(raster[0]||[]);

    const missingText=image.getGDALNoData?.();
    const missing=
     missingText==null?null:Number(missingText);

    if(heights.length!==N*N||
       !heights.every(h=>
        Number.isFinite(h)&&
        h>-500&&h<9000&&
        (missing===null||
         !Number.isFinite(missing)||
         Math.abs(h-missing)>0.001)
       ))
     throw Error('El DEM tiene elevaciones inválidas o celdas sin datos.');

    const bounds=[limits[0], limits[1], limits[2], limits[3]];
    const metersX = Math.abs(bounds[2]-bounds[0]);
    const metersY = Math.abs(bounds[3]-bounds[1]);

    if (Math.abs(metersX-metersY)/Math.max(metersX,metersY) > 0.2) {
      throw Error('El recorte tiene escalas incompatibles entre ejes proyectados.');
    }

    const terrain={
     rows:N,
     cols:N,
     dx:(metersX+metersY)/2/(N-1),
     heights:new Float32Array(heights),
     realTerrain:true,
     boundsWGS84:bounds,
     provenance:{
      type:'external',
      source:'GeoTIFF seleccionado por usuario',
      label:'DEM importado · '+file.name,
      filename:file.name,
      warning:'Terreno georreferenciado. Escenario exploratorio sin calibración.'
     }
    };

    const previous={
     terrain:core.app.terrain,
     buildings:core.app.buildings
    };

    try{
     core.app.terrain=terrain;
     core.app.buildings=[];

     core.enterTerrain();

     const source=document.getElementById('terrainSource');

     if(source)
      source.textContent=terrain.provenance.label;

    }catch(error){
     core.app.terrain=previous.terrain;
     core.app.buildings=previous.buildings;

     try{
      core.enterTerrain();
     }catch(recoveryError){
      console.error('Error restaurando visor:',recoveryError);
     }

     throw error;
    }

    message.textContent=
     'Terreno real cargado: 128 × 128 celdas.\n'+
     'Elevaciones: '+
     Math.min(...heights).toFixed(1)+' a '+
     Math.max(...heights).toFixed(1)+' m.\n'+
     'Contexto cartográfico y visual, no predicción geotécnica ni análisis operativo.';

   }catch(error){
    console.error('SIRM GeoTIFF:',error);
    message.textContent='No se cargó: '+error.message;

   }finally{
    button.disabled=false;
    input.value='';
   }
  };
 }
}
