import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Finding } from "./Finding.ts";
import { fingerprint } from "./Baseline.ts";

export default class AltTextCheck {
    private readonly ignoredDirectories = new Set([
        ".git",
        ".idea",
        "node_modules",
        "vendor",
    ]);

    private readonly checkedExtensions = new Set([
        ".html",
        ".php",
        ".twig",
    ]);

    public collect(): Finding[] {
        return this.findMissingAltTexts(process.cwd());
    }

    private findMissingAltTexts(directory: string): Finding[] {
        if (!existsSync(directory)) {
            return [];
        }

        return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                if (this.ignoredDirectories.has(entry.name)) {
                    return [];
                }

                return this.findMissingAltTexts(fullPath);
            }

            if (!entry.isFile() || !this.checkedExtensions.has(path.extname(entry.name))) {
                return [];
            }

            return this.findMissingAltTextsInFile(fullPath);
        });
    }

    private findMissingAltTextsInFile(file: string): Finding[] {
        const contents = readFileSync(file, "utf8");
        const imageTagPattern = /<img\b[^>]*>/gi;
        const altAttributePattern = /\salt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
        const findings: Finding[] = [];
        const occurrences = new Map<string, number>();
        let match: RegExpExecArray | null;

        while ((match = imageTagPattern.exec(contents)) !== null) {
            const tag = match[0].replace(/\s+/g, " ");

            if (altAttributePattern.test(tag)) {
                continue;
            }

            const relativePath = this.getRelativePath(file);
            // Fingerprint on the tag itself rather than the line number, so
            // unrelated edits that shift lines do not turn old debt into "new".
            const occurrence = occurrences.get(tag) ?? 0;
            occurrences.set(tag, occurrence + 1);

            findings.push({
                check: "alt-text",
                rule: "image-alt",
                kind: "violation",
                message: `Image is missing an alt attribute: ${tag}`,
                location: `${relativePath}:${this.getLineNumber(contents, match.index)}`,
                fingerprint: fingerprint("alt-text", "image-alt", relativePath, tag, occurrence),
            });
        }

        return findings;
    }

    private getRelativePath(file: string): string {
        return path.relative(process.cwd(), file).split(path.sep).join("/");
    }

    private getLineNumber(contents: string, index: number): number {
        return contents.slice(0, index).split(/\r?\n/).length;
    }
}
