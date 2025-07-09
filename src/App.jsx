import React, { useEffect, useState } from "react";
import { Range } from "react-range";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MIN = 0;
const MAX = 100;

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

function CurveEditor({ curvesList, initialCurves, small = false }) {
  const [curveInputs, setCurveInputs] = useState(initialCurves);
  const [range, setRange] = useState([40, 100]);
  const [renderedCurves, setRenderedCurves] = useState([]);

  const handleDraw = () => {
    const colors = ["#8884d8", "#82ca9d"];
    const rendered = curveInputs.map((cfg, idx) => {
      const points = [{ x: 0, y: 0 }];
      for (let i = 0; i < Math.min(cfg.x.length, cfg.y.length); i++) {
        points.push({ x: parseFloat(cfg.x[i]), y: parseFloat(cfg.y[i]) });
      }
      points.push({ x: 100, y: cfg.max_rate });
      return {
        label: cfg.name,
        type: cfg.type,
        data: interpolate(points, range[0], range[1]),
        color: colors[idx % colors.length]
      };
    });
    setRenderedCurves(rendered);
  };

  const inputClass = `border p-1 rounded text-sm ${small ? "py-1" : "p-2"}`;
  const chartHeight = small ? 300 : 400;

  return (
      <div className="border-t pt-4 mt-8">
        <div className="grid grid-cols-7 gap-2 font-semibold text-sm mb-2">
          <div></div>
          <div>Name</div>
          <div>Type</div>
          <div>X-nodes</div>
          <div>Y-nodes</div>
          <div>Max Rate</div>
        </div>

        {[0, 1].map((idx) => (
            <div className="grid grid-cols-7 gap-2 items-center mb-1 text-sm" key={idx}>
              <div>Curve {idx + 1}</div>
              <select
                  className={inputClass}
                  value={curveInputs[idx]?.name || ""}
                  onChange={(e) => {
                    const selected = curvesList.find(c => c.name === e.target.value);
                    const updated = [...curveInputs];
                    updated[idx] = selected;
                    setCurveInputs(updated);
                  }}
              >
                {curvesList.map((c, i) => (
                    <option key={i} value={c.name}>{c.name}</option>
                ))}
              </select>
              <input className={inputClass} value={curveInputs[idx]?.type || ""} onChange={e => {
                const updated = [...curveInputs];
                updated[idx].type = e.target.value;
                setCurveInputs(updated);
              }} />
              <input className={inputClass} value={curveInputs[idx]?.x?.join(",") || ""} onChange={e => {
                const updated = [...curveInputs];
                updated[idx].x = e.target.value.split(',').map(Number);
                setCurveInputs(updated);
              }} />
              <input className={inputClass} value={curveInputs[idx]?.y?.join(",") || ""} onChange={e => {
                const updated = [...curveInputs];
                updated[idx].y = e.target.value.split(',').map(Number);
                setCurveInputs(updated);
              }} />
              <input className={inputClass} value={curveInputs[idx]?.max_rate || ""} onChange={e => {
                const updated = [...curveInputs];
                updated[idx].max_rate = parseFloat(e.target.value);
                setCurveInputs(updated);
              }} />
            </div>
        ))}

        <div className="flex items-center gap-4 mt-4 mb-2 text-sm">
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={handleDraw}>
            Draw Graph
          </button>
          <div className="w-full max-w-md">
            <Range
                step={0.01}
                min={MIN}
                max={MAX}
                values={range}
                onChange={(values) => {
                  if (values[0] <= values[1]) setRange(values);
                }}
                renderTrack={({ props, children }) => (
                    <div {...props} className="h-2 bg-gray-300 rounded" style={{ ...props.style }}>
                      {children}
                    </div>
                )}
                renderThumb={({ props }) => (
                    <div {...props} className="w-4 h-4 bg-blue-600 rounded-full shadow" />
                )}
            />
            <div className="flex justify-between text-xs mt-1">
              <span>{range[0].toFixed(2)}%</span>
              <span>{range[1].toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="mb-2 text-sm font-medium">X-axis: Utilization — Y-axis: Interest Rate</div>

        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[range[0], range[1]]} tickFormatter={(x) => `${x.toFixed(2)}%`} />
            <YAxis tickFormatter={(y) => `${y.toFixed(1)}%`} />
            <Tooltip formatter={(v) => `${v.toFixed(2)}%`} labelFormatter={(l) => `${l.toFixed(2)}% Utilization`} />
            <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '1rem' }} />
            {renderedCurves.map((curve, index) => (
                <Line
                    key={index}
                    type="monotone"
                    data={curve.data}
                    dataKey="y"
                    name={`${curve.label} (${curve.type})`}
                    stroke={curve.color}
                    dot={false}
                    strokeWidth={4}
                />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
  );
}

export default function InterestRateCurveApp() {
  const [curvesList, setCurvesList] = useState([]);

  useEffect(() => {
    fetch("/data/curves.json")
        .then(res => res.json())
        .then(data => {
          setCurvesList(data);
        });
  }, []);

  if (curvesList.length === 0) return <div className="p-4">Loading curves...</div>;

  return (
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Interest Rate Curve Visualizer</h1>
        <CurveEditor curvesList={curvesList} initialCurves={[curvesList[0], curvesList[1]]} />
        <CurveEditor curvesList={curvesList} initialCurves={[curvesList[2], curvesList[3]]} small />
      </div>
  );
}
