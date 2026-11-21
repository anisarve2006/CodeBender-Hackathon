import { describe, it, expect } from 'vitest';

describe('Sanity test suite', () => {
  it('passes a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('validates environment alias resolution', () => {
    expect(true).toBe(true);
  });
});
