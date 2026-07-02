import { existsSync, readFileSync } from "node:fs";
import type { GateConfig, GateMode } from "./Gate.ts";
import { isSeverity } from "./Severity.ts";

export type A11yConfig = {
    gate: GateConfig;
    baselineFile: string;
    checks: {
        altText: { enabled: boolean };
        axeCore: {
            enabled: boolean;
            urls: string[];
            tags: string[];
            chromedriverPath: string | null;
        };
        phpstan: { enabled: boolean };
    };
};

export const DEFAULT_CONFIG: A11yConfig = {
    gate: {
        mode: "ratchet",
        failOn: "serious",
        blockLegalViolations: true,
    },
    baselineFile: ".a11y-baseline.json",
    checks: {
        altText: { enabled: true },
        axeCore: {
            enabled: true,
            urls: ["http://localhost:8888"],
            tags: ["wcag2a", "wcag2aa", "wcag21aa"],
            chromedriverPath: null,
        },
        phpstan: { enabled: true },
    },
};

const GATE_MODES: GateMode[] = ["strict", "ratchet", "report"];

export function loadConfig(file = "a11y.config.json"): A11yConfig {
    if (!existsSync(file)) {
        return DEFAULT_CONFIG;
    }

    const raw = JSON.parse(readFileSync(file, "utf8"));

    const config: A11yConfig = {
        gate: { ...DEFAULT_CONFIG.gate, ...raw.gate },
        baselineFile: raw.baselineFile ?? DEFAULT_CONFIG.baselineFile,
        checks: {
            altText: { ...DEFAULT_CONFIG.checks.altText, ...raw.checks?.altText },
            axeCore: { ...DEFAULT_CONFIG.checks.axeCore, ...raw.checks?.axeCore },
            phpstan: { ...DEFAULT_CONFIG.checks.phpstan, ...raw.checks?.phpstan },
        },
    };

    if (!GATE_MODES.includes(config.gate.mode)) {
        throw new Error(
            `Invalid gate.mode "${config.gate.mode}" in ${file}. Use one of: ${GATE_MODES.join(", ")}`
        );
    }

    if (!isSeverity(config.gate.failOn)) {
        throw new Error(
            `Invalid gate.failOn "${config.gate.failOn}" in ${file}. Use one of: critical, serious, moderate, minor`
        );
    }

    return config;
}
