export function interpolateAt(points, x) {
  const sorted = points.sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i++) {
    if (x >= sorted[i - 1].x && x <= sorted[i].x) {
      const { x: x0, y: y0 } = sorted[i - 1];
      const { x: x1, y: y1 } = sorted[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return 0;
}

export function interpolate(points, lower, upper, resolution = 1000) {
  const extended = [...points];
  if (!extended.some(p => p.x === lower)) {
    extended.push({ x: lower, y: interpolateAt(extended, lower) });
  }
  if (!extended.some(p => p.x === upper)) {
    extended.push({ x: upper, y: interpolateAt(extended, upper) });
  }
  const sorted = extended.sort((a, b) => a.x - b.x);
  const result = [];
  const step = (upper - lower) / resolution;
  for (let x = lower; x <= upper; x += step) {
    result.push({ x, y: interpolateAt(sorted, x) });
  }
  return result;
}
