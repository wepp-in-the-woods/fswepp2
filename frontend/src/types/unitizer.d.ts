export {};

declare global {
    interface Window {
        UnitizerClient?: {
            ready?: () => Promise<UnitizerClient>;
            getClientSync?: () => UnitizerClient | undefined;
            renderValue?: (value: unknown, unitKey: string, options?: UnitizerFormatOptions) => string;
            renderUnits?: (unitKey: string, options?: UnitizerFormatOptions) => string;
        };
    }
}

export interface UnitizerFormatOptions {
    precision?: number;
}

export interface UnitizerClient {
    getPreferencePayload: () => Record<string, string>;
    setGlobalPreference: (index: number) => void;
    setPreference?: (category: string, unitKey: string) => void;
    registerNumericInputs: (root: ParentNode) => void;
    updateNumericFields: (root: ParentNode) => void;
    updateUnitLabels: (root: ParentNode) => void;
    dispatchPreferenceChange: () => void;
    renderValue: (value: unknown, unitKey: string, options?: UnitizerFormatOptions) => string;
    renderUnits: (unitKey: string, options?: UnitizerFormatOptions) => string;
}