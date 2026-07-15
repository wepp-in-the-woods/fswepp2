import * as React from "react";

type InputSummaryProps = {
    runState: any;
    climateState: any;
};

export const InputSummary: React.FC<InputSummaryProps> = ({ runState, climateState }) => {
    const rows = [
        {
            label: "Climate",
            value: climateState?.par_id ? `Station ${climateState.par_id}` : "Not selected",
        },
        {
            label: "Soil texture",
            value: `${runState.soil_texture}, ${runState.rfg_pct}% rock fragments`,
        },
        {
            label: "Hillslope",
            value: `Top ${runState.top_slope_pct}%, Middle ${runState.middle_slope_pct}%, Bottom ${runState.bottom_slope_pct}%, Length ${runState.length_m} m`,
        },
        {
            label: "Vegetation",
            value: `${runState.vegetation_type} (${runState.burn_severity})`,
        },
    ];

    if (runState.vegetation_type !== "Forest") {
        rows.push({
            label: "Pre-fire community",
            value: `${runState.user_shrub_pct}% shrub, ${runState.user_grass_pct}% grass, ${runState.user_bare_pct}% bare`,
        });
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold">Inputs Summary</h3>
            <table className="w-full text-sm border border-border rounded-md table-fixed">
                <thead className="bg-muted text-left">
                <tr>
                    <th className="px-3 py-2">Input</th>
                    <th className="px-3 py-2">Value</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((row, index) => (
                    <tr key={index} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{row.label}</td>
                        <td className="px-3 py-2">{row.value}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};