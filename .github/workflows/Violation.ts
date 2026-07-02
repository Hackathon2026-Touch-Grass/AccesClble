export type Severity = "critical" | "serious" | "moderate" | "minor";

export type Violation = {
    check: string;
    rule: string;
    severity: Severity;
    message: string;
    location: string;
    fingerprint: string;
};
