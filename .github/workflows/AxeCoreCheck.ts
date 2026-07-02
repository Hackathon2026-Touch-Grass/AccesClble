import { execFileSync } from "node:child_process";
import AccessibilityJsonReport from "./AccessibilityJsonReport.ts";
import { BaseClass } from "./BaseClass";

export default class AxeCoreCheck extends BaseClass {
    private readonly url: string;
    private readonly tags: string[];
    private readonly fixHints: Record<string, string> = {
        "button-name": "Add visible text, aria-label, or aria-labelledby so screen readers can announce the button.",
        "color-contrast": "Increase the contrast between foreground and background colors until it meets the required WCAG ratio.",
        "document-title": "Add a descriptive title element that explains the current page.",
        "html-has-lang": "Add a lang attribute to the html element, for example <html lang=\"en\"> or <html lang=\"nl\">.",
        "image-alt": "Add meaningful alt text that describes the image purpose. If the image is decorative, use alt=\"\".",
        "label": "Connect every form control to a visible label using for/id, aria-label, or aria-labelledby.",
        "link-name": "Add descriptive link text or an accessible label that explains where the link goes.",
        "region": "Place page content inside semantic landmarks such as header, nav, main, aside, or footer.",
    };

    constructor(
        url: string = "http://localhost:8888",
        tags: string[] = ["wcag2a", "wcag2aa", "wcag21aa"]
    ) {
        super();
        this.url = url;
        this.tags = tags;
    }

    public check(): boolean {
        console.log("\nTest: axe-core (WCAG)");

        const tagsArg = this.tags.join(",");

        try {
            const output = execFileSync(
                "npx",
                ["axe", this.url, "--tags", tagsArg, "--stdout"],
                {
                    encoding: "utf8",
                    maxBuffer: 1024 * 1024 * 20,
                    stdio: ["ignore", "pipe", "ignore"],
                }
            );

            const results = JSON.parse(output);
            const report = AccessibilityJsonReport.axeCore(results, this.fixHints);
            const passed = (results.violations ?? []).length === 0;

            console.log(`Result: ${passed ? "Passed" : "Failed"}`);
            AccessibilityJsonReport.print(report);

            return passed;
        } catch {
            console.log("Result: Failed");
            AccessibilityJsonReport.print(
                AccessibilityJsonReport.axeCoreError(
                    this.url,
                    "Could not run axe-core or parse axe-core JSON output. Make sure the site is running before this check starts."
                )
            );
            return false;
        }
    }
}
