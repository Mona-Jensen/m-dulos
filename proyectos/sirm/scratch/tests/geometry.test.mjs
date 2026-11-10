import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticBasin } from '../../public/js/engine/terrain.mjs';
import { makeSphere,makeTerrainMesh,makeWaterMesh,makeBox,makePyramidRoof } from '../../public/js/renderer/geometry.mjs';

test('geometrías 3D tienen índices y vectores consistentes',()=>{
 const meshes=[makeSphere(2,32,16),makeTerrainMesh(generateSyntheticBasin(16,16)),makeBox(),makePyramidRoof()];
 for(const m of meshes){const vertices=m.positions.length/3;
  assert.equal(m.normals.length,vertices*3);assert.equal(m.uvs.length,vertices*2);assert.equal(m.colors.length,vertices*3);
  assert.ok(m.indices.length>0);assert.ok(m.indices.every(i=>i<vertices));
  assert.ok(m.positions.every(Number.isFinite));
 }
});
test('el terreno tiene normales dominantes ascendentes',()=>{
 const m=makeTerrainMesh(generateSyntheticBasin(16,16));let positive=0;
 for(let i=1;i<m.normals.length;i+=3)if(m.normals[i]>0)positive++;
 assert.ok(positive>=230,`normales positivas ${positive}`);
});
test('malla de inundación está vacía en seco y dibuja celdas mojadas',()=>{
 const t=generateSyntheticBasin(16,16),d=new Float32Array(16*16);
 assert.equal(makeWaterMesh(t,d).indices.length,0);
 d.fill(1);assert.ok(makeWaterMesh(t,d).indices.length>0);
});
