import { interpolate } from "./utils";

export function buildPoints(curve) {
  const points = [{ x: 0, y: 0 }];
  for (let i = 0; i < Math.min(curve.x.length, curve.y.length); i++) {
    points.push({ x: parseFloat(curve.x[i]), y: parseFloat(curve.y[i]) });
  }
  points.push({ x: 100, y: curve.max_rate });
  return points;
}

export function generateBorrowAndLend(points, range) {
  const borrow = interpolate(points, range[0], range[1]);
  const lend = borrow.map(p => ({
    x: p.x,
    y: (p.y * p.x) / 100
  }));
  return [borrow, lend];
}
