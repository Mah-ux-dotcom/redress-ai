/** Thrown when the language model cannot be used; callers fall back to rule-based output. */
export class ApertusUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApertusUnavailableError';
  }
}
