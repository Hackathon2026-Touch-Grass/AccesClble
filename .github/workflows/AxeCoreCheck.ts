import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Finding } from "./Finding.ts";
import { fingerprint } from "./Baseline.ts";
import { classify } from "./Classification.ts";

export class CheckExecutionError extends Error {
    constructor(checkName: string, detail: string) {
        super(`${checkName} could not run: ${detail}`);
        this.name = "CheckExecutionError";
    }
}

type AxeNode = { target: string[] | string };

type AxeViolation = {
    id: string;
    impact?: string | null;
    help: string;
    nodes: AxeNode[];
};

type AxePageResult = {
    url: string;
    violations?: AxeViolation[];
};

export default class AxeCoreCheck {
    constructor(
        private readonly urls: string[],
        private readonly tags: string[],
        private readonly chromedriverPath: string | null = null
    ) {}

    public collect(): Finding[] {
        return this.parse(this.runAxe());
    }

    private runAxe(): AxePageResult[] {
        const driverOverride =
            process.env.A11Y_CHROMEDRIVER_PATH ?? this.chromedriverPath ?? undefined;

        try {
            return this.runAxeWithDriver(driverOverride);
        } catch (error) {
            // The chromedriver bundled with @axe-core/cli tracks the newest
            // Chrome; fall back to a locally pinned chromedriver when the
            // installed Chrome is older.
            const fallback = this.localChromedriverPath();

            if (this.isDriverMismatch(error) && fallback !== null && fallback !== driverOverride) {
                return this.runAxeWithDriver(fallback);
            }

            throw new CheckExecutionError("axe-core", this.describe(error));
        }
    }

    private runAxeWithDriver(driverPath: string | undefined): AxePageResult[] {
        const parts = [
            "npx",
            "axe",
            ...this.urls.map((url) => `"${url}"`),
            "--tags",
            this.tags.join(","),
            "--stdout",
        ];

        if (driverPath !== undefined) {
            parts.push("--chromedriver-path", `"${driverPath}"`);
        }

        // execSync always runs the command through a shell.
        const stdout = execSync(parts.join(" "), {
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf8",
            maxBuffer: 64 * 1024 * 1024,
        });

        return JSON.parse(stdout) as AxePageResult[];
    }

    private parse(pages: AxePageResult[]): Finding[] {
        const findings: Finding[] = [];
        const occurrences = new Map<string, number>();

        for (const page of pages) {
            const pagePath = this.pathOf(page.url);

            for (const axeViolation of page.violations ?? []) {
                const kind = classify(axeViolation.id, axeViolation.impact);

                for (const node of axeViolation.nodes) {
                    const target = Array.isArray(node.target)
                        ? node.target.join(" ")
                        : String(node.target);

                    // Fingerprint on path + selector (not the full URL), so the
                    // same page audited on another host or port still matches.
                    const key = `${axeViolation.id}|${pagePath}|${target}`;
                    const occurrence = occurrences.get(key) ?? 0;
                    occurrences.set(key, occurrence + 1);

                    findings.push({
                        check: "axe-core",
                        rule: axeViolation.id,
                        kind,
                        message: axeViolation.help,
                        location: `${page.url} → ${target}`,
                        fingerprint: fingerprint("axe-core", axeViolation.id, pagePath, target, occurrence),
                    });
                }
            }
        }

        return findings;
    }

    private pathOf(url: string): string {
        try {
            return new URL(url).pathname;
        } catch {
            return url;
        }
    }

    private localChromedriverPath(): string | null {
        const binary = process.platform === "win32" ? "chromedriver.exe" : "chromedriver";
        const driverPath = path.join(
            process.cwd(),
            "node_modules",
            "chromedriver",
            "lib",
            "chromedriver",
            binary
        );

        return existsSync(driverPath) ? driverPath : null;
    }

    private isDriverMismatch(error: unknown): boolean {
        return this.describe(error).includes("This version of ChromeDriver only supports");
    }

    private describe(error: unknown): string {
        const parts: string[] = [];

        if (error instanceof Error) {
            parts.push(error.message);
        }

        const stderr = (error as { stderr?: unknown }).stderr;

        if (typeof stderr === "string" && stderr.trim() !== "") {
            parts.push(stderr.trim());
        }

        return parts.join("\n") || String(error);
    }
}
