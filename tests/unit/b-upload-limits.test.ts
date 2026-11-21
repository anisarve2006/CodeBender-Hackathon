import { describe, it, expect } from 'vitest';
import { validateUploadSize, MAX_UPLOAD_BYTES } from '../../lib/utils/blob';

describe('validateUploadSize', () => {
  it('accepts a file of exactly 10 MB', () => {
    expect(validateUploadSize(10 * 1024 * 1024)).toBe(true);
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it('rejects a file one byte over 10 MB', () => {
    expect(validateUploadSize(10 * 1024 * 1024 + 1)).toBe(false);
  });

  it('rejects empty and non-integer sizes', () => {
    expect(validateUploadSize(0)).toBe(false);
    expect(validateUploadSize(1.5)).toBe(false);
  });
});
