import {execSync} from "node:child_process";

export abstract class BaseClass {
    protected runCommand(name: string, command: string): boolean {
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
}