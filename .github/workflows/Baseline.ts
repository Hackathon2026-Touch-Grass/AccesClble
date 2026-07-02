import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Severity, Violation } from "./Violation.ts";
import { countBySeverity } from "./Severity.ts";

export type BaselineEntry = {
    fingerprint: string;
    check: string;
    rule: string;
    severity: Severity;
    location: string;
    message: string;
};

export type HistoryPoint = {
    at: string;
    action: "init" | "tighten" | "accept-new-debt";
    total: number;
    bySeverity: Record<Severity, number>;
};

export type Baseline = {
    version: 1;
    createdAt: string;
    updatedAt: string;
    entries: BaselineEntry[];
    history: HistoryPoint[];
};

export type BaselineComparison = {
    baseline: Baseline | null;
    newViolations: Violation[];
    knownViolations: Violation[];
    fixedEntries: BaselineEntry[];
};

export type BaselineUpdateResult = {
    baseline: Baseline;
    action: HistoryPoint["action"];
    added: Violation[];
    removed: BaselineEntry[];
    rejected: Violation[];
};

const HISTORY_LIMIT = 100;

export function fingerprint(...parts: (string | number)[]): string {
    return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

export function loadBaseline(file: string): Baseline | null {
    if (!existsSync(file)) {
        return null;
    }

    const baseline = JSON.parse(readFileSync(file, "utf8")) as Baseline;

    if (baseline.version !== 1 || !Array.isArray(baseline.entries)) {
        throw new Error(`Unsupported baseline format in ${file}. Recreate it with: npm run baseline`);
    }

    return baseline;
}

export function compareToBaseline(
    violations: Violation[],
    baseline: Baseline | null
): BaselineComparison {
    if (baseline === null) {
        return {
            baseline,
            newViolations: violations,
            knownViolations: [],
            fixedEntries: [],
        };
    }

    const baselineFingerprints = new Set(baseline.entries.map((entry) => entry.fingerprint));
    const currentFingerprints = new Set(violations.map((violation) => violation.fingerprint));

    return {
        baseline,
        newViolations: violations.filter((v) => !baselineFingerprints.has(v.fingerprint)),
        knownViolations: violations.filter((v) => baselineFingerprints.has(v.fingerprint)),
        fixedEntries: baseline.entries.filter((entry) => !currentFingerprints.has(entry.fingerprint)),
    };
}

export function updateBaseline(
    file: string,
    violations: Violation[],
    acceptNewDebt: boolean
): BaselineUpdateResult {
    const previous = loadBaseline(file);
    const now = new Date().toISOString();

    let action: HistoryPoint["action"];
    let entries: BaselineEntry[];
    let added: Violation[];
    let removed: BaselineEntry[];
    let rejected: Violation[];

    if (previous === null) {
        // First adoption: snapshot all existing debt so the gate can ratchet from here.
        action = "init";
        entries = violations.map(toEntry);
        added = violations;
        removed = [];
        rejected = [];
    } else {
        const currentFingerprints = new Set(violations.map((v) => v.fingerprint));
        const previousFingerprints = new Set(previous.entries.map((e) => e.fingerprint));
        const kept = previous.entries.filter((e) => currentFingerprints.has(e.fingerprint));
        const newViolations = violations.filter((v) => !previousFingerprints.has(v.fingerprint));

        removed = previous.entries.filter((e) => !currentFingerprints.has(e.fingerprint));

        if (acceptNewDebt && newViolations.length > 0) {
            action = "accept-new-debt";
            entries = [...kept, ...newViolations.map(toEntry)];
            added = newViolations;
            rejected = [];
        } else {
            // The ratchet: debt can only shrink unless growth is explicitly accepted.
            action = "tighten";
            entries = kept;
            added = [];
            rejected = newViolations;
        }
    }

    entries.sort((a, b) =>
        `${a.check}|${a.rule}|${a.location}`.localeCompare(`${b.check}|${b.rule}|${b.location}`)
    );

    const baseline: Baseline = {
        version: 1,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        entries,
        history: [
            ...(previous?.history ?? []),
            {
                at: now,
                action,
                total: entries.length,
                bySeverity: countBySeverity(entries),
            },
        ].slice(-HISTORY_LIMIT),
    };

    writeFileSync(file, JSON.stringify(baseline, null, 2) + "\n");

    return { baseline, action, added, removed, rejected };
}

function toEntry(violation: Violation): BaselineEntry {
    return {
        fingerprint: violation.fingerprint,
        check: violation.check,
        rule: violation.rule,
        severity: violation.severity,
        location: violation.location,
        message: violation.message,
    };
}
