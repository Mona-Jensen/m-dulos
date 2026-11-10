import { initCatalog } from './catalog.mjs';
import { Scene3D } from './renderer/webgl.mjs';
import { CanvasFallback } from './renderer/fallback.mjs';
import { generateSyntheticBasin, makeDemoBuildings, parseTerrainJSON } from './engine/terrain.mjs';
import { SCENARIOS } from './engine/scenarios.mjs';
import { runScenario } from './engine/solver.mjs';
import { assessBuildings, countExposed } from './engine/risk.mjs';
import { frameAt, formatTime } from './engine/replay.mjs';

const $ = (id) => document.getElementById(id);
const app = {
  scene: null, mode: 'earth', scenarioId: 'flood',
  terrain: generateSyntheticBasin(), buildings: [], timeline: null,
  playbackSeconds: 0, playing: false, speed: 1, lastStamp: 0,
  recording: false, recorder: null, recordChunks: [], recordStart: 0,
};
app.buildings = makeDemoBuildings(app.terrain);
const toast = (message) => {const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),4200);};
const formatNumber = (v,d=1) => Number(v).toLocaleString('es-CL',{maximumFractionDigits:d,minimumFractionDigits:d});
function downloadText(filename,text,type='application/json'){
  const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000);
}
function selectScenario(id){
  if(!SCENARIOS[id]||app.recording)return;
  app.scenarioId=id;
  document.querySelectorAll('.scenario-btn').forEach(el=>el.classList.toggle('active',el.dataset.scenario===id));
  const s=SCENARIOS[id]; $('rainfall').value=s.rainfallMMH;$('release').value=s.sourceRate;$('duration').value=s.duration;
  updateParameterText();
  if(app.mode==='terrain')toast(`${s.title}: ajusta los parámetros y ejecuta la simulación.`);
}
function updateParameterText(){
  $('rainfallValue').textContent=`${$('rainfall').value} mm/h`;
  $('releaseValue').textContent=`${$('release').value} m³/s`;
  $('durationValue').textContent=`${$('duration').value} s`;
}
function currentScenario(){
  return {...SCENARIOS[app.scenarioId],rainfallMMH:Number($('rainfall').value),sourceRate:Number($('release').value),duration:Number($('duration').value)};
}
function enterTerrain(){
  $('catalogView')?.classList.add('hidden');
  app.mode='terrain';app.playing=false;
  if(app.scene){app.scene.setTerrain(app.terrain,app.buildings);}
  $('intro').classList.add('hidden');$('earthFooter').classList.add('hidden');
  $('terrainInfo').classList.remove('hidden');$('legend').classList.remove('hidden');
  $('hud').classList.remove('hidden');$('timeline').classList.remove('hidden');
  $('modeLabel').textContent=app.terrain.realTerrain?'TERRENO REAL · VISUALIZACIÓN EXPLORATORIA':'CUENCA PILOTO · VISUALIZACIÓN 3D';$('sceneCounter').textContent='02 / 03';
  $('terrainTitle').textContent=app.terrain.provenance?.label||'Terreno importado';
  const terrainWarning = app.terrain.realTerrain
    ? 'Terreno real cargado como contexto geográfico y visual. No está calibrado ni validado como predicción geotécnica ni como análisis operacional.'
    : 'Cuenca sintética demostrativa. Se usa para prueba visual y razonamiento conceptual, no para decisiones de seguridad.';
  $('terrainInfoText').textContent = app.terrain.provenance?.warning || terrainWarning;
  app.timeline=null;app.playbackSeconds=0;$('seek').value='0';$('playTime').textContent='00:00';
  $('houses').innerHTML=`0 <span>/ ${app.buildings.length}</span>`;
  $('wetArea').innerHTML='0,0 <span>ha</span>';$('maxDepth').innerHTML='0,00 <span>m</span>';
  $('togglePlay').textContent='▶ Reproducir';
  $('scenarioTitle').textContent='Selecciona un escenario y pulsa Ejecutar';
  $('recordStatus').textContent=app.terrain.realTerrain?'Escenario exploratorio NO calibrado. No constituye una predicción. Video WebM de 03:00.':'Modelo demostrativo: viviendas y daños ilustrativos. Exportación WebM disponible (03:00 en tiempo real).';
}
function returnEarth(){
  if(app.recording)return;
  app.mode='earth';app.playing=false;app.timeline=null;app.scene.mode='earth';app.scene.rotation=-1.92;
  $('intro').classList.remove('hidden');$('earthFooter').classList.remove('hidden');
  for(const id of ['terrainInfo','legend','hud','timeline'])$(id).classList.add('hidden');
  $('modeLabel').textContent='VISTA GLOBAL · PLANETA TIERRA';$('sceneCounter').textContent='01 / 03';
}
function renderFrame(){
  if(!app.timeline||app.mode!=='terrain')return;
  const state=frameAt(app.playbackSeconds,app.timeline),frame=state.a;
  app.scene.setFrame(frame,app.timeline.config);
  const assessed=assessBuildings(app.buildings,app.terrain,frame);
  $('wetArea').innerHTML=`${formatNumber(frame.stats.wetArea/10000)} <span>ha</span>`;
  $('maxDepth').innerHTML=`${formatNumber(frame.stats.maxDepth,2)} <span>m</span>`;
  $('houses').innerHTML=`${countExposed(assessed)} <span>/ ${app.buildings.length}</span>`;
  $('seek').value=String(app.playbackSeconds);$('playTime').textContent=formatTime(app.playbackSeconds);
  $('togglePlay').textContent=app.playing?'Ⅱ Pausar':'▶ Reproducir';
}
function executeSimulation(){
  if(app.recording)return;
  if(app.mode!=='terrain')enterTerrain();
  const scenario=currentScenario();
  if(scenario.sourceRate===0 && scenario.rainfallMMH===0){toast('Se necesita precipitación o un aporte de material.');return;}
  $('runButton').disabled=true;$('runButton').textContent='Calculando escenario…';
  setTimeout(()=>{
    try{
      const result=runScenario(app.terrain,scenario);
      result.config=scenario;app.timeline=result;app.playbackSeconds=0;app.playing=true;
      $('scenarioTitle').textContent=scenario.title;
      const terrainNote = app.terrain.realTerrain
        ? 'Terreno real: contexto cartográfico y visual. La simulación sigue siendo demostrativa y no sustituye una validación geotécnica ni de campo.'
        : 'Cuenca sintética: modelo ilustrativo para análisis conceptual.';
      $('recordStatus').textContent = terrainNote + ' ' + (app.terrain.realTerrain ? 'Video WebM de 03:00.' : 'Exportación WebM disponible (03:00 en tiempo real).');
      $('sceneCounter').textContent='03 / 03';renderFrame();toast(`Escenario listo: ${result.frames.length} estados / ${formatTime(result.simulatedSeconds)} simulados.`);
    }catch(err){console.error(err);toast(`No se pudo simular: ${err.message}`);}
    finally{$('runButton').disabled=false;$('runButton').innerHTML='<span>▶</span> Ejecutar simulación';}
  },30);
}
function exportResults(){
  if(!app.timeline){toast('Ejecuta primero una simulación.');return;}
  const frame=app.timeline.frames.at(-1),risks=assessBuildings(app.buildings,app.terrain,frame);
  const obj={version:1,createdAt:new Date().toISOString(),classification:'PROTOTIPO DEMOSTRATIVO, NO APTO PARA GESTION DE EMERGENCIAS',
    terrain:app.terrain.provenance,grid:{rows:app.terrain.rows,cols:app.terrain.cols,cellMeters:app.terrain.dx,boundsWGS84:app.terrain.boundsWGS84??null},
    scenario:app.timeline.config,modeledTimeSeconds:app.timeline.simulatedSeconds,
    final:{...frame.stats,depthMeters:Array.from(frame.depth),velocityProxyMetersPerSecond:Array.from(frame.speed)},
    buildings:risks,disclaimer:'Umbrales de afectación ilustrativos: no constituyen cálculo de daño estructural ni predicción.'};
  downloadText(`sirm-${app.scenarioId}-resultados.json`,JSON.stringify(obj));
  toast('Resultados descargados con parámetros y advertencias de alcance.');
}
function startRecording(){
  if(app.recording){toast('Ya hay una grabación en curso.');return;}
  if(!app.timeline){toast('Ejecuta una simulación antes de grabar.');return;}
  const canvas=$('scene');
  if(!canvas.captureStream||!window.MediaRecorder){toast('Este navegador no permite grabar el lienzo. Utiliza Chrome o Edge.');return;}
  const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(MediaRecorder.isTypeSupported);
  if(!type){toast('No hay un formato WebM compatible con este navegador.');return;}
  try {
    app.recordChunks=[];app.recording=true;app.playbackSeconds=0;app.speed=1;app.playing=true;
    const stream=canvas.captureStream(24);
    const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4200000});app.recorder=rec;
    rec.addEventListener('dataavailable',e=>{if(e.data.size)app.recordChunks.push(e.data);});
    rec.addEventListener('stop',()=>{
      const blob=new Blob(app.recordChunks,{type});const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download=`sirm-${app.scenarioId}-video-180s.webm`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
      stream.getTracks().forEach(x=>x.stop());app.recording=false;app.recorder=null;
      $('recordButton').classList.remove('recording');$('recordButton').textContent='● Grabar video 03:00';
      $('recordStatus').textContent='Grabación finalizada. Revisa la duración real en tu reproductor.';
    });
    rec.addEventListener('error',e=>{console.error(e);toast('La grabación se interrumpió.');});
    app.recordStart=performance.now();rec.start(1000);
    $('recordButton').classList.add('recording');$('recordButton').textContent='● Grabando…';
    toast('Grabando 180 segundos de video WebM. Mantén esta pestaña abierta y visible.');
  }catch(err){app.recording=false;console.error(err);toast(`No se pudo grabar: ${err.message}`);}
}
function startCinematicRealVideo(){
  if(app.recording){toast('Ya hay una grabación en curso.');return;}
  if(!app.terrain?.realTerrain){toast('Necesitas un terreno real validado para esta visualización.');return;}
  const canvas=$('scene');
  if(!canvas.captureStream||!window.MediaRecorder){toast('Este navegador no admite grabación del lienzo. Usa Chrome o Edge.');return;}
  const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(MediaRecorder.isTypeSupported);
  if(!type){toast('No hay un formato WebM compatible con este navegador.');return;}

  const display=document.createElement('canvas');
  display.width=1280;display.height=720;
  const ctx=display.getContext('2d');
  const stream=display.captureStream(24);
  const chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4200000});

  const state=app;
  const old={
    mode: state.mode,
    yaw: state.scene?.yaw ?? 0,
    pitch: state.scene?.pitch ?? 0.72,
    distance: state.scene?.distance ?? 13.2,
    playing: state.playing,
    playbackSeconds: state.playbackSeconds,
  };

  app.recording=true;
  app.playing=false;
  app.timeline=null;
  $('recordStatus').textContent='VISUALIZACIÓN REALISTA · 30s · terreno real validado · no es predicción';
  $('recordCinematic').disabled=true;

  try {
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{
      const blob=new Blob(chunks,{type});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download='SIRM-visualizacion-realista-30s.webm';
      link.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      stream.getTracks().forEach(t=>t.stop());
      app.recording=false;
      app.playing=old.playing;
      app.playbackSeconds=old.playbackSeconds;
      if(app.scene){
        app.scene.mode=old.mode;
        app.scene.yaw=old.yaw;
        app.scene.pitch=old.pitch;
        app.scene.distance=old.distance;
      }
      $('recordCinematic').disabled=false;
      $('recordStatus').textContent='Videos de contexto realista exportados. No sustituyen predicción ni análisis geotécnico.';
    };

    recorder.start(1000);
    const start=performance.now();
    const originalMode=state.mode;
    state.mode='terrain';
    if(state.scene){
      state.scene.mode='terrain';
      state.scene.distance=13.2;
      state.scene.yaw=-0.65;
      state.scene.pitch=0.72;
    }

    const tick=(now)=>{
      const p=Math.min(1,(now-start)/30000);
      const phase=p*Math.PI*2;
      if(state.scene){
        state.scene.yaw=-0.65 + phase*0.8;
        state.scene.pitch=0.55 + Math.sin(phase*2.4)*0.12;
        state.scene.distance=13.2 - Math.sin(phase*1.4)*1.4;
      }
      const camera=state.scene; if(camera) camera.render(0.033);
      ctx.clearRect(0,0,display.width,display.height);
      ctx.fillStyle='#071a25';
      ctx.fillRect(0,0,display.width,display.height);
      ctx.drawImage(canvas,0,0,display.width,display.height);
      ctx.fillStyle='rgba(4, 15, 22, 0.62)';
      ctx.fillRect(0, display.height-56, display.width, 56);
      ctx.fillStyle='#d9f3ff';
      ctx.font='600 19px Segoe UI';
      ctx.fillText('VISUALIZACIÓN REALISTA · CONTEXTO CARTOGRÁFICO', 30, display.height-22);
      if(p<1){requestAnimationFrame(tick);} else {recorder.stop();}
    };

    requestAnimationFrame(tick);
    toast('Grabando vista realista de 30s. La exportación es visual y documental, no predicción operativa.');
  }catch(err){
    console.error(err);
    app.recording=false;
    $('recordCinematic').disabled=false;
    toast(`No se pudo grabar: ${err.message}`);
  }
}

async function loadGeoTIFFLibrary(){
  if (window.GeoTIFF) return window.GeoTIFF;
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-sirm-geotiff]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.GeoTIFF), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar GeoTIFF.js.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js';
    script.dataset.sirmGeotiff = 'true';
    script.onload = () => resolve(window.GeoTIFF);
    script.onerror = () => reject(new Error('No se pudo cargar GeoTIFF.js.'));
    document.head.appendChild(script);
  });
}

function validateGeoTIFFCoordinateSystem(image){
  const geoKeys = image?.getGeoKeys?.() ?? {};
  const projectedType = Number(geoKeys.ProjectedCSTypeGeoKey ?? NaN);
  const geographicType = Number(geoKeys.GeographicTypeGeoKey ?? NaN);
  const modelType = Number(geoKeys.GTModelTypeGeoKey ?? NaN);

  if (Number.isFinite(geographicType) && geographicType === 4326) {
    throw new Error('Este GeoTIFF usa EPSG:4326 (coordenadas geográficas). Reprojéctalo a un CRS métrico como UTM antes de importarlo.');
  }

  if (Number.isFinite(modelType) && modelType === 2 && !Number.isFinite(projectedType) && Number.isFinite(geographicType)) {
    throw new Error('El GeoTIFF no está en un CRS proyectado. Debe usarse un sistema métrico para la cuenca.');
  }

  return true;
}

function normalizeGeoTIFFTerrain(image, fileName) {
  validateGeoTIFFCoordinateSystem(image);
  const width = image.getWidth();
  const height = image.getHeight();
  const bbox = image.getBoundingBox();
  if (!Array.isArray(bbox) || bbox.length !== 4) {
    throw new Error('GeoTIFF sin cuadro georreferenciado válido.');
  }
  const west = Number(bbox[0]); const south = Number(bbox[1]); const east = Number(bbox[2]); const north = Number(bbox[3]);
  if (![west, south, east, north].every(Number.isFinite)) {
    throw new Error('Límites del GeoTIFF no finitos.');
  }
  if (east <= west || north <= south) {
    throw new Error('El GeoTIFF no expone un rectángulo georreferenciado válido.');
  }
  const origin = image.getOrigin?.();
  const resolution = image.getResolution?.();
  if (!Array.isArray(origin) || origin.length !== 2 || !Array.isArray(resolution) || resolution.length !== 2) {
    throw new Error('El GeoTIFF no expone origen y resolución válidos.');
  }
  const nodataValue = image.getGDALNoData?.();
  const targetSize = 128;
  const readWindow = [0, 0, width, height];
  const raster = image.readRasters({
    window: readWindow,
    width: targetSize,
    height: targetSize,
    samples: [0],
    resampleMethod: 'bilinear',
  });
  const values = Array.from(raster[0] || []);
  if (!values.length || values.length !== targetSize * targetSize) {
    throw new Error('No se pudo rasterizar el GeoTIFF a una malla compatible.');
  }
  const filtered = values.filter((v) => {
    if (!Number.isFinite(v)) return false;
    if (Number.isFinite(nodataValue) && Math.abs(v - nodataValue) <= 1e-6) return false;
    return true;
  });
  if (!filtered.length) {
    throw new Error('El GeoTIFF no aporta elevaciones válidas.');
  }
  if (filtered.length < values.length * 0.6) {
    throw new Error('El GeoTIFF tiene demasiados valores NoData o nulos para usarse como DEM real.');
  }
  const minValue = Math.min(...filtered);
  const maxValue = Math.max(...filtered);
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue - minValue <= 0) {
    throw new Error('El GeoTIFF no tiene variación útil de relieve.');
  }
  const dx = Math.max((east - west) / (targetSize - 1), (north - south) / (targetSize - 1), Number.EPSILON);
  const terrain = {
    rows: targetSize,
    cols: targetSize,
    dx,
    heights: new Float32Array(values.map((v) => {
      if (!Number.isFinite(v) || (Number.isFinite(nodataValue) && Math.abs(v - nodataValue) <= 1e-6)) {
        return minValue;
      }
      return v;
    })),
    realTerrain: true,
    boundsWGS84: [west, south, east, north],
    provenance: {
      type: 'external',
      source: 'GeoTIFF del usuario',
      label: `DEM importado · ${fileName}`,
      filename: fileName,
      warning: 'Terreno georreferenciado. Escenario exploratorio no calibrado.',
    },
  };
  return terrain;
}

async function importTerrain(file){
  if(app.recording)return;
  try {
    if(file.size>12*1024*1024)throw new Error('Archivo demasiado grande (máximo 12 MB).');
    const lower = file.name.toLowerCase();
    if(lower.endsWith('.tif') || lower.endsWith('.tiff')){
      const GeoTIFF = await loadGeoTIFFLibrary();
      const tiff = await GeoTIFF.fromBlob(file);
      const image = await tiff.getImage();
      const terrain = normalizeGeoTIFFTerrain(image, file.name);
      app.terrain = terrain;
      app.buildings = [];
      $('terrainSource').textContent = terrain.provenance?.label || file.name;
      enterTerrain();
      toast('Terreno real importado. Modelo exploratorio no calibrado.');
      return;
    }
    if(!lower.endsWith('.json'))throw new Error('Formato no compatible. Usa JSON o GeoTIFF.');
    const terrain = parseTerrainJSON(await file.text());
    app.terrain = terrain; app.buildings = terrain.realTerrain ? [] : makeDemoBuildings(terrain);
    $('terrainSource').textContent = terrain.provenance?.label || file.name;
    enterTerrain(); toast(terrain.realTerrain ? 'Terreno real importado sin viviendas ficticias. Escenario exploratorio no calibrado.' : 'Terreno sintético importado. Escenario demostrativo.');
  }catch(err){toast(`No se pudo importar: ${err.message}`);}finally{$('terrainFile').value='';}
}
const catalog=initCatalog({
  onOpen:()=>{app.playing=false;app.mode='catalog';},
  onClose:()=>{returnEarth();}
});
function attachEvents(){
  for (const id of ['openCatalog','introCatalog','headerCatalog']) $(id).addEventListener('click',()=>void catalog.open());
  $('enterButton').addEventListener('click',enterTerrain);
  document.querySelectorAll('.scenario-btn').forEach(b=>b.addEventListener('click',()=>selectScenario(b.dataset.scenario)));
  for(const id of ['rainfall','release','duration'])$(id).addEventListener('input',updateParameterText);
  $('runButton').addEventListener('click',executeSimulation);
  $('terrainFile').addEventListener('change',e=>{if(e.target.files?.[0])void importTerrain(e.target.files[0]);});
  $('togglePlay').addEventListener('click',()=>{
    if(!app.timeline){toast('Primero ejecuta un escenario.');return;}
    if(app.playbackSeconds>=180)app.playbackSeconds=0;
    app.playing=!app.playing;renderFrame();
  });
  $('restart').addEventListener('click',()=>{if(!app.timeline)return;app.playbackSeconds=0;app.playing=false;renderFrame();});
  $('seek').addEventListener('input',e=>{if(!app.timeline||app.recording)return;app.playbackSeconds=Number(e.target.value);app.playing=false;renderFrame();});
  $('exportData').addEventListener('click',exportResults);
  $('recordButton').addEventListener('click',startRecording);
  $('recordCinematic').addEventListener('click', startCinematicRealVideo);
  $('returnEarth').addEventListener('click',returnEarth);
  $('btnAbout').addEventListener('click',()=>$('aboutDialog').showModal());
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&app.timeline&&e.target.tagName!=='INPUT'){e.preventDefault();app.playing=!app.playing;}});
}
function frameLoop(timestamp){
  const dt=app.lastStamp?Math.max(0,Math.min(.1,(timestamp-app.lastStamp)/1000)):0;
  app.lastStamp=timestamp;
  if(app.mode==='earth')app.scene.rotation-=dt*.095;
  if(app.mode==='terrain'&&app.timeline&&app.playing){
    if(app.recording){app.playbackSeconds=Math.min(180,(timestamp-app.recordStart)/1000);$('recordStatus').textContent=`GRABANDO · ${formatTime(app.playbackSeconds)} / 03:00 · formato WebM`;
      if(app.playbackSeconds>=180&&app.recorder?.state==='recording'){app.playing=false;app.recorder.stop();}
    } else {app.playbackSeconds=Math.min(180,app.playbackSeconds+dt*app.speed);if(app.playbackSeconds>=180)app.playing=false;}
    renderFrame();
  }
  app.scene.render(dt);
  requestAnimationFrame(frameLoop);
}
try {
  try {
    app.scene=new Scene3D($('scene'));
  } catch(webglError) {
    console.warn('WebGL2 no disponible; se activó Canvas de compatibilidad:',webglError.message);
    app.scene=new CanvasFallback($('scene'));
    toast('WebGL2 no disponible. Vista 2.5D activada; habilita aceleración gráfica para 3D real.');
  }
  attachEvents();selectScenario('flood');
  requestAnimationFrame(frameLoop);
} catch(err) {
  console.error(err);
  $('intro').innerHTML='<h1>No se pudo iniciar la visualización</h1><p>'+String(err.message).replaceAll('<','&lt;')+'</p>';
  toast('Error del renderizador. Revisa la consola del navegador.');
}

// Conexión controlada con el panel nacional de la misma pantalla.
window.SIRM_CORE={app,renderFrame,executeSimulation,enterTerrain};
