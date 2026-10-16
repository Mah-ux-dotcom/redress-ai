// ============================================================================
// REDRESS × Apertus — runtime configuration
//
// VITE_APERTUS_MODE:
//   'mock'    (default) in-browser stand-in model, clearly labelled in the UI.
//             Nothing leaves the browser.
//   'apertus' calls the REDRESS server proxy (/api/apertus/chat), which holds
//             the API key and forwards to the configured Apertus endpoint.
//             If the call fails, REDRESS falls back to its rule-based output.
//   'off'     no language model at all — rule-based REDRESS only.
// ============================================================================

export type ApertusMode = 'mock' | 'apertus' | 'off';

function readMode(): ApertusMode {
  const raw = (import.meta.env?.VITE_APERTUS_MODE ?? 'mock').toString().toLowerCase();
  return raw === 'apertus' || raw === 'off' ? raw : 'mock';
}

export const APERTUS_CONFIG = {
  mode: readMode(),
  /** Same-origin proxy path; the API key never reaches the browser. */
  proxyPath: (import.meta.env?.VITE_APERTUS_PROXY_PATH ?? '/api/apertus').toString(),
  /** Mock only: include deliberately unsupported sentences to demonstrate Receipts. */
  mockDemonstrateBlocking: (import.meta.env?.VITE_APERTUS_MOCK_HALLUCINATE ?? 'true').toString() !== 'false',
  timeoutMs: Number(import.meta.env?.VITE_APERTUS_TIMEOUT_MS ?? 60000),
};
