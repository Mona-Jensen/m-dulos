import { performance } from 'node:perf_hooks';
import { generateSyntheticBasin } from '../../public/js/engine/terrain.mjs';
import { SCENARIOS } from '../../public/js/engine/scenarios.mjs';
import { runScenario } from '../../public/js/engine/solver.mjs';
for(const n of [32,72,96]) {
 const terrain=generateSyntheticBasin(n,n);const measurements=[];
 for(let i=0;i<5;i++) {const t0=performance.now();runScenario(terrain,SCENARIOS.flood);measurements.push(Math.round(performance.now()-t0));}
 console.log(`${n}x${n}: ms = ${measurements.join(', ')}; mediana=${[...measurements].sort((a,b)=>a-b)[2]}`);
}
