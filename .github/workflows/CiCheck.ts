import { execSync } from "node:child_process";

function runCommand(name: string, command: string): boolean {
    console.log(`\n::group::${name}`);

    try {
        execSync(command, {
            stdio: "inherit",
            shell: true,
        });

        console.log(`${name} passed`);
        console.log("::endgroup::");
        return true;
    } catch {
        console.log("::endgroup::");
        console.error(`::error title=${name} failed::${name} found errors.`);
        return false;
    }
}

let hasErrors = false;

// Run PHPStan
const phpStanPassed = runCommand(
    "PHPStan",
    "php vendor/bin/phpstan analyse src tests --level=5"
);

if (!phpStanPassed) {
    hasErrors = true;
}

// Add your accessibility check here
console.log("\n::group::Accessibility Check");

const hasAccessibilityViolations = false; // replace with your real accessibility logic

if (hasAccessibilityViolations) {
    console.error("::error title=Accessibility failed::Accessibility violations found.");
    hasErrors = true;
} else {
    console.log("Accessibility check passed");
}

console.log("::endgroup::");

// Final GitHub result
if (hasErrors) {
    console.error("\n::error title=CI failed::One or more checks failed.");
    process.exit(1);
}

console.log("\nCI passed. No errors found.");
process.exit(0);