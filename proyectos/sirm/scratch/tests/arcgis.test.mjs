import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {downloadOfficialPolygons,validatePolygonFeature} from '../../tools/arcgis-client.mjs';
import {saveSnapshot,loadSnapshot,readStatus} from '../../tools/catalog-store.mjs';
import {syncRelaves} from '../../tools/sync-relaves.mjs';
function sample(i){const x=-70-(i%20)*.002,y=-28-(i%35)*.001;return {type:'Feature',id:i,properties:{OBJECTID:i,ID:`${i}-test`,REGION:'Atacama',NOMBRE_INSTALACION:'CASO DE PRUEBA (NO REAL)'},geometry:{type:'Polygon',coordinates:[[[x,y],[x+.0005,y],[x+.0005,y+.0005],[x,y+.0005],[x,y]]]}};}
function mockArcgis({count=1205,missing=null,mutate=null}={}){
 let pageCalls=0;
 return {fetcher:async(url,opts={})=>{
  const u=new URL(url);let result;
  if(!u.pathname.endsWith('/query'))result={name:'Prueba offline',geometryType:'esriGeometryPolygon',objectIdField:'OBJECTID',supportedQueryFormats:'JSON, geoJSON, PBF'};
  else{
   const q=opts.body?new URLSearchParams(opts.body):u.searchParams;
   if(q.get('returnCountOnly')==='true')result={count};
   else if(q.get('returnIdsOnly')==='true')result={objectIds:Array.from({length:count},(_,i)=>i+1)};
   else {
    pageCalls++;
    const ids=q.get('objectIds').split(',').map(Number);
    let features=ids.map(sample);
    if(missing!=null&&features.some(x=>x.properties.OBJECTID===missing))features=features.filter(x=>x.properties.OBJECTID!==missing);
    if(mutate)features=mutate(features,pageCalls);
    result={type:'FeatureCollection',features};
   }
  }
  return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}});
 },get pages(){return pageCalls}};
}
test('descarga exhaustiva por OBJECTID en múltiples lotes, sin truncar',async()=>{
 const mock=mockArcgis();
 const actual=await downloadOfficialPolygons({fetcher:mock.fetcher,layer:'https://fake.arcgis.test/layer/0',batchSize:125});
 assert.equal(actual.collection.features.length,1205);
 assert.equal(new Set(actual.collection.features.map(f=>f.properties.OBJECTID)).size,1205);
 assert.equal(mock.pages,10);
 assert.equal(actual.metadata.declaredCount,1205);
});
test('aborta si un lote pierde un polígono',async()=>{
 const mock=mockArcgis({count:255,missing:199});
 await assert.rejects(()=>downloadOfficialPolygons({fetcher:mock.fetcher,layer:'https://fake.arcgis.test/layer/0',batchSize:125}),/incompleto/);
});
test('aborta si el servidor entrega coordenadas fuera de WGS84',async()=>{
 const mock=mockArcgis({count:3,mutate:features=>{features[0].geometry.coordinates[0][0][0]=900;return features;}});
 await assert.rejects(()=>downloadOfficialPolygons({fetcher:mock.fetcher,layer:'https://fake.arcgis.test/layer/0'}),/inválidas/);
});
test('aborta frente a IDs duplicados o no solicitados',async()=>{
 const mock=mockArcgis({count:2,mutate:features=>{features[1].properties.OBJECTID=features[0].properties.OBJECTID;return features;}});
 await assert.rejects(()=>downloadOfficialPolygons({fetcher:mock.fetcher,layer:'https://fake.arcgis.test/layer/0'}),/duplicado/);
});
test('aborta si conteo e identificadores no coinciden',async()=>{
 const mock=mockArcgis({count:2});
 const fetcher=async(u,o)=>{
  const v=new URL(u);
  if(v.searchParams.get('returnCountOnly')==='true')return new Response(JSON.stringify({count:4}),{status:200});
  return mock.fetcher(u,o);
 };
 await assert.rejects(()=>downloadOfficialPolygons({fetcher,layer:'https://fake.arcgis.test/layer/0'}),/Conteos incompatibles/);
});
test('conserva datos previos íntegros tras fallar una sincronización',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sirm-cache-'));
 try{
  const valid=mockArcgis({count:7});
  const first=await syncRelaves({fetcher:valid.fetcher,layer:'https://fake.arcgis.test/layer/0',root});
  assert.equal((await loadSnapshot({root})).collection.features.length,7);
  const broken=mockArcgis({count:8,missing:4});
  await assert.rejects(()=>syncRelaves({fetcher:broken.fetcher,layer:'https://fake.arcgis.test/layer/0',root}));
  const after=await loadSnapshot({root});
  assert.equal(after.collection.features.length,7);
  assert.equal(after.metadata.sha256,first.sha256);
  assert.equal((await readStatus({root})).ready,true);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('rejects malformed JSON and unclosed polygon rings',async()=>{
 assert.throws(()=>JSON.parse('{"type":Característica}'),SyntaxError);
 const bad=sample(2);bad.geometry.coordinates[0].pop();
 assert.throws(()=>validatePolygonFeature(bad),/Anillos/);
});
test('dataset offline de puntos: 836 registros, cada uno con coordenadas válidas',async()=>{
 const text=await fs.readFile(new URL('../../public/data/relaves_puntos_oct2025.geojson',import.meta.url),'utf8');
 const data=JSON.parse(text);
 assert.equal(data.features.length,836);
 for(const f of data.features){assert.equal(f.geometry.type,'Point');const [lon,lat]=f.geometry.coordinates;assert.ok(lon>=-180&&lon<=180&&lat>=-90&&lat<=90);}
});
