/** Pure replay arithmetic, suitable for deterministic testing. */
export function frameAt(progressSeconds, timeline) {
  if (!timeline || timeline.frames.length < 2) throw new Error('Sin fotogramas');
  const fraction = Math.max(0, Math.min(1, progressSeconds / timeline.movieSeconds));
  const raw = fraction * (timeline.frames.length - 1);
  const index = Math.floor(raw);
  return { a: timeline.frames[index], b: timeline.frames[Math.min(index + 1, timeline.frames.length - 1)],
    alpha: raw - index, index, physicalTime: fraction * timeline.simulatedSeconds };
}
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
