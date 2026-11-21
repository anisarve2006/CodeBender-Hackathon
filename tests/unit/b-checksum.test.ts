import { describe, it, expect } from 'vitest';
import { sha256Hex } from '../../lib/utils/blob';

describe('sha256Hex', () => {
  it('matches the known SHA-256 digest of "abc"', async () => {
    const bytes = new TextEncoder().encode('abc');
    expect(await sha256Hex(bytes)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('returns 64 lowercase hex characters', async () => {
    const digest = await sha256Hex(new Uint8Array([1, 2, 3]));
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
