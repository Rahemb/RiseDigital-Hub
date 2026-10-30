export const discoveryLabels = {
  PENDING: "Awaiting website discovery",
  VERIFIED: "Verified website",
  POSSIBLE: "Possible website — needs confirmation",
  NONE: "No verified website found",
  FAILED: "Check failed",
} as const;
export type DiscoveryStatus = keyof typeof discoveryLabels;
export type WebsiteCandidate = {
  url: string;
  source: string;
  sourceUrl: string;
  exactOrganization: boolean;
  status: "UNTESTED" | "VERIFIED" | "POSSIBLE" | "FAILED";
  evidence: string[];
  resolvedUrl?: string;
  checkedAt?: string;
};
export type SourceCheck = {
  source: string;
  status: "OK" | "FAILED" | "SKIPPED";
  message: string;
  url: string;
};
export type DiscoveryResult = {
  status: DiscoveryStatus;
  candidates: WebsiteCandidate[];
  sources: SourceCheck[];
  explanation: string;
  selectedUrl: string;
  officialName: string;
};
