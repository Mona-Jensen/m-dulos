export const SCENARIOS = Object.freeze({
  flood: {
    id: 'flood', title: 'Inundación repentina', material: 'water',
    description: 'Lluvia intensa y liberación hipotética de agua en la cabecera.',
    rainfallMMH: 115, sourceRate: 450, duration: 360, manning: 0.045,
    accent: '#39b7e9', warning: 'Cálculo demostrativo, no pronóstico hidrológico.',
  },
  slide: {
    id: 'slide', title: 'Remoción en masa', material: 'debris',
    description: 'Aporte concentrado de material desde una ladera inestable.',
    rainfallMMH: 0, sourceRate: 800, duration: 240, manning: 0.16,
    accent: '#c99565', warning: 'Modelo hidráulico simplificado, NO es un modelo geotécnico calibrado.',
  },
  tailings: {
    id: 'tailings', title: 'Liberación de relaves', material: 'tailings',
    description: 'Liberación hipotética de una mezcla densa en la cabecera.',
    rainfallMMH: 0, sourceRate: 650, duration: 500, manning: 0.13,
    accent: '#ae8d80', warning: 'Representación experimental; carece de reología y geometría real del depósito.',
  },
});

export function sourceCells(terrain, scenario) {
  const { rows, cols } = terrain;
  const r = Math.round(rows * .15);
  const c = Math.round((cols - 1) / 2 + (scenario.material === 'debris' ? -9 : 0));
  const cells = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (r + dr >= 0 && c + dc >= 0 && r + dr < rows && c + dc < cols) cells.push((r + dr) * cols + c + dc);
  }
  return cells;
}
