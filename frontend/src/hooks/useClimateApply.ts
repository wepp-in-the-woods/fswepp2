import {useCallback} from 'react';
import {ClimateState} from '@/types/climate';
import {writeClimateState} from '@/utils/climate-utils';

export function useClimateApply() {
    const applyChanges = useCallback(
        (
            currentState: ClimateState,
            customDescription: string,
            monthlies: { ppts?: number[]; tmaxs?: number[]; tmins?: number[] }
        ): ClimateState | null => {
            // Validate monthly data
            const ppts = monthlies.ppts ?? [];
            const tmaxs = monthlies.tmaxs ?? [];
            const tmins = monthlies.tmins ?? [];

            if (ppts.length === 0 || tmaxs.length === 0 || tmins.length === 0) {
                console.warn('[climate-apply] Missing monthly data');
                return null;
            }

            // Validate all values are finite
            const isValid = (values: number[]) =>
                values.length === 12 && values.every((v) => Number.isFinite(v));

            if (!isValid(ppts) || !isValid(tmaxs) || !isValid(tmins)) {
                console.warn('[climate-apply] Invalid monthly values detected');
                return null;
            }

            // Update climate state with custom modifications
            const updatedState: ClimateState = {
                ...currentState,
                userDefinedParMod: {
                    description: customDescription.trim() || 'Custom Climate',
                    ppts,
                    tmaxs,
                    tmins,
                },
            };

            // Persist the state
            return writeClimateState(updatedState);
        },
        []
    );

    return { applyChanges };
}