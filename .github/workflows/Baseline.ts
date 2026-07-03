import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Finding, FindingKind } from "./Finding.ts";
import { countByKind } from "./Classification.ts";

export type BaselineEntry = {
    fingerprint: string;
    check: string;
    rule: string;
    kind: FindingKind;
    location: string;
    message: string;
};

export type HistoryPoint = {
    at: string;
    action: "init" | "tighten" | "accept-new-debt";
    total: number;
    byKind: Record<FindingKind, number>;
};

export type Baseline = {
    version: 2;
    createdAt: string;
    updatedAt: string;
    entries: BaselineEntry[];
    history: HistoryPoint[];
};

export type BaselineComparison = {
    baseline: Baseline | null;
    newFindings: Finding[];
    knownFindings: Finding[];
    fixedEntries: BaselineEntry[];
};

export type BaselineUpdateResult = {
    baseline: Baseline;
    action: HistoryPoint["action"];
    added: Finding[];
    removed: BaselineEntry[];
    rejected: Finding[];
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

    if (baseline.version !== 2 || !Array.isArray(baseline.entries)) {
        throw new Error(`Unsupported baseline format in ${file}. Recreate it with: npm run baseline`);
    }

    return baseline;
}

export function compareToBaseline(
    findings: Finding[],
    baseline: Baseline | null
): BaselineComparison {
    if (baseline === null) {
        return {
            baseline,
            newFindings: findings,
            knownFindings: [],
            fixedEntries: [],
        };
    }

    const baselineFingerprints = new Set(baseline.entries.map((entry) => entry.fingerprint));
    const currentFingerprints = new Set(findings.map((finding) => finding.fingerprint));

    return {
        baseline,
        newFindings: findings.filter((f) => !baselineFingerprints.has(f.fingerprint)),
        knownFindings: findings.filter((f) => baselineFingerprints.has(f.fingerprint)),
        fixedEntries: baseline.entries.filter((entry) => !currentFingerprints.has(entry.fingerprint)),
    };
}

export function updateBaseline(
    file: string,
    findings: Finding[],
    acceptNewDebt: boolean
): BaselineUpdateResult {
    const previous = loadBaseline(file);
    const now = new Date().toISOString();

    let action: HistoryPoint["action"];
    let entries: BaselineEntry[];
    let added: Finding[];
    let removed: BaselineEntry[];
    let rejected: Finding[];

    if (previous === null) {
        // First adoption: snapshot all existing debt so the gate can ratchet from here.
        action = "init";
        entries = findings.map(toEntry);
        added = findings;
        removed = [];
        rejected = [];
    } else {
        const currentFingerprints = new Set(findings.map((f) => f.fingerprint));
        const previousFingerprints = new Set(previous.entries.map((e) => e.fingerprint));
        const kept = previous.entries.filter((e) => currentFingerprints.has(e.fingerprint));
        const newFindings = findings.filter((f) => !previousFingerprints.has(f.fingerprint));

        removed = previous.entries.filter((e) => !currentFingerprints.has(e.fingerprint));

        if (acceptNewDebt && newFindings.length > 0) {
            action = "accept-new-debt";
            entries = [...kept, ...newFindings.map(toEntry)];
            added = newFindings;
            rejected = [];
        } else {
            // The ratchet: debt can only shrink unless growth is explicitly accepted.
            action = "tighten";
            entries = kept;
            added = [];
            rejected = newFindings;
        }
    }

    entries.sort((a, b) =>
        `${a.check}|${a.rule}|${a.location}`.localeCompare(`${b.check}|${b.rule}|${b.location}`)
    );

    const baseline: Baseline = {
        version: 2,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        entries,
        history: [
            ...(previous?.history ?? []),
            {
                at: now,
                action,
                total: entries.length,
                byKind: countByKind(entries),
            },
        ].slice(-HISTORY_LIMIT),
    };

    writeFileSync(file, JSON.stringify(baseline, null, 2) + "\n");

    return { baseline, action, added, removed, rejected };
}

function toEntry(finding: Finding): BaselineEntry {
    return {
        fingerprint: finding.fingerprint,
        check: finding.check,
        rule: finding.rule,
        kind: finding.kind,
        location: finding.location,
        message: finding.message,
    };
}
