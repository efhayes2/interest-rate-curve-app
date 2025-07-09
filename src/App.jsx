import React, { useEffect, useState } from "react";
import { Range } from "react-range";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter
} from "recharts";
import { interpolateAt } from "./utils";
import { buildPoints, generateBorrowAndLend } from "./curveUtils";

const curveColors = {
    borrow: ["#174c8c", "#2ca02c"],
    lend: ["#ff7f0e", "#d62728"],
};
const lineWidths = { borrow: 2, lend: 2 };
const MIN = 0;
const MAX = 100;

export default function InterestRateCurveApp() {
    const [curvesList, setCurvesList] = useState([]);
    const [curve1, setCurve1] = useState(null);
    const [curve2, setCurve2] = useState(null);
    const [range, setRange] = useState([40, 100]);
    const [renderedCurves, setRenderedCurves] = useState([]);
    const [markers, setMarkers] = useState([]);

    useEffect(() => {
        fetch("/data/curves.json")
            .then(res => res.json())
            .then(data => {
                setCurvesList(data);
                setCurve1(data[0]);
                setCurve2(data[1]);
            });
    }, []);

    useEffect(() => {
        if (curve1 && curve2) {
            const allX = [...curve1.x, ...curve2.x];
            const minX = Math.min(...allX);
            const lower = Math.round((minX * 0.65 + Number.EPSILON) * 100) / 100;
            setRange([lower, minX]);
        }
    }, [curve1, curve2]);

    const handleDraw = () => {
        const rendered = [];
        const newMarkers = [];

        [curve1, curve2].forEach((cfg, i) => {
            const colorBorrow = curveColors.borrow[i];
            const colorLend = curveColors.lend[i];
            const points = buildPoints(cfg);
            const [borrow, lend] = generateBorrowAndLend(points, range);

            rendered.push(
                { label: `${cfg.name} (Borrow)`, data: borrow, color: colorBorrow, strokeWidth: lineWidths.borrow },
                { label: `${cfg.name} (Lend)`, data: lend, color: colorLend, strokeWidth: lineWidths.lend }
            );

            if (cfg.current_utilization !== undefined) {
                const x = cfg.current_utilization;
                const y = interpolateAt(borrow, x);
                newMarkers.push({ x, y });
            }
        });

        setRenderedCurves(rendered);
        setMarkers(newMarkers);
    };

    if (!curve1 || !curve2) return <div className="p-4">Loading...</div>;

    const lendAtLowerX = renderedCurves
        .filter(c => c.label.includes("Lend") && c.data.length > 0)
        .map(c => {
            const before = c.data.filter(p => p.x <= range[0]).at(-1);
            const after = c.data.find(p => p.x >= range[0]);
            if (before && after && before.x !== after.x) {
                const x0 = before.x, y0 = before.y;
                const x1 = after.x, y1 = after.y;
                const slope = (y1 - y0) / (x1 - x0);
                return y0 + slope * (range[0] - x0);
            }
            return before?.y || 0;
        });

    const lendYMin = Math.max(0, Math.min(...lendAtLowerX) - 1);

    return (
        <div className="max-w-7xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Interest Rate Curve Visualizer</h1>

            <div className="grid grid-cols-6 gap-4 text-sm font-medium mb-2">
                <div>Curve</div><div>Name</div><div>X-nodes</div><div>Y-nodes</div><div>Max Rate</div><div>Utilization</div>
            </div>

            {[curve1, curve2].map((curve, idx) => (
                <div className="grid grid-cols-6 gap-4 items-center text-sm mb-2" key={idx}>
                    <div>Curve {idx + 1}</div>
                    <select className="border p-2 rounded" value={curve.name} onChange={(e) => {
                        const selected = curvesList.find(c => c.name === e.target.value);
                        idx === 0 ? setCurve1({ ...selected }) : setCurve2({ ...selected });
                    }}>
                        {curvesList.map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                    <input className="border p-2 rounded" value={curve.x.join(",")} onChange={(e) => {
                        const newCurve = { ...curve, x: e.target.value.split(",").map(Number) };
                        idx === 0 ? setCurve1(newCurve) : setCurve2(newCurve);
                    }} />
                    <input className="border p-2 rounded" value={curve.y.join(",")} onChange={(e) => {
                        const newCurve = { ...curve, y: e.target.value.split(",").map(Number) };
                        idx === 0 ? setCurve1(newCurve) : setCurve2(newCurve);
                    }} />
                    <input type="number" className="border p-2 rounded" value={curve.max_rate} onChange={(e) => {
                        const newCurve = { ...curve, max_rate: parseFloat(e.target.value) };
                        idx === 0 ? setCurve1(newCurve) : setCurve2(newCurve);
                    }} />
                    {curve.current_utilization ?? "—"}%
                </div>
            ))}

            <div className="flex items-center gap-6 mt-4 mb-6 flex-wrap">
                <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleDraw}>Draw Graph</button>
                <div className="flex items-center gap-2 text-sm">
                    <label>Lower Limit:</label>
                    <input inputMode="decimal" pattern="[0-9.]*" className="border p-1 w-20 rounded" value={range[0]}
                           onChange={(e) => {
                               const val = parseFloat(e.target.value);
                               if (!isNaN(val) && val <= range[1]) setRange([val, range[1]]);
                           }} />
                    <label>Upper Limit:</label>
                    <input inputMode="decimal" pattern="[0-9.]*" className="border p-1 w-20 rounded" value={range[1]}
                           onChange={(e) => {
                               const val = parseFloat(e.target.value);
                               if (!isNaN(val) && val >= range[0]) setRange([range[0], val]);
                           }} />
                </div>
            </div>

            <div className="w-full max-w-md mb-4">
                <Range step={0.01} min={MIN} max={MAX} values={range} onChange={(values) => {
                    if (values[0] <= values[1]) setRange(values);
                }} renderTrack={({ props, children }) => (
                    <div {...props} className="h-2 bg-gray-300 rounded">{children}</div>
                )} renderThumb={({ props }) => (
                    <div {...props} className="w-4 h-4 bg-blue-600 rounded-full shadow" />
                )} />
                <div className="flex justify-between text-xs mt-1">
                    <span>{range[0].toFixed(2)}%</span>
                    <span>{range[1].toFixed(2)}%</span>
                </div>
            </div>

            <div className="flex">
                <div className="flex-grow">
                    <ResponsiveContainer width="100%" height={600}>
                        <LineChart>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" type="number" domain={[range[0], range[1]]} tickFormatter={(x) => `${x.toFixed(1)}%`} />
                            <YAxis tickFormatter={(y) => `${y.toFixed(1)}%`} domain={[lendYMin, 'auto']} />
                            <Tooltip formatter={(value) => `${value.toFixed(2)}%`} labelFormatter={(label) => `Utilization: ${label.toFixed(2)}%`} />
                            {renderedCurves.map((curve, index) => (
                                <Line key={index} type="monotone" data={curve.data} dataKey="y" name={curve.label}
                                      stroke={curve.color} dot={false} strokeWidth={curve.strokeWidth} />
                            ))}
                            {markers.length > 0 && (
                                <Scatter data={markers} shape={({ cx, cy }) => (
                                    <text x={cx} y={cy} fill="black" fontSize="16" textAnchor="middle" alignmentBaseline="middle">×</text>
                                )} />
                            )}

                            {renderedCurves.filter(c => c.label.includes("Borrow")).map((c, i) => {
                                const curve = i === 0 ? curve1 : curve2;
                                const points = buildPoints(curve);
                                const utilization = curve.current_utilization;
                                const y = interpolateAt(points, utilization);
                                return (
                                    <Scatter
                                        key={`marker-${i}`}
                                        data={[{ x: utilization, y }]}
                                        fill="black"
                                        shape="cross"
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="w-48 pl-4 flex flex-col justify-between text-sm">
                    <div>
                        <h4 className="font-semibold mb-1">Borrow Curves</h4>
                        <ul>
                            {renderedCurves.filter(c => c.label.includes("Borrow")).map((c, i) => (
                                <li key={i} className="flex items-center gap-2 mb-1">
                                    <span className="inline-block w-4 h-1" style={{ backgroundColor: c.color }}></span>
                                    {c.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mt-4 mb-1">Lend Curves</h4>
                        <ul>
                            {renderedCurves.filter(c => c.label.includes("Lend")).map((c, i) => (
                                <li key={i} className="flex items-center gap-2 mb-1">
                                    <span className="inline-block w-4 h-1" style={{ backgroundColor: c.color }}></span>
                                    {c.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
