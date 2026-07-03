import type { Finding, FindingKind } from "./Finding.ts";

// WCAG A/AA failures that carry direct legal exposure (ADA, EAA, Section 508).
// These are always violations, whatever axe rates their impact.
const LEGAL_BLOCKER_RULES = new Set([
    "image-alt",
    "input-image-alt",
    "area-alt",
    "label",
    "select-name",
    "button-name",
    "link-name",
    "color-contrast",
    "html-has-lang",
    "html-lang-valid",
    "document-title",
    "frame-title",
    "meta-viewport",
    "bypass",
    "video-caption",
]);

// Axe impact levels that count as violations; everything below is a warning.
const VIOLATION_IMPACTS = new Set(["critical", "serious"]);

export function classify(rule: string, impact: unknown): FindingKind {
    if (LEGAL_BLOCKER_RULES.has(rule)) {
        return "violation";
    }

    return typeof impact === "string" && VIOLATION_IMPACTS.has(impact)
        ? "violation"
        : "warning";
}

export function sortByKind<T extends { kind: FindingKind }>(findings: T[]): T[] {
    return [...findings].sort((a, b) => {
        if (a.kind === b.kind) {
            return 0;
        }

        return a.kind === "violation" ? -1 : 1;
    });
}

export function countByKind(findings: { kind: FindingKind }[]): Record<FindingKind, number> {
    const counts: Record<FindingKind, number> = { violation: 0, warning: 0 };

    for (const finding of findings) {
        counts[finding.kind]++;
    }

    return counts;
}
