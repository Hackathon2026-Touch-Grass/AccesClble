import { execSync } from "node:child_process";
import process from "node:process";
import PhpstanCheck from "./PhpstanCheck.ts";
import AxeCoreCheck from "./AxeCoreCheck.ts";

const errors: string[] = [];

const phpStan = new PhpstanCheck();

if (!phpStan.check()) {
    errors.push("PHPStan");
}

const axeCore = new AxeCoreCheck();

if (!axeCore.check()) {
    errors.push("axe-core (WCAG)");
}

// Final GitHub result
if (errors.length > 0) {
    console.error(`\n::error title=CI failed::${errors.length} check(s) failed: ${errors.join(", ")}.`);
    process.exit(1);
}

console.log("\nCI passed. No errors found.");
process.exit(0);