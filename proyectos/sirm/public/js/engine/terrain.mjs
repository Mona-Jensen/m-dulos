/** Synthetic test basin. NOT surveyed Chilean topography. Coordinates in meters. */
export const GRID_SIZE = 72;
export const CELL_METERS = 42;
export const DEM_VERSION = 'synthetic-basin-1.0';

export function valleyCenter(row, rows = GRID_SIZE) {
  const t = row / Math.max(1, rows - 1);
  return Math.sin(t * 5.8 - 1.2) * 4.1 + Math.sin(t * 12.1) * 1.15;
}

export function generateSyntheticBasin(rows = GRID_SIZE, cols = GRID_SIZE) {
  const dx = CELL_METERS;
  const heights = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const center = valleyCenter(r, rows);
    for (let c = 0; c < cols; c++) {
      const fromValley = Math.abs(c - (cols - 1) / 2 - center) * dx;
      const hills = 0.00013 * fromValley * fromValley;
      const sideDetail = (5 * Math.sin(c * .53 + r * .21) + 3 * Math.sin(c * .96 - r * .38)) * Math.min(1, fromValley / 350);
      const valleyProfile = 670 - t * 175;
      const riverInset = 9 * Math.exp(-Math.pow(fromValley / 87, 2));
      heights[r * cols + c] = valleyProfile + hills + sideDetail - riverInset;
    }
  }
  return {
    rows, cols, dx, heights,
    provenance: { type: 'synthetic', label: 'Cuenca sintética de demostración', version: DEM_VERSION,
      warning: 'No corresponde a una localidad ni a topografía medida.' },
  };
}

export function makeDemoBuildings(terrain) {
  if (terrain.realTerrain || terrain.provenance?.type !== 'synthetic') return [];
  const { rows, cols } = terrain;
  const buildings = [];
  let id = 1;
  for (let r = 14; r <= Math.min(rows - 5, 66); r += 4) {
    const center = (cols - 1) / 2 + valleyCenter(r, rows);
    for (const offset of [-5, -3, -2, 2, 3, 5]) {
      const c = Math.round(center + offset + Math.sin(r + offset) * 0.35);
      if (c <= 1 || c >= cols - 2) continue;
      buildings.push({ id: `CASA-${String(id++).padStart(3, '0')}`, r, c,
        type: 'vivienda', thresholdDepth: 1.15, thresholdVelocity: 2.0 });
    }
  }
  return buildings;
}

export function validateTerrain(input) {
  if (!input || !Number.isInteger(input.rows) || !Number.isInteger(input.cols)) throw new Error('Dimensiones inválidas');
  if (input.rows < 8 || input.cols < 8 || input.rows > 256 || input.cols > 256) throw new Error('Dimensiones fuera del intervalo permitido (8–256)');
  if (!Number.isFinite(input.dx) || input.dx <= 0) throw new Error('Resolución espacial inválida');
  if (!input.heights || input.heights.length !== input.rows * input.cols) throw new Error('Tamaño de elevaciones incorrecto');
  for (const v of input.heights) if (!Number.isFinite(v)) throw new Error('Elevación no finita');
  return true;
}

export function parseTerrainJSON(text) {
  const raw = JSON.parse(text);

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Terreno JSON inválido');
  }

  if (
    !Number.isInteger(raw.rows) ||
    !Number.isInteger(raw.cols) ||
    raw.rows < 8 || raw.cols < 8 ||
    raw.rows > 256 || raw.cols > 256 ||
    !Number.isFinite(raw.dx) || raw.dx <= 0 ||
    !Array.isArray(raw.heights) ||
    raw.heights.length !== raw.rows * raw.cols ||
    !raw.heights.every(v =>
      typeof v === 'number' && Number.isFinite(v)
    )
  ) {
    throw new Error('Malla de elevaciones inválida');
  }

  const boundsWGS84 = raw.boundsWGS84 ?? null;

  if (boundsWGS84 !== null && (
    !Array.isArray(boundsWGS84) ||
    boundsWGS84.length !== 4 ||
    !boundsWGS84.every(v =>
      typeof v === 'number' && Number.isFinite(v)
    ) ||
    boundsWGS84[0] < -180 ||
    boundsWGS84[2] > 180 ||
    boundsWGS84[1] < -90 ||
    boundsWGS84[3] > 90 ||
    boundsWGS84[0] >= boundsWGS84[2] ||
    boundsWGS84[1] >= boundsWGS84[3]
  )) {
    throw new Error('Límites geográficos WGS84 inválidos');
  }

  const provenance = raw.provenance || {
    type: 'external',
    label: 'Modelo importado',
    warning: 'Datos sin validación externa'
  };

  const dem = {
    rows: raw.rows,
    cols: raw.cols,
    dx: raw.dx,
    heights: new Float32Array(raw.heights),
    provenance,
    boundsWGS84,
    realTerrain: raw.realTerrain === true ||
      (raw.realTerrain !== false &&
       provenance.type !== 'synthetic')
  };

  validateTerrain(dem);
  return dem;
}
