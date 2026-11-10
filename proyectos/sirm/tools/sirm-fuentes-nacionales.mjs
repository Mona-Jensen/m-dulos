import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSnapshot} from './catalog-store.mjs';
const src={
 dga:'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ALERTAS/MapServer/0/query',
 sentinel:'https://stac.dataspace.copernicus.eu/v1/search',
 dem:'https://copernicus-dem-30m.s3.amazonaws.com/',
 meteochile:'https://climatologia.meteochile.gob.cl/application/servicios/getDatosRecientesRedEma'
};
const send=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));};
const valid=(u)=>{
 const lat=Number(u.searchParams.get('lat')),lon=Number(u.searchParams.get('lon'));
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -56||lat > -17||lon < -110||lon > -66)throw Error('Coordenadas fuera del territorio chileno permitido');
 const km=Number(u.searchParams.get('km')||50);
 if(!Number.isFinite(km)||km<1||km>250)throw Error('Radio inválido (1–250 km)');
 return {lat,lon,km};
};
const retrieve=async(url,opts={})=>{
 const r=await fetch(url,{signal:AbortSignal.timeout(16000),...opts});
 if(!r.ok)throw Error('Fuente respondió HTTP '+r.status);
 const body=await r.text();
 if(body.length>6000000)throw Error('Respuesta externa demasiado grande');
 const obj=JSON.parse(body);
 if(obj.error)throw Error(obj.error.message||'Error reportado por la fuente');
 return obj;
};
const getField=(a,field)=>{const k=Object.keys(a).find(k=>k.toLowerCase().split('.').at(-1)===field.toLowerCase());return k?a[k]:null;};
const fileRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../data');
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
async function getDocs(words){
 const dir=path.join(fileRoot,'conocimiento');const matches=[];
 let list=[];try{list=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return matches;throw e;}
 for(const item of list.slice(0,80)){
  if(!item.isFile()||!/\.(txt|md|csv|json)$/i.test(item.name))continue;
  const file=path.join(dir,item.name),st=await fs.stat(file);
  if(st.size>1000000)continue;
  const raw=await fs.readFile(file,'utf8'),lower=normalize(raw);
  const score=words.filter(w=>lower.includes(w)).length;
  if(score)matches.push({document:item.name,excerpt:raw.slice(0,1200),score});
 }
 return matches.sort((a,b)=>b.score-a.score).slice(0,5);
}
async function inventory(){
 const snap=await loadSnapshot();
 if(snap?.collection?.features)return {records:snap.collection.features,source:'SERNAGEOMIN, polígonos sincronizados'};
 const raw=JSON.parse(await fs.readFile(path.join(fileRoot,'../public/data/relaves_puntos_oct2025.geojson'),'utf8'));
 return {records:raw.features,source:'Catastro octubre 2025: ubicaciones puntuales, no polígonos'};
}
async function readBody(req){let data='';for await(const part of req){data+=part.toString();if(data.length>3000)throw Error('Consulta demasiado extensa');}return JSON.parse(data||'{}');}
async function askAI(question,records,docs,source){
 if(!process.env.OPENAI_API_KEY)return null;
 const result=await retrieve('https://api.openai.com/v1/responses',{
  method:'POST',headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',store:false,
   instructions:'Eres SIRM IA. Responde solo con los registros y documentos recibidos; cita ID y fuente. Distingue observaciones de simulaciones, advierte datos faltantes, no inventes peligro ni riesgo, no des instrucciones de emergencia.',
   input:JSON.stringify({pregunta:question,fuente:source,registros:records,documentos:docs})})
 });
 return (result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||null;
}
const sourceState=(kind)=>{
 const catalog={
   dem:{status:'catalogado', uso:'contexto geográfico/documental', aviso:'URL pública disponible; no se carga automáticamente como malla 3D ni se usa como predicción.'},
   sentinel:{status:'catalogado', uso:'contexto cartográfico/documental', aviso:'STAC disponible; no se descarga ni renderiza como textura satelital automática.'},
   dga:{status:'consultado', uso:'contexto hidrometeorológico', aviso:'Estaciones oficiales solo como contexto; no alimentan el modelo físico del prototipo.'},
   meteochile:{status:'requerido', uso:'contexto meteorológico', aviso:'Requiere credenciales del entorno; no se usan como entrada de simulación sin validación.'}
 };
 return catalog[kind] || {status:'no aplicable', uso:'sin uso de cálculo', aviso:'No se interpreta como dato de riesgo ni como simulación.'};
};

const buildSourceSummary=(base={})=>({
 ...base,
  prototipo:true,
  noOperacional:true,
  modelo:'flujo superficial ilustrativo',
  usoRecomendado:'contexto documental y cartográfico; no sustituye el análisis geotécnico ni la validación de campo.',
  fuentes: {
    dem: sourceState('dem'),
    sentinel: sourceState('sentinel'),
    dga: sourceState('dga'),
    meteochile: sourceState('meteochile')
  }
});

 export async function handleSirmNacional(req,res,u){
  if(!u.pathname.startsWith('/api/sirm-nacional/'))return false;
  try{
   if(u.pathname==='/api/sirm-nacional/estado'){
    const snap=await loadSnapshot();
    send(res,200,buildSourceSummary({
     fecha:new Date().toISOString(),
     inventario:snap?.collection?.features?.length||836,
     copernicus:'Conector catálogo STAC y archivo público Copernicus DEM',
     dga:'Conector de observaciones publicado',
     meteochile:Boolean(process.env.SIRM_METEO_USER&&process.env.SIRM_METEO_TOKEN)?'Credenciales configuradas':'Falta usuario/token personal',
     ia:Boolean(process.env.OPENAI_API_KEY)?'API configurada':'Búsqueda documental; IA generativa sin configurar'}));
    return true;
   }
   if(u.pathname==='/api/sirm-nacional/preguntar'){
    if(req.method!=='POST'){send(res,405,{error:'Usa POST'});return true;}
    const body=await readBody(req),question=String(body.question||'').trim();
    if(question.length<3||question.length>600)throw Error('Pregunta de 3–600 caracteres');
    const {records,source}=await inventory();
    const words=[...new Set(normalize(question).match(/[a-z0-9-]{3,}/g)||[])].filter(w=>!new Set(['que','los','las','del','una','sobre','para','cuales','datos','informacion','relaves','de','por','con','como','tiene','todos','esta','existe','quiero','buscar','chile']).has(w));
    const scored=records.map(f=>{const attrs=f.properties||{},hay=normalize(Object.values(attrs).join(' '));return {attrs,score:words.reduce((n,w)=>n+(hay.includes(w)?1:0),0)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const results=scored.slice(0,8).map(x=>({id:x.attrs.ID||x.attrs.OBJECTID||'',campos:x.attrs}));
    const docs=await getDocs(words);
    let answer=null,aiError=null;
    if(process.env.OPENAI_API_KEY){try{answer=await askAI(question,results,docs,source);}catch(e){aiError=e.message;}}
    send(res,200,{fuente:source,total:records.length,coincidencias:scored.length,registros:results,documentos:docs,respuestaIA:answer,iaError:aiError,
     aviso:'Solo documentos TXT/MD/CSV/JSON incorporados. PDF/XLS y fuentes externas requieren indexación; no se inventaron datos.'});return true;
   }
   if(!['/api/sirm-nacional/dga','/api/sirm-nacional/sentinel','/api/sirm-nacional/dem','/api/sirm-nacional/meteochile'].includes(u.pathname)){
    send(res,404,{error:'Conector no encontrado'});return true;
   }
   const {lat,lon,km}=valid(u);
   if(u.pathname.endsWith('/dem')){
    const lat0=Math.floor(lat),lon0=Math.floor(lon);
    const name='Copernicus_DSM_COG_10_'+(lat0<0?'S':'N')+String(Math.abs(lat0)).padStart(2,'0')+'_00_'+(lon0<0?'W':'E')+String(Math.abs(lon0)).padStart(3,'0')+'_00_DEM';
    const address=src.dem+name+'/'+name+'.tif';
    const head=await fetch(address,{method:'HEAD',signal:AbortSignal.timeout(15000)});
    if(head.status===404){send(res,200,buildSourceSummary({fuente:'Copernicus GLO-30 Public',disponible:false,observacion:'No se publicó este mosaico en el depósito público; no se sustituyó por otro DEM.'}));return true;}
    if(!head.ok)throw Error('Copernicus DEM respondió HTTP '+head.status);
    send(res,200,buildSourceSummary({fuente:'Copernicus GLO-30 Public',disponible:true,formato:'Cloud Optimized GeoTIFF (COG)',descarga:address,
     observacion:'Mosaico de 1×1 grado. Detectado y accesible; todavía NO convertido ni cargado automáticamente como relieve 3D.'}));return true;
   }
   if(u.pathname.endsWith('/sentinel')){
    const h=km/111.1,w=h/Math.cos(lat*Math.PI/180);
    const since=new Date(Date.now()-180*86400000).toISOString().slice(0,10);
    const catalog=await retrieve(src.sentinel,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({collections:['sentinel-2-l2a'],bbox:[lon-w,lat-h,lon+w,lat+h],datetime:since+'/'+new Date().toISOString().slice(0,10),limit:12})});
    send(res,200,buildSourceSummary({fuente:'Copernicus Data Space / Sentinel-2 L2A',catalogo:src.sentinel,fechaConsulta:new Date().toISOString(),
     productos:(catalog.features||[]).map(f=>({id:f.id,fecha:f.properties?.datetime||null,nubesPorcentaje:f.properties?.['eo:cloud_cover']??null})),
     aviso:'Resultados de catálogo, no imágenes RGB descargadas ni textura satelital.'}));return true;
   }
   if(u.pathname.endsWith('/dga')){
    const h=km/111.1,w=h/Math.cos(lat*Math.PI/180);
    const params=new URLSearchParams({where:'1=1',geometry:JSON.stringify({xmin:lon-w,xmax:lon+w,ymin:lat-h,ymax:lat+h,spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:'4326',outSR:'4326',outFields:'*',returnGeometry:'true',resultRecordCount:'500',f:'json'});
    const data=await retrieve(src.dga+'?'+params);
    const station=(data.features||[]).flatMap(f=>{const a=f.attributes||{},p=f.geometry||{},x=Number(p.x),y=Number(p.y);if(!Number.isFinite(x)||!Number.isFinite(y))return [];
     const dist=111.1*Math.hypot(y-lat,(x-lon)*Math.cos(lat*Math.PI/180));if(dist>km)return [];
     const ms=Number(getField(a,'mod_fechra')),fecha=ms>100000000000&&ms<8640000000000000?new Date(ms).toISOString():null;
     const val=getField(a,'mod_valor');return [{estacion:String(getField(a,'NOMBRERED')||'Sin nombre'),codigo:getField(a,'CODBNA'),lat:y,lon:x,km:Math.round(dist*10)/10,
      valor:val==null?null:Number(val),unidad:null,fecha,alerta:getField(a,'mod_indale'),antiguedadHoras:fecha?Math.round((Date.now()-ms)/3600000):null}];
    }).sort((a,b)=>a.km-b.km).slice(0,30);
    send(res,200,buildSourceSummary({fuente:'DGA/MOP - alertas hidrometeorológicas',fechaConsulta:new Date().toISOString(),estaciones:station,
     aviso:'Valor sin unidad explícita en la capa; no debe interpretarse automáticamente como lluvia ni caudal. Datos provisionales.'}));return true;
   }
   if(u.pathname.endsWith('/meteochile')){
    if(!process.env.SIRM_METEO_USER||!process.env.SIRM_METEO_TOKEN){send(res,200,buildSourceSummary({fuente:'Dirección Meteorológica de Chile',configurado:false,
     aviso:'La API requiere SIRM_METEO_USER y SIRM_METEO_TOKEN en el entorno del servidor. No se consultaron estaciones ni se crearon mediciones.'}));return true;}
    const params=new URLSearchParams({usuario:process.env.SIRM_METEO_USER,token:process.env.SIRM_METEO_TOKEN});
    const data=await retrieve(src.meteochile+'?'+params);
    const summary={fuente:'DMC, estaciones automáticas (12 h)',configurado:true,fechaConsulta:new Date().toISOString(),fechaCreacion:data.fechaCreacion||null,
     estacionesConDatos:data.estacionesConDatos??null,timezone:data.timezone??null,status:data.status??null,
     aviso:'Respuesta recibida de MeteoChile. Consultar parámetros y unidades según estructura oficial; no es una simulación.'};
    send(res,200,buildSourceSummary(summary));return true;
   }
  }catch(e){send(res,502,{error:e.message,fecha:new Date().toISOString(),noInventado:true});}
  return true;
}
