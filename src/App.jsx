import React, { useEffect, useState } from "react";
import { Range } from "react-range";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { buildPoints, generateBorrowAndLend } from "./curveUtils";

// === Configurable Appearance ===
const curveColors = ["#0000FF", "#008000"]; // Blue, Green
const lineWidths = { borrow: 2.5, lend: 1.5 };
const legendThickness = 0.75; // Relative thickness for legend font weight

const MIN = 0;
const MAX = 100;

export default function InterestRateCurveApp() {
    const [curvesList, setCurvesList] = useState([]);
    const [curve1, setCurve1] = useState(null);
    const [curve2, setCurve2] = useState(null);
    const [range, setRange] = useState([40, 100]);
    const [renderedCurves, setRenderedCurves] = useState([]);

    useEffect(() => {
        fetch("/public/data/curves.json")
            .then(res => res.json())
            .then(data => {
                setCurvesList(data);
                setCurve1(data[0]);
                setCurve2(data[1]);
            });
    }, []);

    const handleDraw = () => {
        const rendered = [];

        [curve1, curve2].forEach((cfg, i) => {
            const color = curveColors[i];
            const points = buildPoints(cfg);
            const [borrow, lend] = generateBorrowAndLend(points, range);

            rendered.push(
                {
                    label: `${cfg.name} (Borrow)`,
                    data: borrow,
                    color,
                    strokeWidth: lineWidths.borrow
                },
                {
                    label: `${cfg.name} (Lend)`,
                    data: lend,
                    color,
                    strokeWidth: lineWidths.lend
                }
            );
        });

        setRenderedCurves(rendered);
    };

    if (!curve1 || !curve2) return <div className="p-4">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Interest Rate Curve Visualizer</h1>

            <div className="grid grid-cols-6 gap-4 text-sm font-medium mb-2">
                <div>Curve</div>
                <div>Name</div>
                <div>X-nodes</div>
                <div>Y-nodes</div>
                <div>Max Rate</div>
                <div>Type</div>
            </div>

            {[curve1, curve2].map((curve, idx) => (
                <div className="grid grid-cols-6 gap-4 items-center text-sm mb-2" key={idx}>
                    <div>Curve {idx + 1}</div>
                    <select
                        className="border p-2 rounded"
                        value={curve.name}
                        onChange={(e) => {
                            const selected = curvesList.find(c => c.name === e.target.value);
                            idx === 0 ? setCurve1({ ...selected }) : setCurve2({ ...selected });
                        }}
                    >
                        {curvesList.map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                    <input
                        className="border p-2 rounded"
                        value={curve.x.join(",")}
                        onChange={(e) => {
                            const newCurve = { ...curve, x: e.target.value.split(",").map(Number) };
                            idx === 0 ? setCurve1(newCurve) : setCurve2(newCurve);
                        }}
                    />
                    <input
                        className="border p-2 rounded"
                        value={curve.y.join(",")}
                        onChange={(e) => {
                            const newCurve = { ...curve, y: e.target.value.split(",").map(Number) };
                            idx === 0 ? setCurve1(newCurve) : setCurve2(newCurve);
                        }}
                    />
                    <input
                        type="number"
                        className="border p-2 rounded"
                        value={curve.max_rate}
                        onChange={(e) => {
                            const newCurve = { ...curve, max_rate: parseFloat(e.target.value) };
                            idx === 0 ? setCurve1(newCurve) : setCurve2(newCurve);
                        }}
                    />
                    <div>Borrow</div>
                </div>
            ))}

            <div className="flex items-center gap-6 mt-4 mb-6 flex-wrap">
                <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleDraw}>
                    Draw Graph
                </button>

                <div className="flex items-center gap-2 text-sm">
                    <label>Lower Limit:</label>
                    <input
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        className="border p-1 w-20 rounded"
                        value={range[0]}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val <= range[1]) setRange([val, range[1]]);
                        }}
                    />

                    <label>Upper Limit:</label>
                    <input
                        inputMode="decimal"
                        pattern="[0-9.]*"
                        className="border p-1 w-20 rounded"
                        value={range[1]}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= range[0]) setRange([range[0], val]);
                        }}
                    />
                </div>
            </div>

            <div className="w-full max-w-md mb-4">
                <Range
                    step={0.01}
                    min={MIN}
                    max={MAX}
                    values={range}
                    onChange={(values) => {
                        if (values[0] <= values[1]) setRange(values);
                    }}
                    renderTrack={({ props, children }) => (
                        <div {...props} className="h-2 bg-gray-300 rounded">{children}</div>
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

            <div className="mb-2 text-sm font-medium">X-axis: Utilization — Y-axis: Interest Rate</div>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="x"
                        type="number"
                        domain={[range[0], range[1]]}
                        tickFormatter={(x) => `${x.toFixed(2)}%`}
                    />
                    <YAxis tickFormatter={(y) => `${y.toFixed(1)}%`} />
                    <Tooltip
                        formatter={(value) => `${value.toFixed(2)}%`}
                        labelFormatter={(label) => `Utilization: ${label.toFixed(2)}%`}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{
                            fontWeight: `${legendThickness * 800}`, // reduced font weight
                            fontSize: '1rem',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.5rem'
                        }}
                    />
                    {renderedCurves.map((curve, index) => (
                        <Line
                            key={index}
                            type="monotone"
                            data={curve.data}
                            dataKey="y"
                            name={curve.label}
                            stroke={curve.color}
                            dot={false}
                            strokeWidth={curve.strokeWidth}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
