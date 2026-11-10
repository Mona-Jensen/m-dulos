/** Exposure heuristics for DEMONSTRATION only; NOT structural failure predictions. */
export function assessBuildings(buildings, terrain, frame) {
  return buildings.map((b) => {
    const i = b.r * terrain.cols + b.c;
    const depth = frame.depth[i] || 0;
    const velocity = frame.speed[i] || 0;
    const index = Math.max(depth / b.thresholdDepth, velocity / b.thresholdVelocity);
    const state = index > 1.5 ? 'severe' : index > 0.8 ? 'exposed' : 'normal';
    return { ...b, depth, velocity, index, state };
  });
}
export function countExposed(assessments) {
  return assessments.filter((b) => b.state !== 'normal').length;
}
