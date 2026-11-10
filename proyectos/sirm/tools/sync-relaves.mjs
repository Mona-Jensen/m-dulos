import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {downloadOfficialPolygons} from './arcgis-client.mjs';
import {saveSnapshot} from './catalog-store.mjs';

export async function syncRelaves({fetcher=fetch,layer,root,report=()=>{}}={}){
 const result=await downloadOfficialPolygons({fetcher,...(layer?{layer}:{}),report});
 return saveSnapshot(result,root?{root}:{});
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 console.log('SIRM: consulta oficial directa SERNAGEOMIN; si la red falla, los datos anteriores se conservarán.');
 syncRelaves({report:p=>console.log(`Recibidos ${p.received}/${p.total} polígonos`)})
   .then(m=>console.log(`ÉXITO: ${m.receivedCount} polígonos / SHA-256 ${m.sha256}`))
   .catch(e=>{console.error('SIN SINCRONIZACIÓN:',e.message);process.exitCode=1;});
}
