import type { Severity, Violation } from "./Violation.ts";

export type Category = "legal-blocker" | "ux-warning";

const SEVERITY_RANK: Record<Severity, number> = {
    minor: 0,
    moderate: 1,
    serious: 2,
    critical: 3,
};

export const SEVERITIES: Severity[] = ["critical", "serious", "moderate", "minor"];

// WCAG A/AA failures that carry direct legal exposure (ADA, EAA, Section 508).
// Anything else is treated as a UX warning unless its severity is critical.
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

export function severityRank(severity: Severity): number {
    return SEVERITY_RANK[severity];
}

export function meetsThreshold(severity: Severity, threshold: Severity): boolean {
    return severityRank(severity) >= severityRank(threshold);
}

export function isSeverity(value: unknown): value is Severity {
    return typeof value === "string" && value in SEVERITY_RANK;
}

export function normalizeSeverity(impact: unknown): Severity {
    return isSeverity(impact) ? impact : "moderate";
}

export function categorize(violation: Pick<Violation, "rule" | "severity">): Category {
    if (LEGAL_BLOCKER_RULES.has(violation.rule) || violation.severity === "critical") {
        return "legal-blocker";
    }

    return "ux-warning";
}

export function sortBySeverity<T extends { severity: Severity }>(violations: T[]): T[] {
    return [...violations].sort(
        (a, b) => severityRank(b.severity) - severityRank(a.severity)
    );
}

export function countBySeverity(violations: { severity: Severity }[]): Record<Severity, number> {
    const counts: Record<Severity, number> = {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
    };

    for (const violation of violations) {
        counts[violation.severity]++;
    }

    return counts;
}
