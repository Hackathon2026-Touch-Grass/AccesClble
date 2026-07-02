import { execSync } from "node:child_process";
import process from "node:process";
import PhpstanCheck from "./PhpstanCheck.ts";

const errors: string[] = [];

const phpStan = new PhpstanCheck();

if (!phpStan.check()) {
    errors.push("PHPStan");
}

// Final GitHub result
if (errors.length > 0) {
    console.error(`\n::error title=CI failed::${errors.length} check(s) failed: ${errors.join(", ")}.`);
    process.exit(1);
}
else {
    //continue with other checks
}

console.log("\nCI passed. No errors found.");
process.exit(0);