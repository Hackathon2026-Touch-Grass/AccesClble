type AxeNode = {
    target?: string[];
    html?: string;
    failureSummary?: string;
};

type AxeViolation = {
    id: string;
    impact?: string;
    description?: string;
    help?: string;
    helpUrl?: string;
    tags?: string[];
    nodes?: AxeNode[];
};

type AxeResults = {
    url?: string;
    violations?: AxeViolation[];
};

type FixHints = Record<string, string>;

type ChangedFile = {
    path: string;
    status: string;
    additions: string;
    deletions: string;
};

export default class AccessibilityJsonReport {
    public static axeCore(results: AxeResults, fixHints: FixHints): object {
        const violations = results.violations ?? [];

        return {
            report: "Axe-core feedback",
            url: results.url ?? null,
            passed: violations.length === 0,
            violationCount: violations.length,
            issues: violations.map((violation) => ({
                rule: violation.id,
                severity: violation.impact ?? "unknown",
                wcagCriteria: this.getWcagCriteria(violation.tags ?? []),
                feedback: violation.help ?? violation.description ?? "No feedback available.",
                description: violation.description ?? null,
                recommendedFix: fixHints[violation.id] ?? "Open the axe documentation link and apply the recommended accessible pattern.",
                documentation: violation.helpUrl ?? null,
                elements: (violation.nodes ?? []).map((node) => ({
                    target: node.target ?? [],
                    html: node.html ?? null,
                    failureSummary: node.failureSummary ?? null,
                })),
            })),
        };
    }

    public static axeCoreError(url: string, message: string): object {
        return {
            report: "Axe-core feedback",
            url,
            passed: false,
            violationCount: null,
            issues: [],
            error: message,
        };
    }

    public static commitDiff(
        baseCommit: string,
        targetCommit: string,
        changedFiles: ChangedFile[],
        fullDiff: string | null
    ): object {
        return {
            report: "Accessibility diff",
            comparedCommits: {
                base: baseCommit,
                target: targetCommit,
            },
            changedFileCount: changedFiles.length,
            changedFiles,
            fullDiffVisible: fullDiff !== null,
            fullDiff,
        };
    }

    public static print(report: object): void {
        console.log(JSON.stringify(report, null, 2));
    }

    private static getWcagCriteria(tags: string[]): string[] {
        return tags.filter((tag) => tag.startsWith("wcag"));
    }
}
