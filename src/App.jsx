import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Linear interpolation helper
function interpolate(points, lower, upper, resolution = 1000) {
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

function interpolateAt(points, x) {
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

export default function InterestRateCurveApp() {
  const [lowerBound, setLowerBound] = useState(40.0);
  const [upperBound, setUpperBound] = useState(100.0);

  const marginFiPoints = [
    { x: 0.0, y: 0.0 },
    { x: 90.0, y: 7.5 },
    { x: 100.0, y: 30.0 }
  ];

  const kaminoPoints = [
    { x: 0.0, y: 0.0 },
    { x: 91.0, y: 7.87 },
    { x: 93.0, y: 13.46 },
    { x: 95.0, y: 28.73 },
    { x: 100.0, y: 17.5 }
  ];

  const marginFiCurve = interpolate(marginFiPoints, lowerBound, upperBound);
  const kaminoCurve = interpolate(kaminoPoints, lowerBound, upperBound);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Interest Rate Utilization Curves</h2>
      <div className="flex gap-4 mb-4">
        <input
          type="number"
          className="border p-2 rounded"
          value={lowerBound}
          step="0.01"
          onChange={(e) => setLowerBound(parseFloat(e.target.value))}
          placeholder="Lower Bound %"
        />
        <input
          type="number"
          className="border p-2 rounded"
          value={upperBound}
          step="0.01"
          onChange={(e) => setUpperBound(parseFloat(e.target.value))}
          placeholder="Upper Bound %"
        />
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" type="number" domain={[lowerBound, upperBound]} tickFormatter={(x) => `${x.toFixed(2)}%`} />
          <YAxis tickFormatter={(y) => `${y.toFixed(1)}%`} />
          <Tooltip formatter={(v) => `${v.toFixed(2)}%`} labelFormatter={(l) => `${l.toFixed(2)}% Utilization`} />
          <Legend />
          <Line type="monotone" data={marginFiCurve} dataKey="y" name="MarginFi" stroke="#8884d8" dot={false} />
          <Line type="monotone" data={kaminoCurve} dataKey="y" name="Kamino" stroke="#82ca9d" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
