/**
 * Local-inertial, depth-averaged storage-cell hydraulics on a square raster.
 * Conservative internal transfers with positive water depth and closed boundary.
 * NOT a validated debris-flow, tailings dam-break, or public safety prediction model.
 * Equations: q(t+dt) = [q(t)-g*h_face*dt*d(eta)/dx] / [1+g*n²*dt*|q|/h_face^(7/3)].
 */
import { validateTerrain } from './terrain.mjs';
import { sourceCells } from './scenarios.mjs';
const GRAVITY = 9.81;

export function createSolver(terrain, scenario) {
  validateTerrain(terrain);
  if (!scenario || !Number.isFinite(scenario.manning) || scenario.manning <= 0) throw new Error('Escenario no válido');
  const { rows, cols, dx, heights } = terrain;
  const N = rows * cols;
  const depth = new Float64Array(N);
  const fx = new Float64Array(rows * (cols - 1));
  const fy = new Float64Array((rows - 1) * cols);
  const out = new Float64Array(N);
  const scaling = new Float64Array(N);
  const speed = new Float32Array(N);
  const sources = sourceCells(terrain, scenario);
  let time = 0;
  let addedVolume = 0;
  const surface = (i) => heights[i] + depth[i];

  function step(dt = 1) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 3) throw new Error('dt fuera de rango (0,3]');
    const rain = (scenario.rainfallMMH || 0) * 0.001 / 3600 * dt;
    let newlyAdded = 0;
    if (rain) {
      for (let i = 0; i < N; i++) depth[i] += rain;
      newlyAdded += rain * N * dx * dx;
    }
    if (time < scenario.duration && scenario.sourceRate > 0) {
      const active = Math.min(dt, scenario.duration - time);
      const perCell = scenario.sourceRate * active / (sources.length * dx * dx);
      for (const i of sources) depth[i] += perCell;
      newlyAdded += scenario.sourceRate * active;
    }
    addedVolume += newlyAdded;
    out.fill(0);
    const n = scenario.manning;
    // Face flux is volume per unit face width [m2/s].
    const flux = (a, b, old) => {
      const etaA = surface(a), etaB = surface(b);
      const waterAvailable = Math.max(etaA, etaB) - Math.max(heights[a], heights[b]);
      if (waterAvailable <= 1e-5) return 0;
      const h = Math.max(1e-4, waterAvailable);
      const gradient = (etaB - etaA) / dx;
      const denom = 1 + GRAVITY * n * n * dt * Math.abs(old) / Math.pow(h, 7/3);
      let q = (old - GRAVITY * h * dt * gradient) / denom;
      const upper = 13 * Math.max(depth[a], depth[b]);
      q = Math.max(-upper, Math.min(upper, q));
      // Never transport material from a dry higher-bed cell.
      if ((q > 0 && depth[a] < 1e-6) || (q < 0 && depth[b] < 1e-6)) q = 0;
      return q;
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const idx = r * (cols - 1) + c, a = r * cols + c, b = a + 1;
        const q = fx[idx] = flux(a, b, fx[idx]);
        out[q > 0 ? a : b] += Math.abs(q) * dt / dx;
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c, a = idx, b = idx + cols;
        const q = fy[idx] = flux(a, b, fy[idx]);
        out[q > 0 ? a : b] += Math.abs(q) * dt / dx;
      }
    }
    for (let i = 0; i < N; i++) scaling[i] = out[i] > depth[i] ? depth[i] / out[i] : 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols - 1; c++) {
      const idx = r * (cols - 1) + c, a = r * cols + c, b = a + 1;
      const q = fx[idx] *= (fx[idx] > 0 ? scaling[a] : scaling[b]);
      depth[a] -= q * dt / dx; depth[b] += q * dt / dx;
    }
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
      const idx = r * cols + c, a = idx, b = idx + cols;
      const q = fy[idx] *= (fy[idx] > 0 ? scaling[a] : scaling[b]);
      depth[a] -= q * dt / dx; depth[b] += q * dt / dx;
    }
    // Prevent roundoff from generating negative depths.
    for (let i = 0; i < N; i++) if (depth[i] < 0 && depth[i] > -1e-8) depth[i] = 0;
    time += dt;
  }

  function snapshot() {
    speed.fill(0);
    const vCount = new Uint8Array(N);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols - 1; c++) {
      const q = fx[r * (cols - 1) + c], a = r * cols + c, b = a + 1;
      const aV = Math.abs(q) / Math.max(depth[a], 0.05), bV = Math.abs(q) / Math.max(depth[b], 0.05);
      speed[a] += aV;speed[b] += bV;vCount[a]++;vCount[b]++;
    }
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
      const q = fy[r * cols + c], a = r * cols + c, b = a + cols;
      speed[a] += Math.abs(q) / Math.max(depth[a], .05);
      speed[b] += Math.abs(q) / Math.max(depth[b], .05);
      vCount[a]++;vCount[b]++;
    }
    let wetCells = 0, maxDepth = 0, total = 0;
    for (let i = 0; i < N; i++) {
      speed[i] /= Math.max(1, vCount[i]);
      maxDepth = Math.max(maxDepth, depth[i]);
      total += depth[i] * dx * dx;
      if (depth[i] > .1) wetCells++;
    }
    return { time, depth: Float32Array.from(depth), speed: Float32Array.from(speed),
      stats: { maxDepth, wetArea: wetCells * dx * dx, volume: total, addedVolume } };
  }
  return { step, snapshot, get time() { return time; } };
}

/** Generate timeline for a 15-minute illustrative physical scenario.
 * The player shows it over 180 seconds (5x time compression).
 */
export function runScenario(terrain, scenario, { duration = 900, snapshots = 181, dt = 1 } = {}) {
  if (!(Number.isInteger(snapshots) && snapshots >= 2 && snapshots <= 901)) throw new Error('Cantidad de fotogramas inválida');
  const solver = createSolver(terrain, scenario);
  const timeline = [solver.snapshot()];
  const stepInterval = duration / (snapshots - 1);
  for (let i = 1; i < snapshots; i++) {
    const target = i * stepInterval;
    while (solver.time + 1e-8 < target) solver.step(Math.min(dt, target - solver.time));
    timeline.push(solver.snapshot());
  }
  return { scenarioId: scenario.id, simulatedSeconds: duration, movieSeconds: 180,
    frames: timeline, provenance: terrain.provenance };
}
