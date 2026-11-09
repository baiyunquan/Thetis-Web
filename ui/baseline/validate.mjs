import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const inventoryUrl = new URL('../../docs/superpowers/specs/2026-11-08-code-oss-ui-source-inventory.md', import.meta.url);
const expectedCounts = Object.freeze({ Form: 56, UserControl: 16, SetupTabPage: 89 });
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Parse the checked-in discovery document independently of ledger IDs/counts. */
export function inventoryCandidates(text) {
  let kind;
  const result = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('## Form candidates')) kind = 'Form';
    else if (line.startsWith('## UserControl candidates')) kind = 'UserControl';
    else if (line.startsWith('## Setup TabPage candidates')) kind = 'SetupTabPage';
    else if (line.startsWith('## ')) kind = undefined;
    if (!kind || !line.startsWith('| ')) continue;
    const columns = line.split('|').slice(1, -1).map(column => column.trim());
    const declaration = /<D:\/workspace\/Thetis\/(.+?):(\d+)>/.exec(line);
    if (!declaration) continue;
    result.push({ id: `${kind}:${columns[0]}`, kind, name: columns[0], path: declaration[1], line: Number(declaration[2]) });
  }
  return result;
}

/** Return actionable validation errors. This checks traceability, never grants parity. */
export function validateBaseline(ledger, options = {}) {
  const errors = [];
  const verifyFiles = options.verifyFiles !== false;
  const inventory = inventoryCandidates(options.inventoryText ?? readFileSync(inventoryUrl, 'utf8'));
  for (const [kind, expected] of Object.entries(expectedCounts)) {
    if (inventory.filter(row => row.kind === kind).length !== expected) errors.push(`inventory counts: expected ${expected} ${kind} declarations; review a changed inventory explicitly`);
  }
  if (!ledger || typeof ledger !== 'object' || !Array.isArray(ledger.candidates) || !Array.isArray(ledger.behaviors)) return [...errors, 'ledger requires candidates and behaviors arrays'];
  if (ledger.schemaVersion !== 1) errors.push('unsupported schemaVersion');
  const sourceCache = new Map();
  function checkRef(ref, context, symbolRequired = false) {
    if (!ref || !nonempty(ref.path) || isAbsolute(ref.path)) { errors.push(`${context}: relative source/evidence path required`); return; }
    const absolute = resolve(root, ref.path);
    const withinRoot = relative(root, absolute);
    if (withinRoot.startsWith('..') || isAbsolute(withinRoot)) { errors.push(`${context}: path escapes repository`); return; }
    if (!nonempty(ref.href) || !ref.href.startsWith('file:///')) errors.push(`${context}: clickable file href required`);
    if (!verifyFiles) return;
    if (!existsSync(absolute)) { errors.push(`${context}: missing file ${ref.path}`); return; }
    if (ref.line !== undefined) {
      if (!Number.isInteger(ref.line) || ref.line < 1) { errors.push(`${context}: positive source line required`); return; }
      if (!sourceCache.has(absolute)) sourceCache.set(absolute, readFileSync(absolute, 'utf8').split(/\r?\n/));
      const lines = sourceCache.get(absolute);
      if (ref.line > lines.length) errors.push(`${context}: source line outside file`);
      if (ref.symbol && !new RegExp(`\\b${escape(ref.symbol)}\\b`).test(lines.slice(Math.max(0, ref.line - 2), ref.line + 2).join('\n'))) errors.push(`${context}: symbol not found near line: ${ref.symbol}`);
    }
    if (symbolRequired && (!nonempty(ref.symbol) || !Number.isInteger(ref.line))) errors.push(`${context}: handler symbol and source line required`);
    if (ref.page !== undefined && (!Number.isInteger(ref.page) || ref.page < 1 || ref.page > 130)) errors.push(`${context}: valid manual page required`);
  }
  function shared(row, context) {
    if (!/^Stage(?:0[1-9]|10)$/.test(row.ownerStage ?? '')) errors.push(`${context}: ownerStage is required (Stage01..Stage10)`);
    if (!nonempty(row.targetSurface) || !row.targetSurface.startsWith('thetis.')) errors.push(`${context}: targetSurface is required`);
    if (!nonempty(row.sourceClass)) errors.push(`${context}: sourceClass required`);
    if (!Array.isArray(row.sourceRefs) || row.sourceRefs.length === 0) errors.push(`${context}: sourceRefs are required`);
    else row.sourceRefs.forEach(ref => checkRef(ref, `${context} sourceRefs`));
    if (!Array.isArray(row.handlerRefs)) errors.push(`${context}: handlerRefs array required`);
    else row.handlerRefs.forEach(ref => checkRef(ref, `${context} handlerRefs`, true));
    if (!Array.isArray(row.manualRefs) || row.manualRefs.length === 0) errors.push(`${context}: manualRefs with explicit contextual/historical scope required`);
    else row.manualRefs.forEach(ref => { checkRef(ref, `${context} manualRefs`); if (ref.kind !== 'historical-manual') errors.push(`${context}: manual references must be historical-manual`); });
    if (!Array.isArray(row.screenshotRefs)) errors.push(`${context}: screenshotRefs array required`);
    else row.screenshotRefs.forEach(ref => { checkRef(ref, `${context} screenshotRefs`); if (ref.sourcePdf && ref.kind !== 'historical-manual') errors.push(`${context}: PDF screenshot must remain historical-manual`); });
    for (const field of ['evidenceStatus', 'reachability']) if (!nonempty(row[field])) errors.push(`${context}: ${field} required`);
    if (!Array.isArray(row.capabilities) || row.capabilities.length === 0) errors.push(`${context}: capabilities required`);
    if (!row.qualification || ['windowsLiveCapture', 'codeParity', 'hardware'].some(key => row.qualification[key] !== 'unqualified')) errors.push(`${context}: this static baseline cannot claim live/hardware parity`);
  }
  const expectedIds = new Map(inventory.map(row => [row.id, row]));
  const actualIds = new Set();
  for (const row of ledger.candidates) {
    const context = row?.id ?? '(missing candidate id)';
    if (!row || typeof row !== 'object') { errors.push('invalid candidate'); continue; }
    if (actualIds.has(row.id)) errors.push(`duplicate candidate: ${context}`);
    actualIds.add(row.id);
    const expected = expectedIds.get(row.id);
    if (!expected) errors.push(`unknown inventory candidate: ${context}`);
    else {
      if (row.kind !== expected.kind || row.name !== expected.name) errors.push(`${context}: candidate identity mismatch`);
      if (!row.sourceRefs?.some(ref => ref.path === expected.path && ref.line === expected.line && ref.symbol === expected.name)) errors.push(`${context}: sourceRefs must retain inventory declaration`);
    }
    shared(row, context);
  }
  for (const id of expectedIds.keys()) if (!actualIds.has(id)) errors.push(`missing inventory candidate: ${id}`);
  for (const [kind, expected] of Object.entries(expectedCounts)) {
    if (ledger.candidates.filter(row => row.kind === kind).length !== expected || ledger.counts?.[kind] !== expected) errors.push(`ledger counts: ${kind} must equal independent inventory count ${expected}`);
  }
  const behaviorIds = new Set();
  const consoleDesigner = verifyFiles ? readFileSync(resolve(root, 'Project Files/Source/Console/console.Designer.cs'), 'utf8') : '';
  for (const row of ledger.behaviors) {
    const context = row?.id ?? '(missing behavior id)';
    if (!row || typeof row !== 'object') { errors.push('invalid behavior'); continue; }
    if (behaviorIds.has(row.id)) errors.push(`duplicate behavior: ${context}`);
    behaviorIds.add(row.id);
    shared(row, context);
    if (!actualIds.has(row.candidateId)) errors.push(`${context}: candidateId must resolve`);
    if (!Array.isArray(row.controls) || row.controls.length === 0) errors.push(`${context}: controls required`);
    else if (verifyFiles && row.sourceClass === 'Console') for (const control of row.controls) {
      if (typeof control !== 'string' || !new RegExp(`\\b${escape(control)}\\b`).test(consoleDesigner)) errors.push(`${context}: unknown Console control ${control}`);
    }
    if (row.authority !== 'current-handler') errors.push(`${context}: current-handler authority is required; historical images cannot override it`);
    if (!Array.isArray(row.handlerRefs) || row.handlerRefs.length === 0) errors.push(`${context}: current handler required`);
    for (const field of ['initialState', 'action', 'expectedResult', 'units', 'rangeValidation', 'persistence', 'externalMapping', 'plannedTest']) if (!nonempty(row[field])) errors.push(`${context}: ${field} required`);
    if (row.numericalTolerance !== null || row.timingToleranceMs !== null) errors.push(`${context}: unmeasured tolerances must remain null`);
  }
  for (const prefix of ['console.vfo', 'console.plot', 'console.gain', 'console.receiver', 'console.lower', 'console.rx2']) if (![...behaviorIds].some(id => id.startsWith(prefix))) errors.push(`missing detailed Console family: ${prefix}`);
  return errors;
}

export const defaultLedger = JSON.parse(readFileSync(new URL('./ledger.json', import.meta.url), 'utf8'));
export default defaultLedger;
