import { execSync } from "node:child_process";
import process from "node:process";
import PhpstanCheck from "./PhpstanCheck.ts";

let hasErrors = false;


const phpStan = new PhpstanCheck();

hasErrors = !phpStan.check();

// Final GitHub result
if (hasErrors) {
    console.error("\n::error title=CI failed::One or more checks failed.");
    process.exit(1);
}

console.log("\nCI passed. No errors found.");
process.exit(0);