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
    const [utilizationPoints, setUtilizationPoints] = useState([]);

    useEffect(() => {
        fetch("/data/curves.json")
            .then(res => res.json())
            .then(data => {
                const withLabels = data.map(c => ({ ...c, label: `${c.name} ${c.token}` }));
                setCurvesList(withLabels);
                setCurve1(withLabels[0]);
                setCurve2(withLabels[1]);
            });
    }, []);

    useEffect(() => {
        if (curve1 && curve2) {
            const allX = [...curve1.x, ...curve2.x];
            const minX = Math.min(...allX);
            const upper = Math.round((minX * 1.0005 + Number.EPSILON) * 100) / 100;
            const lower = Math.round((upper * 0.7 + Number.EPSILON) * 100) / 100;
            setRange([lower, upper]);
        }
    }, [curve1, curve2]);

    useEffect(() => {
        if (curve1 && curve2) {
            handleDraw(); // only call when both are defined
        }
    }, [curve1, curve2, range]);


    const handleDraw = () => {
        const rendered = [];
        const xMarkers = [];

        [curve1, curve2].forEach((cfg, i) => {
            const colorBorrow = curveColors.borrow[i];
            const colorLend = curveColors.lend[i];
            const points = buildPoints(cfg);

            const [borrowBase, lend] = generateBorrowAndLend(points, range);
            const borrow = borrowBase.map(p => ({
                x: p.x,
                y: p.y * (1 + cfg.protocol_fee / 100)
            }));

            rendered.push(
                { label: `${cfg.name} (Borrow)`, data: borrow, color: colorBorrow, strokeWidth: lineWidths.borrow },
                { label: `${cfg.name} (Lend)`, data: lend, color: colorLend, strokeWidth: lineWidths.lend }
            );

            // Add utilization marker
            if (cfg.current_utilization !== undefined) {
                const yBase = interpolateAt(points, cfg.current_utilization);
                const yBorrow = yBase * (1 + cfg.protocol_fee / 100);
                xMarkers.push({ x: cfg.current_utilization, y: yBorrow });
            }
        });

        setRenderedCurves(rendered);
        setUtilizationPoints(xMarkers);
    };

    if (!curve1 || !curve2) return <div className="p-4">Loading...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Interest Rate Curve Visualizer</h1>

            <div className="grid grid-cols-8 gap-4 text-sm font-medium mb-2">
                <div>Name</div><div>X-nodes</div><div>Y-nodes</div><div>Max Rate</div>
                <div>Utilization</div><div>Base Rate</div><div>Fee %</div><div>Borrow Rate</div>
            </div>

            {[curve1, curve2].map((curve, idx) => {
                const points = buildPoints(curve);
                const baseRate = interpolateAt(points, curve.current_utilization);
                const borrowRate = baseRate * (1 + curve.protocol_fee / 100);
                return (
                    <div className="grid grid-cols-8 gap-4 items-center text-sm mb-2" key={idx}>

                        <select className="border p-2 rounded" value={`${curve.name} ${curve.token}`}
                                onChange={(e) => {
                                    const selected = curvesList.find(c => c.label === e.target.value);
                                    if (selected) {
                                        idx === 0 ? setCurve1({ ...selected }) : setCurve2({ ...selected });
                                    }
                                }}>
                            {curvesList.map((c, i) => (
                                <option key={i} value={c.label}>{c.label}</option>
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
                        <input type="number" className="border p-2 rounded" value={curve.max_rate}
                               onChange={(e) => {
                                   const newCurve = { ...curve, max_rate: parseFloat(e.target.value) };
                                   idx === 0 ? setCurve1(newCurve) : setCurve2(newCurve);
                               }} />
                        <div>{curve.current_utilization}%</div>
                        <div>{baseRate.toFixed(2)}%</div>
                        <div>{curve.protocol_fee}%</div>
                        <div>{borrowRate.toFixed(2)}%</div>
                    </div>
                );
            })}

            <div className="flex items-center gap-6 mt-4 mb-6 flex-wrap">
                <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleDraw}>
                    Draw Graph
                </button>
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
                            <YAxis tickFormatter={(y) => `${y.toFixed(1)}%`} />
                            <Tooltip formatter={(value) => `${value.toFixed(2)}%`} labelFormatter={(label) => `Utilization: ${label.toFixed(2)}%`} />
                            {renderedCurves.map((curve, index) => (
                                <Line key={index} type="monotone" data={curve.data} dataKey="y" name={curve.label}
                                      stroke={curve.color} dot={false} strokeWidth={curve.strokeWidth} />
                            ))}
                            <Scatter data={utilizationPoints} shape="cross" fill="black" />
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
