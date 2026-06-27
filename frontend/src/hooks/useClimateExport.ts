import { useCallback } from 'react';
import { ClimateState } from '@/types/climate';
import { sanitizeFilename } from "@/utils/climate-utils";

export function useClimateExport() {
    const exportToJSON = useCallback(
        (state: ClimateState, customDescription: string, monthlies: { ppts?: number[]; tmaxs?: number[]; tmins?: number[] }) => {
            // Validate collected values
            const ppts = state.userDefinedParMod?.ppts ?? monthlies.ppts ?? [];
            const tmaxs = state.userDefinedParMod?.tmaxs ?? monthlies.tmaxs ?? [];
            const tmins = state.userDefinedParMod?.tmins ?? monthlies.tmins ?? [];

            if (!ppts.length || !tmaxs.length || !tmins.length) {
                console.warn('[climate-export] Invalid monthly data');
                return;
            }

            // Build export payload
            const exportPayload = {
                database: state.database,
                cligen_version: state.cligenVersion,
                location: state.location,
                par_id: state.parId,
                input_years: state.inputYears,
                use_prism: state.usePrism,
                user_defined_par_mod: {
                    description: customDescription.trim() || 'Custom Climate',
                    ppts,
                    tmaxs,
                    tmins,
                },
            };

            // Generate JSON string
            const json = JSON.stringify(exportPayload, null, 2);

            // Generate filename
            const filenameBase = sanitizeFilename(customDescription || state.parId || 'climate');
            const filename = `rockclim-${filenameBase || 'climate'}.json`;

            // Create blob and download
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();

            // Cleanup
            URL.revokeObjectURL(url);
        },
        []
    );

    return { exportToJSON };
}