import * as React from "react";

type AnnualAveragesTableProps = {
    annual: any;
    years: number;
};

export const AnnualAveragesTable: React.FC<AnnualAveragesTableProps> = ({ annual, years }) => {
    if (!annual) return null;

    const rows = [
        {
            value: annual.precip_mm?.toFixed(0) || "—",
            unit: "mm",
            text: "annual precipitation from",
            count: annual.storms,
            countLabel: "storms",
        },
        {
            value: annual.runoff_from_rain_mm?.toFixed(0) || "—",
            unit: "mm",
            text: "annual runoff from rainfall from",
            count: annual.rainevents,
            countLabel: "events",
        },
        {
            value: annual.runoff_from_snow_mm?.toFixed(0) || "—",
            unit: "mm",
            text: "annual runoff from snowmelt or winter rainstorm from",
            count: annual.snowevents,
            countLabel: "events",
        },
    ];

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold">
                Average Annual Totals for {years} Years
            </h3>
            <table className="w-full text-sm border border-border rounded-md table-fixed">
                <thead className="bg-muted text-left">
                <tr>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Count</th>
                    <th className="px-3 py-2">Type</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, index) => (
                    <tr key={index} className="border-t border-border">
                        <td className="px-3 py-2 text-right font-medium">{row.value}</td>
                        <td className="px-3 py-2">{row.unit}</td>
                        <td className="px-3 py-2">{row.text}</td>
                        <td className="px-3 py-2 text-right">{row.count ?? ""}</td>
                        <td className="px-3 py-2">{row.countLabel ?? ""}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};