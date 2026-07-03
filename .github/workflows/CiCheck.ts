import { writeFileSync } from "node:fs";
import process from "node:process";
import type { Finding } from "./Finding.ts";
import AltTextCheck from "./AltTextCheck.ts";
import AxeCoreCheck, { CheckExecutionError } from "./AxeCoreCheck.ts";
import PhpstanCheck from "./PhpstanCheck.ts";
import AxeCoreCheck from "./AxeCoreCheck.ts";
import GitDiffCheck from "./GitDiffCheck.ts";

const REPORT_FILE = "a11y-report.json";

const args = new Set(process.argv.slice(2));
const updateBaselineMode = args.has("--update-baseline");
const acceptNewDebt = args.has("--accept-new-debt");
const reportOnly = args.has("--report-only");

const reports = [
    { name: "Accessibility Diff", report: new GitDiffCheck(false) },
];

for (const ciCheck of checks) {
    if (!ciCheck.check.check()) {
        errors.push(ciCheck.name);
    }

    return 0;
}

for (const ciReport of reports) {
    ciReport.report.check();
}

if (errors.length > 0) {
    console.log(`\nCI failed. Failed tests: ${errors.join(", ")}.`);
    process.exit(1);
}

function printReport(comparison: BaselineComparison, gate: GateResult): void {
    const mode = reportOnly ? "report (forced by --report-only)" : config.gate.mode;

    const scanned = [...comparison.newFindings, ...comparison.knownFindings];

    console.log("\n=== Accessibility gate ===");
    console.log(`Mode: ${mode} | Violations block, warnings never do`);
    console.log(
        `This scan found: ${describeCounts(scanned)} ` +
            `— ${comparison.newFindings.length} new, ${comparison.knownFindings.length} known debt`
    );

    if (comparison.baseline !== null) {
        console.log(
            `Baseline (accepted debt): ${describeCounts(comparison.baseline.entries)} ` +
                `— last updated ${comparison.baseline.updatedAt}`
        );
    }

    for (const note of gate.notes) {
        console.log(`Note: ${note}`);
    }

    if (gate.blocking.length > 0) {
        console.log(`\nNew violations, blocking (${gate.blocking.length}):`);
        printList(gate.blocking);
    }

    if (gate.nonBlocking.length > 0) {
        console.log(`\nNew warnings, not blocking (${gate.nonBlocking.length}):`);
        printList(gate.nonBlocking);
    }

    if (comparison.knownFindings.length > 0 && config.gate.mode !== "strict") {
        console.log(
            `\nKnown debt, tolerated by the gate (${comparison.knownFindings.length}):`
        );
        printList(comparison.knownFindings);
    }

    if (comparison.fixedEntries.length > 0) {
        console.log(`\nFixed since the baseline (${comparison.fixedEntries.length}):`);
        printList(comparison.fixedEntries);
        console.log("Lock in these improvements with: npm run baseline");
    }

    if (
        gate.blocking.length === 0 &&
        gate.nonBlocking.length === 0 &&
        comparison.knownFindings.length === 0
    ) {
        console.log("\nNo accessibility findings.");
    }

    console.log(`\nAccessibility gate: ${gate.passed ? "PASSED" : "FAILED"}`);
}

function describeCounts(findings: { kind: Finding["kind"] }[]): string {
    const counts = countByKind(findings);
    return `${findings.length} finding(s) (${counts.violation} violations, ${counts.warning} warnings)`;
}

function printList(
    findings: { kind: Finding["kind"]; rule: string; location: string; message: string }[]
): void {
    for (const finding of sortByKind(findings)) {
        console.log(`  [${finding.kind}] ${finding.rule} — ${finding.location}`);
        console.log(`      ${finding.message}`);
    }
}

function writeJsonReport(comparison: BaselineComparison, gate: GateResult): void {
    writeFileSync(
        REPORT_FILE,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                gate: {
                    mode: reportOnly ? "report" : config.gate.mode,
                    passed: gate.passed,
                },
                summary: {
                    total: comparison.newFindings.length + comparison.knownFindings.length,
                    new: comparison.newFindings.length,
                    knownDebt: comparison.knownFindings.length,
                    fixedSinceBaseline: comparison.fixedEntries.length,
                    byKind: countByKind([
                        ...comparison.newFindings,
                        ...comparison.knownFindings,
                    ]),
                },
                blocking: gate.blocking,
                warnings: gate.nonBlocking,
                knownDebt: comparison.knownFindings,
                fixedSinceBaseline: comparison.fixedEntries,
                baselineHistory: comparison.baseline?.history ?? [],
            },
            null,
            2
        ) + "\n"
    );
}
