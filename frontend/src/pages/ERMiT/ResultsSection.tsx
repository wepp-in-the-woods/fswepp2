import * as React from "react";

type ResultsSectionProps = {
    results: any; // TODO: Define proper type
    visible: boolean;
};

export const ResultsSection: React.FC<ResultsSectionProps> = ({ results, visible }) => {
    if (!visible) return null;

    return (
        <section
            id="ermit-results"
            className="rounded-lg border border-border bg-card p-6 space-y-4"
        >
            <h2 className="text-base font-semibold">Results</h2>
            <div className="space-y-6">
                {/* Results content */}
                <p className="text-sm text-muted-foreground">Results will be displayed here after running the model.</p>
            </div>
        </section>
    );
};