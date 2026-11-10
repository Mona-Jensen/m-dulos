import {handleSirmNacional} from './sirm-fuentes-nacionales.mjs';
/** SIRM v2 - servidor local sin dependencias npm. Node >=20. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readStatus,loadSnapshot} from './catalog-store.mjs';
import {syncRelaves} from './sync-relaves.mjs';
import {handleTerrainTile} from './terrain-proxy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const port=Number(process.env.PORT||5187);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/geo+json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
export function resolvePublicPath(rawPath){
 const route=decodeURIComponent(rawPath.split('?')[0]);
 if(route.includes('\\')||route.includes('\0'))throw new Error('Ruta inválida');
 const filename=path.resolve(root, `.${route==='/'?'/index.html':route}`);
 if(filename!==root&&!filename.startsWith(root+path.sep))throw new Error('Acceso prohibido');
 return filename;
}
let syncing=false;
function json(res,status,obj){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));}
const offlineFile=path.join(root,'data/relaves_puntos_oct2025.geojson');
async function handleApi(req,res,u){
 if(u.pathname==='/api/catalog/status'&&req.method==='GET'){
   const status=await readStatus();
   json(res,200,{...status,offlinePoints:836,syncing,notice:'Datos geográficos oficiales; no se infiere estabilidad ni riesgo de falla.'});return true;
 }
 if(u.pathname==='/api/catalog/geojson'&&req.method==='GET'){
   const state=await readStatus();
   if(state.kind==='error'){json(res,409,{error:state.reason});return true;}
   if(state.ready){const snapshot=await loadSnapshot();json(res,200,{...snapshot.collection,sirm:{source:'SERNAGEOMIN ArcGIS',kind:'poligonos',verifiedAt:snapshot.metadata.verifiedAt,geometryDisclaimer:'Contorno 2D, no geometría de muro'}});}
   else {const points=JSON.parse(await fs.readFile(offlineFile,'utf8'));json(res,200,{...points,sirm:{source:'CATASTRO_RELAVES_CHILE_OCT2025_1.xlsx (aportado por usuaria)',kind:'puntos',verifiedAt:null,geometryDisclaimer:'Solo ubicaciones puntuales. NO son perímetros de depósitos.'}});}
   return true;
 }
 if(u.pathname==='/api/catalog/sync'){
   if(req.method!=='POST'){json(res,405,{error:'Usa POST para iniciar sincronización'});return true;}
   if(syncing){json(res,409,{error:'Sincronización ya en ejecución'});return true;}
   syncing=true;
   try{
     const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),180000);
     try{
       const data=await syncRelaves({fetcher:(url,options)=>fetch(url,{...options,signal:controller.signal})});
       json(res,200,{ok:true,metadata:data});
     }finally{clearTimeout(timeout);}
   }catch(e){json(res,502,{ok:false,error:`Sincronización rechazada; la caché previa no se modificó. ${e.message}`});}
   finally{syncing=false;}
   return true;
 }
 if(await handleTerrainTile(req,res,u))return true;
 if(await handleSirmNacional(req,res,u))return true;
 if(u.pathname.startsWith('/api/')){json(res,404,{error:'API desconocida'});return true;}
 return false;
}
export function createServer(){return http.createServer(async(req,res)=>{
 try{
   const u=new URL(req.url,'http://localhost');
   if(await handleApi(req,res,u))return;
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Método no permitido');return;}
   const filepath=resolvePublicPath(u.pathname),data=await fs.readFile(filepath);
   res.writeHead(200,{'content-type':mime[path.extname(filepath)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});
   res.end(req.method==='HEAD'?undefined:data);
 }catch(e){const status=e.code==='ENOENT'?404:e.message==='Acceso prohibido'?403:400;res.writeHead(status,{'content-type':'text/plain; charset=utf-8'});res.end('Recurso no disponible');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createServer();server.listen(port,'127.0.0.1',()=>console.log(`SIRM v2 listo: http://localhost:${port}`));
}
