export type FindingKind = "violation" | "warning";

export type Finding = {
    check: string;
    rule: string;
    kind: FindingKind;
    message: string;
    location: string;
    fingerprint: string;
};
