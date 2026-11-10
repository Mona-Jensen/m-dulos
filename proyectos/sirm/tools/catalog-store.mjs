import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validatePolygonFeature} from './arcgis-client.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../data/cache/sernageomin-relaves');
const snapshotPath=(root,sha)=>path.join(root,'snapshots',`${sha}.geojson`);
const metadataPath=(root)=>path.join(root,'manifest.json');
async function atomicWrite(filename,data){
 const tmp=filename+`.tmp-${process.pid}-${Date.now()}`;
 try{await fs.writeFile(tmp,data,'utf8');await fs.rename(tmp,filename);}catch(e){await fs.rm(tmp,{force:true}).catch(()=>{});throw e;}
}
export async function saveSnapshot(result,{root=ROOT}={}){
 const {collection,metadata}=result;
 if(collection.type!=='FeatureCollection'||collection.features.length!==metadata.declaredCount)throw new Error('No se almacena colección incompleta');
 const seen=new Set();for(const f of collection.features){const id=validatePolygonFeature(f,metadata.objectIdField);if(seen.has(id))throw new Error('IDs duplicados');seen.add(id);}
 const serialized=JSON.stringify(collection);
 const sha256=createHash('sha256').update(serialized).digest('hex');
 const verifiedAt=new Date().toISOString();
 const manifest={...metadata,sha256,verifiedAt,status:'válido estructuralmente; NO certificado geotécnicamente',source:'SERNAGEOMIN ArcGIS FeatureServer',geometry:'poligonos',version:1};
 await fs.mkdir(path.join(root,'snapshots'),{recursive:true});
 const snapshot=snapshotPath(root,sha256);
 try{await fs.access(snapshot);}catch{await atomicWrite(snapshot,serialized);}
 // Manifest es el único puntero de versión y se publica al FINAL (commit atómico).
 // Fallos durante descarga/escritura no cambian el catálogo activo.
 await atomicWrite(metadataPath(root),JSON.stringify(manifest,null,2));
 return manifest;
}
export async function loadSnapshot({root=ROOT}={}){
 let metadata;
 try{metadata=JSON.parse(await fs.readFile(metadataPath(root),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 {
  
  const raw=await fs.readFile(snapshotPath(root,metadata.sha256),'utf8');
  const collection=JSON.parse(raw);
  const hash=createHash('sha256').update(raw).digest('hex');
  if(hash!==metadata.sha256||collection.features?.length!==metadata.receivedCount)throw new Error('La caché de polígonos no superó validación de integridad');
  return {collection,metadata};
 }
}
export async function readStatus({root=ROOT}={}){
 let manifest;
 try{manifest=JSON.parse(await fs.readFile(metadataPath(root),'utf8'));}catch(e){if(e.code==='ENOENT')return {kind:'puntos',ready:false,reason:'Sin descarga validada de polígonos'};return {kind:'error',ready:false,reason:e.message};}
 try{
  const raw=await fs.readFile(snapshotPath(root,manifest.sha256),'utf8');
  if(createHash('sha256').update(raw).digest('hex')!==manifest.sha256)throw new Error('Hash SHA-256 de caché no coincide');
  return {kind:'poligonos',ready:true,...manifest};
 }catch(e){return {kind:'error',ready:false,reason:e.message};}
}
