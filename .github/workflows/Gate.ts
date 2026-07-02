import type { Finding } from "./Finding.ts";
import type { BaselineComparison } from "./Baseline.ts";

export type GateMode = "strict" | "ratchet" | "report";

export type GateConfig = {
    mode: GateMode;
};

export type GateResult = {
    passed: boolean;
    blocking: Finding[];
    nonBlocking: Finding[];
    notes: string[];
};

export function applyGate(comparison: BaselineComparison, config: GateConfig): GateResult {
    const notes: string[] = [];

    // strict judges everything; ratchet and report only judge what is new
    // since the baseline — existing debt is known and being phased out.
    const evaluated =
        config.mode === "strict"
            ? [...comparison.newFindings, ...comparison.knownFindings]
            : comparison.newFindings;

    // Violations block the pipeline, warnings never do.
    const blocking =
        config.mode === "report" ? [] : evaluated.filter((f) => f.kind === "violation");
    const nonBlocking = evaluated.filter((f) => !blocking.includes(f));

    if (config.mode === "report") {
        notes.push("Gate is in report mode: findings are listed but never block the pipeline.");
    }

    if (comparison.baseline === null && config.mode !== "strict") {
        notes.push(
            comparison.newFindings.length > 0
                ? "No baseline found, so every finding counts as new. Snapshot the existing debt with: npm run baseline"
                : "No baseline found. Lock in the current clean state with: npm run baseline"
        );
    }

    return {
        passed: blocking.length === 0,
        blocking,
        nonBlocking,
        notes,
    };
}
