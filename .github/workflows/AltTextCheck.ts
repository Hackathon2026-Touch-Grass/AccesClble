import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

type MissingAltText = {
    file: string;
    line: number;
    tag: string;
};

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

    public check(): boolean {
        console.log("\nTest: Alt Text");

        const missingAltTexts = this.findMissingAltTexts(process.cwd());

        if (missingAltTexts.length === 0) {
            console.log("Result: Passed");
            return true;
        }

        console.log("Result: Failed");
        console.log("Images missing alt text:");

        for (const missingAltText of missingAltTexts) {
            console.log(
                `- ${missingAltText.file}:${missingAltText.line} ${missingAltText.tag}`
            );
        }

        return false;
    }

    private findMissingAltTexts(directory: string): MissingAltText[] {
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

    private findMissingAltTextsInFile(file: string): MissingAltText[] {
        const contents = readFileSync(file, "utf8");
        const imageTagPattern = /<img\b[^>]*>/gi;
        const altAttributePattern = /\salt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
        const missingAltTexts: MissingAltText[] = [];
        let match: RegExpExecArray | null;

        while ((match = imageTagPattern.exec(contents)) !== null) {
            const tag = match[0];

            if (altAttributePattern.test(tag)) {
                continue;
            }

            missingAltTexts.push({
                file: this.getRelativePath(file),
                line: this.getLineNumber(contents, match.index),
                tag: tag.replace(/\s+/g, " "),
            });
        }

        return missingAltTexts;
    }

    private getRelativePath(file: string): string {
        return path.relative(process.cwd(), file).split(path.sep).join("/");
    }

    private getLineNumber(contents: string, index: number): number {
        return contents.slice(0, index).split(/\r?\n/).length;
    }
}
