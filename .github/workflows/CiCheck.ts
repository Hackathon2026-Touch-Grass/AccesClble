import { writeFileSync } from "node:fs";
import process from "node:process";
import AltTextCheck from "./AltTextCheck.ts";
import AxeCoreCheck, { CheckExecutionError } from "./AxeCoreCheck.ts";
import {
    compareToBaseline,
    loadBaseline,
    updateBaseline,
    type BaselineComparison,
} from "./Baseline.ts";
import { loadConfig } from "./A11yConfig.ts";
import { applyGate, type GateResult } from "./Gate.ts";
import { countByKind, sortByKind } from "./Classification.ts";
import type { Finding } from "./Finding.ts";
import GitDiffCheck from "./GitDiffCheck.ts";
import PhpstanCheck from "./PhpstanCheck.ts";

const REPORT_FILE = "a11y-report.json";

const args = new Set(process.argv.slice(2));
const updateBaselineMode = args.has("--update-baseline");
const acceptNewDebt = args.has("--accept-new-debt");
const reportOnly = args.has("--report-only");
const config = loadConfig();
const errors: string[] = [];
const findings = collectFindings();

if (config.checks.phpstan.enabled && !new PhpstanCheck().check()) {
    errors.push("PHPStan");
}

if (updateBaselineMode) {
    const result = updateBaseline(config.baselineFile, findings, acceptNewDebt);

    console.log("\n=== Accessibility baseline ===");
    console.log(`Action: ${result.action}`);
    console.log(`Accepted findings: ${result.baseline.entries.length}`);
    console.log(`Added: ${result.added.length}`);
    console.log(`Removed: ${result.removed.length}`);

    if (result.rejected.length > 0) {
        console.log(`Rejected new findings: ${result.rejected.length}`);
        console.log("Use npm run baseline:accept-debt to accept new debt intentionally.");
        printList(result.rejected);
        process.exit(1);
    }

    process.exit(errors.length > 0 ? 1 : 0);
}

const comparison = compareToBaseline(findings, loadBaseline(config.baselineFile));
const gateConfig = reportOnly ? { ...config.gate, mode: "report" as const } : config.gate;
const gate = applyGate(comparison, gateConfig);

printReport(comparison, gate);
writeJsonReport(comparison, gate);

new GitDiffCheck(false).check();

if (!gate.passed) {
    errors.push("Accessibility gate");
}

if (errors.length > 0) {
    console.log(`\nCI failed. Failed tests: ${errors.join(", ")}.`);
    process.exit(1);
}

console.log("\nCI passed. All tests passed.");
process.exit(0);

function collectFindings(): Finding[] {
    const collectors: { name: string; collect: () => Finding[] }[] = [];

    if (config.checks.altText.enabled) {
        collectors.push({ name: "Alt Text", collect: () => new AltTextCheck().collect() });
    }

    if (config.checks.axeCore.enabled) {
        collectors.push({
            name: "axe-core (WCAG)",
            collect: () =>
                new AxeCoreCheck(
                    config.checks.axeCore.urls,
                    config.checks.axeCore.tags,
                    config.checks.axeCore.chromedriverPath
                ).collect(),
        });
    }

    return collectors.flatMap((collector) => {
        console.log(`\nCollecting: ${collector.name}`);

        try {
            const collected = collector.collect();
            console.log(`Result: ${collected.length} finding(s)`);

            return collected;
        } catch (error) {
            if (error instanceof CheckExecutionError) {
                console.log(`Result: Failed - ${error.message}`);
                errors.push(collector.name);

                return [];
            }

            throw error;
        }
    });
}

function printReport(comparison: BaselineComparison, gate: GateResult): void {
    const mode = reportOnly ? "report (forced by --report-only)" : config.gate.mode;
    const scanned = [...comparison.newFindings, ...comparison.knownFindings];

    console.log("\n=== Accessibility gate ===");
    console.log(`Mode: ${mode} | Violations block, warnings never do`);
    console.log(
        `This scan found: ${describeCounts(scanned)} ` +
            `- ${comparison.newFindings.length} new, ${comparison.knownFindings.length} known debt`
    );

    if (comparison.baseline !== null) {
        console.log(
            `Baseline (accepted debt): ${describeCounts(comparison.baseline.entries)} ` +
                `- last updated ${comparison.baseline.updatedAt}`
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
        console.log(`\nKnown debt, tolerated by the gate (${comparison.knownFindings.length}):`);
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

function describeCounts(findingsToCount: { kind: Finding["kind"] }[]): string {
    const counts = countByKind(findingsToCount);

    return `${findingsToCount.length} finding(s) (${counts.violation} violations, ${counts.warning} warnings)`;
}

function printList(
    findingsToPrint: { kind: Finding["kind"]; rule: string; location: string; message: string }[]
): void {
    for (const finding of sortByKind(findingsToPrint)) {
        console.log(`  [${finding.kind}] ${finding.rule} - ${finding.location}`);
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
