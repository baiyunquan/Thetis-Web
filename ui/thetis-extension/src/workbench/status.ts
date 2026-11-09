import type { EchoStatus } from '../diagnostics';
export function foundationStatus(receiver: 'rx1' | 'rx2', diagnostic: EchoStatus) {
  const connected = diagnostic.phase === 'connected' || diagnostic.phase === 'replied';
  return {
    connection: `Host: ${connected ? 'connected' : 'unverified'} / Echo: ${diagnostic.phase}`,
    receiver: `${receiver.toUpperCase()} controls / Radio unavailable`,
    detail: diagnostic.detail
  };
}
