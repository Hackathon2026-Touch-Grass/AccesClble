import { writeFileSync } from "node:fs";
import process from "node:process";
import type { Finding } from "./Finding.ts";
import AltTextCheck from "./AltTextCheck.ts";
import AxeCoreCheck, { CheckExecutionError } from "./AxeCoreCheck.ts";
import PhpstanCheck from "./PhpstanCheck.ts";
import { loadConfig } from "./A11yConfig.ts";
import { compareToBaseline, loadBaseline, updateBaseline } from "./Baseline.ts";
import type { BaselineComparison } from "./Baseline.ts";
import { applyGate } from "./Gate.ts";
import type { GateResult } from "./Gate.ts";
import { countByKind, sortByKind } from "./Classification.ts";

const REPORT_FILE = "a11y-report.json";

const args = new Set(process.argv.slice(2));
const updateBaselineMode = args.has("--update-baseline");
const acceptNewDebt = args.has("--accept-new-debt");
const reportOnly = args.has("--report-only");

const config = loadConfig();

const findings = collectFindings();

if (updateBaselineMode) {
    process.exit(runBaselineUpdate(findings));
}

process.exit(runGatedCheck(findings));

function collectFindings(): Finding[] {
    const findings: Finding[] = [];

    if (config.checks.altText.enabled) {
        findings.push(...new AltTextCheck().collect());
    }

    if (config.checks.axeCore.enabled) {
        const axe = new AxeCoreCheck(
            config.checks.axeCore.urls,
            config.checks.axeCore.tags,
            config.checks.axeCore.chromedriverPath
        );

        try {
            findings.push(...axe.collect());
        } catch (error) {
            if (!(error instanceof CheckExecutionError)) {
                throw error;
            }

            console.error(`\n${error.message}`);
            console.error("The gate cannot judge what it cannot measure, so this run fails.");
            process.exit(1);
        }
    }

    return findings;
}

function runBaselineUpdate(findings: Finding[]): number {
    const result = updateBaseline(config.baselineFile, findings, acceptNewDebt);

    console.log(`\n=== Accessibility baseline: ${result.action} ===`);
    console.log(`Baseline file: ${config.baselineFile}`);
    console.log(`Known debt locked in: ${describeCounts(result.baseline.entries)}`);

    if (result.removed.length > 0) {
        console.log(`\nFixed and removed from the baseline (${result.removed.length}):`);
        printList(result.removed);
    }

    if (result.added.length > 0 && result.action !== "init") {
        console.log(`\nNewly accepted as debt (${result.added.length}):`);
        printList(result.added);
    }

    if (result.rejected.length > 0) {
        console.log(`\nNOT added to the baseline (${result.rejected.length}):`);
        printList(result.rejected);
        console.log(
            "\nThe baseline only shrinks by default. Fix these findings, or accept them" +
                "\nexplicitly with: npm run baseline:accept-debt"
        );
        return 1;
    }

    return 0;
}

function runGatedCheck(findings: Finding[]): number {
    const baseline = loadBaseline(config.baselineFile);
    const comparison = compareToBaseline(findings, baseline);
    const gate = applyGate(
        comparison,
        reportOnly ? { ...config.gate, mode: "report" } : config.gate
    );

    printReport(comparison, gate);
    writeJsonReport(comparison, gate);

    const phpstanPassed = config.checks.phpstan.enabled ? new PhpstanCheck().check() : true;

    if (!gate.passed || !phpstanPassed) {
        const failed = [
            ...(gate.passed ? [] : ["accessibility gate"]),
            ...(phpstanPassed ? [] : ["PHPStan"]),
        ];
        console.log(`\nCI failed: ${failed.join(", ")}.`);
        return 1;
    }

    console.log("\nCI passed.");
    return 0;
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
