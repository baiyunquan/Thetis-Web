export const PINNED_CODE_COMMIT: string;
export function fingerprint(input: unknown): string;
export function assertPinnedCodeCheckout(code?: string, expected?: string): string;
export function describeCodeCache(): {
  commit: string; node: string; pnpm: string; flags: string[]; locks: string[]; fingerprint: string;
};
export function codeCacheMatches(): boolean;
