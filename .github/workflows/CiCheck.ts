import process from "node:process";
import AltTextCheck from "./AltTextCheck.ts";
import PhpstanCheck from "./PhpstanCheck.ts";
import AxeCoreCheck from "./AxeCoreCheck.ts";
import GitDiffCheck from "./GitDiffCheck.ts";

const errors: string[] = [];

const checks = [
    { name: "PHPStan", check: new PhpstanCheck() },
    { name: "Alt Text", check: new AltTextCheck() },
    { name: "Axe-core (WCAG)", check: new AxeCoreCheck() },
];

const reports = [
    { name: "Accessibility Diff", report: new GitDiffCheck(false) },
];

for (const ciCheck of checks) {
    if (!ciCheck.check.check()) {
        errors.push(ciCheck.name);
    }
}

for (const ciReport of reports) {
    ciReport.report.check();
}

if (errors.length > 0) {
    console.log(`\nCI failed. Failed tests: ${errors.join(", ")}.`);
    process.exit(1);
}

console.log("\nCI passed. All tests passed.");
process.exit(0);
