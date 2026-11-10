import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer,resolvePublicPath } from '../../tools/server.mjs';
test('no permite resolver rutas fuera de public',()=>{
 assert.throws(()=>resolvePublicPath('/../../etc/passwd'));
 assert.throws(()=>resolvePublicPath('/%2E%2E/%2E%2E/etc/passwd'));
});
test('sirve HTML, módulos y geografía terrestre sin conexión exterior',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const [path,type] of [['/','text/html'],['/js/main.mjs','text/javascript'],['/assets/earth-geography.jpg','image/jpeg']]){
    const res=await fetch(url+path);assert.equal(res.status,200);assert.ok(res.headers.get('content-type').includes(type));assert.ok((await res.arrayBuffer()).byteLength>100);
  }
  assert.equal((await fetch(url+'/nonexistent.x')).status,404);
  assert.ok([403,404].includes((await fetch(url+'/%2e%2e/%2e%2e/etc/passwd')).status)); // URL normaliza rutas antes de enviarlas
 }finally{await new Promise(resolve=>server.close(resolve));}
});
