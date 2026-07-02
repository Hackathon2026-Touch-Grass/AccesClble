import type { Severity, Violation } from "./Violation.ts";
import type { BaselineComparison } from "./Baseline.ts";
import { categorize, meetsThreshold } from "./Severity.ts";

export type GateMode = "strict" | "ratchet" | "report";

export type GateConfig = {
    mode: GateMode;
    failOn: Severity;
    blockLegalViolations: boolean;
};

export type GateResult = {
    passed: boolean;
    blocking: Violation[];
    warnings: Violation[];
    notes: string[];
};

export function applyGate(comparison: BaselineComparison, config: GateConfig): GateResult {
    const notes: string[] = [];

    // strict judges everything; ratchet and report only judge what is new
    // since the baseline — existing debt is known and being phased out.
    const evaluated =
        config.mode === "strict"
            ? [...comparison.newViolations, ...comparison.knownViolations]
            : comparison.newViolations;

    const blocks = (violation: Violation): boolean => {
        if (config.blockLegalViolations && categorize(violation) === "legal-blocker") {
            return true;
        }

        return meetsThreshold(violation.severity, config.failOn);
    };

    const blocking = config.mode === "report" ? [] : evaluated.filter(blocks);
    const warnings = evaluated.filter((violation) => !blocking.includes(violation));

    if (config.mode === "report") {
        notes.push("Gate is in report mode: violations are listed but never block the pipeline.");
    }

    if (comparison.baseline === null && config.mode !== "strict") {
        notes.push(
            comparison.newViolations.length > 0
                ? "No baseline found, so every violation counts as new. Snapshot the existing debt with: npm run baseline"
                : "No baseline found. Lock in the current clean state with: npm run baseline"
        );
    }

    return {
        passed: blocking.length === 0,
        blocking,
        warnings,
        notes,
    };
}
