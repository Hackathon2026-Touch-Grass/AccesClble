import {execSync} from "node:child_process";

export abstract class BaseClass {
    protected runCommand(name: string, command: string, showCommandOutput = true): boolean {
        console.log(`\nTest: ${name}`);

        try {
            // execSync always runs the command through a shell.
            execSync(command, {
                stdio: showCommandOutput ? "inherit" : "ignore",
            });

            console.log("Result: Passed");
            return true;
        } catch {
            console.log("Result: Failed");
            return false;
        }
    }
}
