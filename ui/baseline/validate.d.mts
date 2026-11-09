export interface SourceReference {
  path: string;
  line?: number;
  href: string;
  symbol?: string;
  kind?: string;
  page?: number;
  sourcePdf?: string;
  [key: string]: unknown;
}
export interface Candidate {
  id: string;
  kind: 'Form' | 'UserControl' | 'SetupTabPage';
  name: string;
  ownerStage: string;
  targetSurface: string;
  sourceRefs: SourceReference[];
  handlerRefs: SourceReference[];
  manualRefs: SourceReference[];
  screenshotRefs: SourceReference[];
  [key: string]: unknown;
}
export interface Behavior {
  id: string;
  candidateId: string;
  authority: string;
  handlerRefs: SourceReference[];
  screenshotRefs: SourceReference[];
  timingToleranceMs: number | null;
  [key: string]: unknown;
}
export interface BaselineLedger {
  schemaVersion: number;
  counts: Record<Candidate['kind'], number>;
  candidates: Candidate[];
  behaviors: Behavior[];
  [key: string]: unknown;
}
export function inventoryCandidates(text: string): Array<{ id: string; kind: Candidate['kind']; name: string; path: string; line: number }>;
export function validateBaseline(ledger: unknown, options?: { inventoryText?: string; verifyFiles?: boolean }): string[];
export const defaultLedger: BaselineLedger;
export default defaultLedger;
