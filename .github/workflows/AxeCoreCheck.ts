import { BaseClass } from "./BaseClass";

export default class AxeCoreCheck extends BaseClass {
    private readonly url: string;
    private readonly tags: string[];

    constructor(
        url: string = "http://localhost:8888",
        tags: string[] = ["wcag2a", "wcag2aa", "wcag21aa"]
    ) {
        super();
        this.url = url;
        this.tags = tags;
    }

    public check(): boolean {
        const tagsArg = this.tags.join(",");

        return this.runCommand(
            "axe-core (WCAG)",
            `npx axe ${this.url} --tags ${tagsArg} --exit`,
            false
        );
    }
}
