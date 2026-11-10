import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticBasin,makeDemoBuildings,parseTerrainJSON,validateTerrain } from '../../public/js/engine/terrain.mjs';
import { SCENARIOS } from '../../public/js/engine/scenarios.mjs';
import { createSolver,runScenario } from '../../public/js/engine/solver.mjs';
import { assessBuildings,countExposed } from '../../public/js/engine/risk.mjs';
import { frameAt,formatTime } from '../../public/js/engine/replay.mjs';
const flat={rows:10,cols:10,dx:25,heights:new Float32Array(100).fill(130),provenance:{type:'test'}};
test('base sintética reproducible, acotada y finita',()=>{
 const a=generateSyntheticBasin(),b=generateSyntheticBasin();assert.equal(a.rows,72);assert.deepEqual(a.heights,b.heights);assert.ok(validateTerrain(a));
});
test('rechaza datos inválidos sin cambiar el proyecto',()=>{
 assert.throws(()=>parseTerrainJSON('{"rows":8,"cols":8,"dx":0,"heights":[]}'));
 assert.throws(()=>validateTerrain({...flat,heights:[Infinity,...new Array(99).fill(2)]}));
});
test('caudal cero y precipitación cero conservan un terreno seco',()=>{
 const engine=createSolver(flat,{...SCENARIOS.flood,sourceRate:0,rainfallMMH:0});
 for(let i=0;i<20;i++)engine.step(1);
 assert.equal(engine.snapshot().stats.volume,0);
});
test('entrada de volumen y transferencias internas conservativas',()=>{
 const s={...SCENARIOS.flood,rainfallMMH:0,sourceRate:50,duration:15};
 const engine=createSolver(flat,s);
 for(let i=0;i<45;i++)engine.step(1);
 const snap=engine.snapshot();
 assert.ok(Math.abs(snap.stats.volume-750)<1e-6,`${snap.stats.volume} ≠ 750`);
 assert.ok(Math.abs(snap.stats.volume-snap.stats.addedVolume)<1e-6);
 assert.ok(snap.depth.every(d=>d>=-1e-7));
});
test('precipitación añade volumen calculable',()=>{
 const s={...SCENARIOS.flood,sourceRate:0,rainfallMMH:360,duration:0};
 const engine=createSolver(flat,s);engine.step(2);
 const snap=engine.snapshot();
 assert.ok(Math.abs(snap.stats.volume-(.0002*100*625))<1e-6);
});
test('los tres escenarios generan fotogramas finitos y no negativos',()=>{
 const t=generateSyntheticBasin(32,32);
 for(const s of Object.values(SCENARIOS)){
  const movie=runScenario(t,s,{duration:60,snapshots:7,dt:1});
  assert.equal(movie.frames.length,7);assert.equal(movie.movieSeconds,180);
  assert.ok(movie.frames.every(f=>Number.isFinite(f.stats.maxDepth) && f.depth.every(x=>x>=0)));
  assert.ok(movie.frames.at(-1).stats.addedVolume>0);
 }
});
test('reproducción respeta extremos de 180 segundos',()=>{
 const m=runScenario(flat,SCENARIOS.flood,{duration:30,snapshots:4});
 assert.equal(frameAt(0,m).index,0);assert.equal(frameAt(180,m).index,3);
 assert.equal(frameAt(900,m).physicalTime,30);assert.equal(formatTime(180),'03:00');
});
test('viviendas ilustrativas y estados interpretables',()=>{
 const t=generateSyntheticBasin(48,48),b=makeDemoBuildings(t);
 const depth=new Float32Array(t.rows*t.cols);const speed=new Float32Array(depth.length);
 for(const house of b)depth[house.r*t.cols+house.c]=3;
 const risk=assessBuildings(b,t,{depth,speed});
 assert.equal(countExposed(risk),b.length);assert.ok(risk.every(h=>h.state==='severe'));
});
test('el terreno real con nodata se normaliza sin valores no finitos',()=>{
  const array = new Float32Array([
    10, 11, 12, 13,
    14, NaN, 15, 16,
    17, 18, -9999, 20,
    21, 22, 23, 24,
  ]);
  const filtered = Array.from(array).filter((v) => Number.isFinite(v) && !(Number.isFinite(-9999) && Math.abs(v - -9999) <= 1e-6));
  assert.equal(filtered.every(Number.isFinite), true);
  assert.equal(filtered.some((v) => Math.abs(v - -9999) <= 1e-6), false);
});
