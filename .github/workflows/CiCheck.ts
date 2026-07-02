import { writeFileSync } from "node:fs";
import process from "node:process";
import type { Violation } from "./Violation.ts";
import AltTextCheck from "./AltTextCheck.ts";
import AxeCoreCheck, { CheckExecutionError } from "./AxeCoreCheck.ts";
import PhpstanCheck from "./PhpstanCheck.ts";
import { loadConfig } from "./A11yConfig.ts";
import { compareToBaseline, loadBaseline, updateBaseline } from "./Baseline.ts";
import type { BaselineComparison } from "./Baseline.ts";
import { applyGate } from "./Gate.ts";
import type { GateResult } from "./Gate.ts";
import { categorize, countBySeverity, sortBySeverity } from "./Severity.ts";

const REPORT_FILE = "a11y-report.json";

const args = new Set(process.argv.slice(2));
const updateBaselineMode = args.has("--update-baseline");
const acceptNewDebt = args.has("--accept-new-debt");
const reportOnly = args.has("--report-only");

const config = loadConfig();

const violations = collectViolations();

if (updateBaselineMode) {
    process.exit(runBaselineUpdate(violations));
}

process.exit(runGatedCheck(violations));

function collectViolations(): Violation[] {
    const violations: Violation[] = [];

    if (config.checks.altText.enabled) {
        violations.push(...new AltTextCheck().collect());
    }

    if (config.checks.axeCore.enabled) {
        const axe = new AxeCoreCheck(
            config.checks.axeCore.urls,
            config.checks.axeCore.tags,
            config.checks.axeCore.chromedriverPath
        );

        try {
            violations.push(...axe.collect());
        } catch (error) {
            if (!(error instanceof CheckExecutionError)) {
                throw error;
            }

            console.error(`\n${error.message}`);
            console.error("The gate cannot judge what it cannot measure, so this run fails.");
            process.exit(1);
        }
    }

    return violations;
}

function runBaselineUpdate(violations: Violation[]): number {
    const result = updateBaseline(config.baselineFile, violations, acceptNewDebt);

    console.log(`\n=== Accessibility baseline: ${result.action} ===`);
    console.log(`Baseline file: ${config.baselineFile}`);
    console.log(`Known debt locked in: ${result.baseline.entries.length} violation(s)`);

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
            "\nThe baseline only shrinks by default. Fix these violations, or accept them" +
                "\nexplicitly with: npm run baseline:accept-debt"
        );
        return 1;
    }

    return 0;
}

function runGatedCheck(violations: Violation[]): number {
    const baseline = loadBaseline(config.baselineFile);
    const comparison = compareToBaseline(violations, baseline);
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

    console.log("\n=== Accessibility gate ===");
    console.log(
        `Mode: ${mode} | Blocks on: ${config.gate.failOn} and up` +
            `${config.gate.blockLegalViolations ? " + all legal blockers" : ""}`
    );

    if (comparison.baseline !== null) {
        const counts = countBySeverity(comparison.baseline.entries);
        console.log(
            `Baseline: ${comparison.baseline.entries.length} known violation(s) ` +
                `(critical: ${counts.critical}, serious: ${counts.serious}, ` +
                `moderate: ${counts.moderate}, minor: ${counts.minor}) ` +
                `— last updated ${comparison.baseline.updatedAt}`
        );
    }

    for (const note of gate.notes) {
        console.log(`Note: ${note}`);
    }

    if (gate.blocking.length > 0) {
        console.log(`\nBlocking violations (${gate.blocking.length}):`);
        printList(gate.blocking);
    }

    if (gate.warnings.length > 0) {
        console.log(`\nNon-blocking warnings (${gate.warnings.length}):`);
        printList(gate.warnings);
    }

    if (comparison.knownViolations.length > 0 && config.gate.mode !== "strict") {
        console.log(
            `\nKnown debt, tolerated by the gate (${comparison.knownViolations.length}):`
        );
        printList(comparison.knownViolations);
    }

    if (comparison.fixedEntries.length > 0) {
        console.log(`\nFixed since the baseline (${comparison.fixedEntries.length}):`);
        printList(comparison.fixedEntries);
        console.log("Lock in these improvements with: npm run baseline");
    }

    if (
        gate.blocking.length === 0 &&
        gate.warnings.length === 0 &&
        comparison.knownViolations.length === 0
    ) {
        console.log("\nNo accessibility violations found.");
    }

    console.log(`\nAccessibility gate: ${gate.passed ? "PASSED" : "FAILED"}`);
}

function printList(
    violations: { severity: Violation["severity"]; rule: string; location: string; message: string }[]
): void {
    for (const violation of sortBySeverity(violations)) {
        const label = categorize(violation) === "legal-blocker" ? "legal blocker" : "UX warning";
        console.log(`  [${violation.severity} · ${label}] ${violation.rule} — ${violation.location}`);
        console.log(`      ${violation.message}`);
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
                    failOn: config.gate.failOn,
                    blockLegalViolations: config.gate.blockLegalViolations,
                    passed: gate.passed,
                },
                summary: {
                    total: comparison.newViolations.length + comparison.knownViolations.length,
                    new: comparison.newViolations.length,
                    knownDebt: comparison.knownViolations.length,
                    fixedSinceBaseline: comparison.fixedEntries.length,
                    bySeverity: countBySeverity([
                        ...comparison.newViolations,
                        ...comparison.knownViolations,
                    ]),
                },
                blocking: gate.blocking,
                warnings: gate.warnings,
                knownDebt: comparison.knownViolations,
                fixedSinceBaseline: comparison.fixedEntries,
                baselineHistory: comparison.baseline?.history ?? [],
            },
            null,
            2
        ) + "\n"
    );
}
