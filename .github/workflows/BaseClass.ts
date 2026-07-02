import {execSync} from "node:child_process";

export abstract class BaseClass {
    protected runCommand(name: string, command: string, showCommandOutput = true): boolean {
        console.log(`\nTest: ${name}`);

        try {
            execSync(command, {
                stdio: showCommandOutput ? "inherit" : "ignore",
                shell: true,
            });

            console.log("Result: Passed");
            return true;
        } catch {
            console.log("Result: Failed");
            return false;
        }
    }
}
