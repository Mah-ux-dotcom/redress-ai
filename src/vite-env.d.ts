/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "false" to answer unrecognised Explain questions with the fixed fallback instead of Apertus. */
  readonly VITE_APERTUS_ENABLED?: string;
}
