/** SIRM: lectura verificable de FeatureServer oficial. No fabrica geometrías. */
export const OFFICIAL_LAYER = 'https://services1.arcgis.com/OyjvVdFTl5hfSdX3/ArcGIS/rest/services/CDR_CHILE_AREAL_2025/FeatureServer/0';
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

function endpointUrl(layer, action, parameters) {
  const u = new URL(`${layer.replace(/\/$/,'')}${action}`);
  for (const [key,value] of Object.entries(parameters)) u.searchParams.set(key,String(value));
  return u;
}
export async function arcgisRequest(fetcher,url,{method='GET',body=null,retries=2,signal}={}) {
  for(let attempt=0;attempt<=retries;attempt++){
    try{
      const resp=await fetcher(url,{
        method,signal,
        ...(body?{headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString()}:{}),
      });
      if((resp.status===429||resp.status>=500)&&attempt<retries){await sleep(250*2**attempt);continue;}
      if(!resp.ok)throw new Error(`ArcGIS HTTP ${resp.status}`);
      const data=await resp.json();
      if(data?.error)throw new Error(`ArcGIS ${data.error.code||''}: ${data.error.message||'Error del servicio'}`);
      return data;
    }catch(err){
      if(attempt<retries && (err instanceof TypeError || /fetch failed|aborted|timeout/i.test(String(err.message)))){await sleep(250*2**attempt);continue;}
      throw err;
    }
  }
}
function coordOK(c){return Array.isArray(c)&&c.length>=2&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&c[0]>=-180&&c[0]<=180&&c[1]>=-90&&c[1]<=90;}
function ringOK(r){return Array.isArray(r)&&r.length>=4&&r.every(coordOK)&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1];}
/** Only syntactic/CRS checks; topology, provenance and polygon accuracy require GIS audit. */
export function validatePolygonFeature(f,oidField='OBJECTID'){
  if(f?.type!=='Feature'||!f.properties||typeof f.properties!=='object')throw new Error('Entidad GeoJSON incompleta');
  const oid=f.properties[oidField]??f.properties.OBJECTID;
  if(!Number.isSafeInteger(Number(oid))||oid==null)throw new Error('Entidad sin OBJECTID válido');
  const g=f.geometry;
  if(!g||!['Polygon','MultiPolygon'].includes(g.type))throw new Error(`Geometría inesperada en OBJECTID=${oid}`);
  const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  if(!Array.isArray(polys)||!polys.length||!polys.every(p=>Array.isArray(p)&&p.length&&p.every(ringOK)))
    throw new Error(`Anillos o coordenadas inválidas en OBJECTID=${oid}`);
  return Number(oid);
}
function idsValid(ids){return Array.isArray(ids)&&ids.every(id=>Number.isSafeInteger(Number(id)));}

/** fetcher injectable para pruebas offline. Una discrepancia nunca se oculta o trunca. */
export async function downloadOfficialPolygons({fetcher=fetch,layer=OFFICIAL_LAYER,batchSize=125,report=()=>{},signal}={}){
  if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>500)throw new Error('batchSize fuera de rango (1..500)');
  const meta=await arcgisRequest(fetcher,endpointUrl(layer,'',{f:'json'}),{signal});
  if(meta.geometryType!=='esriGeometryPolygon')throw new Error('El servicio no declara polígonos');
  const oidField=meta.objectIdField||meta.objectIdFieldName||'OBJECTID';
  if(!String(meta.supportedQueryFormats||'').toLowerCase().includes('geojson'))
    throw new Error('El servicio no declara consultas GeoJSON');
  const queryBase=`${layer.replace(/\/$/,'')}/query`;
  const countResponse=await arcgisRequest(fetcher,endpointUrl(layer,'/query',{where:'1=1',returnCountOnly:'true',f:'json'}),{signal});
  const count=countResponse.count;
  if(!Number.isSafeInteger(count)||count<0)throw new Error('Respuesta de conteo inválida');
  const idResp=await arcgisRequest(fetcher,endpointUrl(layer,'/query',{where:'1=1',returnIdsOnly:'true',f:'json'}),{signal});
  const allIds=idResp.objectIds;
  if(!idsValid(allIds))throw new Error('Listado de OBJECTID inválido');
  const uniqueIds=[...new Set(allIds.map(Number))].sort((a,b)=>a-b);
  if(uniqueIds.length!==count||allIds.length!==count)throw new Error(`Conteos incompatibles: count=${count}, IDs=${allIds.length}, distintos=${uniqueIds.length}. Fuente potencialmente modificada durante la consulta.`);
  if(count>100000)throw new Error('Más de 100.000 entidades: requiere estrategia especial antes de importar');
  const features=[];const seen=new Set();
  for(let offset=0;offset<uniqueIds.length;offset+=batchSize){
    const ids=uniqueIds.slice(offset,offset+batchSize);
    const params=new URLSearchParams({objectIds:ids.join(','),outFields:'*',returnGeometry:'true',outSR:'4326',f:'geojson'});
    const batch=await arcgisRequest(fetcher,queryBase,{method:'POST',body:params,signal});
    if(batch?.type!=='FeatureCollection'||!Array.isArray(batch.features))throw new Error('La respuesta no es una colección GeoJSON');
    if(batch.features.length!==ids.length)throw new Error(`Lote ${Math.floor(offset/batchSize)+1} incompleto: ${batch.features.length} de ${ids.length}`);
    const requested=new Set(ids);
    for(const f of batch.features){
      const oid=validatePolygonFeature(f,oidField);
      if(!requested.has(oid)||seen.has(oid))throw new Error(`OBJECTID duplicado o no solicitado: ${oid}`);
      seen.add(oid);features.push(f);
    }
    report({received:features.length,total:count,batch:Math.floor(offset/batchSize)+1});
  }
  if(features.length!==count)throw new Error(`Descarga incompleta: ${features.length}/${count}`);
  return {collection:{type:'FeatureCollection',name:meta.name||'CDR_CHILE_AREAL_2025',features},metadata:{layer,layerName:meta.name||null,declaredCount:count,receivedCount:features.length,objectIdField:oidField,spatialReferenceOutput:'EPSG:4326',sourceSpatialReference:meta.extent?.spatialReference||meta.sourceSpatialReference||null,serviceLastEditDate:meta.editingInfo?.lastEditDate||null,quality:'validación estructural y de coordenadas solamente; la precisión cartográfica y estabilidad no están certificadas'}};
}
