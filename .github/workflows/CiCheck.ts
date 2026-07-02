import process from "node:process";
import AltTextCheck from "./AltTextCheck.ts";
import PhpstanCheck from "./PhpstanCheck.ts";
import AxeCoreCheck from "./AxeCoreCheck.ts";

const errors: string[] = [];

const checks = [
    { name: "PHPStan", check: new PhpstanCheck() },
    { name: "Alt Text", check: new AltTextCheck() },
    { name: "Axe-core (WCAG)", check: new AxeCoreCheck() },
];

for (const ciCheck of checks) {
    if (!ciCheck.check.check()) {
        errors.push(ciCheck.name);
    }
}

if (errors.length > 0) {
    console.log(`\nCI failed. Failed tests: ${errors.join(", ")}.`);
    process.exit(1);
}

console.log("\nCI passed. All tests passed.");
process.exit(0);
