import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

type ChangedFile = {
    path: string;
    status: string;
    additions: string;
    deletions: string;
};

export default class GitDiffCheck {
    constructor(
        private readonly showFullOutput: boolean = false,
        private readonly baseCommit: string | null = null
    ) {
    }

    public check(): boolean {
        console.log("\nReport: Accessibility Diff");

        const baseCommit = this.getBaseCommit();

        if (baseCommit === null) {
            console.log("Result: Skipped");
            console.log("No base commit found to compare against.");
            return true;
        }

        const changedFiles = this.getChangedFiles(baseCommit);
        const fullDiff = this.getFullDiff(baseCommit);

        console.log("Result: Passed");
        console.log(`Compared commits: ${baseCommit} -> HEAD`);

        if (changedFiles.length === 0) {
            console.log("No changed files found.");
            return true;
        }

        console.log("Changed files:");

        for (const changedFile of changedFiles) {
            console.log(
                `- ${changedFile.status} ${changedFile.path} ` +
                `(+${changedFile.additions}, -${changedFile.deletions})`
            );
        }

        if (this.showFullOutput) {
            console.log("\nFull code diff:");
            console.log(fullDiff);
        } else {
            console.log("\nFull code diff is hidden. Set showFullOutput to true to print every + and - line.");
        }

        return true;
    }

    private getBaseCommit(): string | null {
        if (this.baseCommit !== null && this.isValidCommit(this.baseCommit)) {
            return this.baseCommit;
        }

        const environmentCommit = process.env.ACCESSIBILITY_DIFF_BASE_COMMIT;

        if (environmentCommit !== undefined && this.isValidCommit(environmentCommit)) {
            return environmentCommit;
        }

        if (this.isValidCommit("HEAD~1")) {
            return "HEAD~1";
        }

        const eventCommit = this.getGitHubEventBaseCommit();
        if (eventCommit !== null && this.isValidCommit(eventCommit)) {
            return eventCommit;
        }

        return null;
    }

    private getGitHubEventBaseCommit(): string | null {
        const eventPath = process.env.GITHUB_EVENT_PATH;

        if (eventPath === undefined || !existsSync(eventPath)) {
            return null;
        }

        const event = JSON.parse(readFileSync(eventPath, "utf8"));

        return event.pull_request?.base?.sha ?? event.before ?? null;
    }

    private getChangedFiles(baseCommit: string): ChangedFile[] {
        const statuses = this.git(["diff", baseCommit, "HEAD", "--name-status"])
            .split("\n")
            .filter(Boolean)
            .map((line) => {
                const [status, path] = line.split(/\t+/);

                return { path, status };
            });

        const statsByPath = new Map(
            this.git(["diff", baseCommit, "HEAD", "--numstat"])
                .split("\n")
                .filter(Boolean)
                .map((line) => {
                    const [additions, deletions, path] = line.split(/\t+/);

                    return [path, { additions, deletions }];
                })
        );

        return statuses.map((file) => {
            const stats = statsByPath.get(file.path) ?? { additions: "0", deletions: "0" };

            return {
                path: file.path,
                status: this.getReadableStatus(file.status),
                additions: stats.additions,
                deletions: stats.deletions,
            };
        });
    }

    private getFullDiff(baseCommit: string): string {
        return this.git(["diff", baseCommit, "HEAD"]);
    }

    private isValidCommit(commit: string): boolean {
        try {
            this.git(["rev-parse", "--verify", commit]);
            return true;
        } catch {
            return false;
        }
    }

    private getReadableStatus(status: string): string {
        if (status.startsWith("R")) {
            return "Renamed";
        }

        const statuses: Record<string, string> = {
            A: "Added",
            C: "Copied",
            D: "Deleted",
            M: "Modified",
            T: "Type changed",
            U: "Unmerged",
            X: "Unknown",
        };

        return statuses[status] ?? status;
    }

    private git(args: string[]): string {
        return execFileSync("git", args, {
            encoding: "utf8",
            maxBuffer: 1024 * 1024 * 20,
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    }
}
