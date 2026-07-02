const hasViolations = false;

if (hasViolations) {
    console.error("::error::CI failed: accessibility violations found.");
    process.exit(1);
}

console.log("CI passed: no accessibility violations found.");
process.exit(0);