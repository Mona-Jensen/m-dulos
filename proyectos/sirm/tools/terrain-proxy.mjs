
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const cache=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../data/cache/terrarium'
);

const magic=Buffer.from([137,80,78,71,13,10,26,10]);

function pngOK(b){
  return b.length>60 &&
    b.length<5000000 &&
    b.subarray(0,8).equals(magic) &&
    b.readUInt32BE(16)===256 &&
    b.readUInt32BE(20)===256;
}

function error(res,status,message){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8'});
  res.end(JSON.stringify({error:message}));
}

export async function handleTerrainTile(req,res,u){
  if(!u.pathname.startsWith('/api/terrain/tile/'))return false;

  const m=/^\/api\/terrain\/tile\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(u.pathname);

  if(!m||req.method!=='GET'){
    error(res,400,'Solicitud de terreno inválida');
    return true;
  }

  const [z,x,y]=m.slice(1).map(Number);

  if(z!==12||x<0||x>=4096||y<0||y>=4096){
    error(res,400,'Mosaico fuera de rango');
    return true;
  }

  const f=path.join(cache,String(z),String(x),y+'.png');

  try{
    let b;
    try{
      b=await fs.readFile(f);
    }catch(e){
      if(e.code!=='ENOENT')throw e;

      const url='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'
        +z+'/'+x+'/'+y+'.png';

      const r=await fetch(url,{
        signal:AbortSignal.timeout(20000)
      });

      if(!r.ok)throw Error('Servidor de elevaciones respondió '+r.status);

      b=Buffer.from(await r.arrayBuffer());

      if(!pngOK(b))throw Error('PNG incompleto o dimensiones incorrectas');

      await fs.mkdir(path.dirname(f),{recursive:true});
      const temp=f+'.tmp-'+process.pid;

      try{
        await fs.writeFile(temp,b);
        await fs.rename(temp,f);
      }finally{
        await fs.rm(temp,{force:true});
      }
    }

    if(!pngOK(b))throw Error('Mosaico guardado no válido');

    res.writeHead(200,{
      'content-type':'image/png',
      'cache-control':'public,max-age=86400'
    });

    res.end(b);
  }catch(e){
    error(res,502,'No se pudo obtener elevación real: '+e.message);
  }

  return true;
}
